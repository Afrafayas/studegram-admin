import { Children, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function textContent(children) {
  return Children.toArray(children).map(child => isValidElement(child) ? textContent(child.props.children) : child).join('');
}
function collectOptions(children, disabled = false) {
  const result = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const label = textContent(child.props.children);
      result.push({ value: String(child.props.value ?? label), label, disabled: disabled || child.props.disabled });
    } else result.push(...collectOptions(child.props.children, disabled || child.props.disabled));
  });
  return result;
}

// The native select retains form validation, option values and the original change event.
export default function SearchableSelect({ children, className, searchLabel = 'Search options', ...props }) {
  const nativeRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [localValue, setLocalValue] = useState(props.defaultValue);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({});
  const listId = useId();
  const options = collectOptions(children);
  const currentValue = props.value !== undefined ? props.value : localValue;
  const selected = options.find(option => option.value === String(currentValue ?? '')) || options.find(option => !option.disabled) || options[0];
  const matches = options.filter(option => !option.disabled && option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const expanded = open && !props.disabled;

  useEffect(() => {
    if (!expanded) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const popupWidth = Math.min(rect.width, Math.max(0, window.innerWidth - 16));
    setPosition({ position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8)), width: popupWidth,
      ...(below < 240 && rect.top > below ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      maxHeight: Math.max(120, Math.min(320, Math.max(below, rect.top) - 16)), zIndex: 10000 });
    const closeOutside = event => {
      if (!popupRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    const close = event => {
      if (event?.type === 'scroll' && popupRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [expanded]);

  function choose(option) {
    if (!option) return;
    const select = nativeRef.current;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    setOpen(false);
    triggerRef.current?.focus();
  }
  function show() { setQuery(''); setActive(0); setOpen(true); }

  return <>
    <select {...props} ref={nativeRef} className="sr-only" tabIndex={-1}
      onChange={event => {
        if (props.value === undefined) setLocalValue(event.target.value);
        props.onChange?.(event);
      }}
      onFocus={event => { props.onFocus?.(event); triggerRef.current?.focus(); }}
      aria-hidden="true" onInvalid={event => {
        props.onInvalid?.(event);
        event.preventDefault();
        triggerRef.current?.focus();
        show();
      }}>{children}</select>
    <input ref={triggerRef} type="text" role="combobox" disabled={props.disabled}
      className={(className || '') + ' min-w-0 max-w-full'} style={props.style} autoComplete="off"
      size={Math.min(28, Math.max(3, (selected?.label.length || 0) + 2))}
      aria-label={props['aria-label'] || searchLabel} aria-autocomplete="list"
      aria-required={props.required || undefined} aria-describedby={props['aria-describedby']}
      aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
      aria-activedescendant={expanded && matches[active] ? listId + '-' + active : undefined}
      value={expanded ? query : (selected?.label || '')}
      placeholder={expanded ? (selected?.label || searchLabel) : searchLabel}
      onFocus={show} onClick={() => { if (!expanded) show(); }}
      onBlur={() => setOpen(false)}
      onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if (event.key === 'Tab') setOpen(false);
        if (event.key === 'Enter' && expanded) { event.preventDefault(); choose(matches[active]); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!expanded) { show(); return; }
          const next = Math.max(0, Math.min(matches.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
          setActive(next);
          document.getElementById(listId + '-' + next)?.scrollIntoView({ block: 'nearest' });
        }
      }} />
    {expanded && createPortal(<div ref={popupRef} style={position} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl text-slate-900">
      <div id={listId} role="listbox" aria-label={searchLabel} className="mt-1 min-h-0 overflow-y-auto">
        {matches.map((option, index) => <button type="button" role="option" tabIndex={-1} key={option.value} id={listId + '-' + index}
          aria-selected={option.value === selected?.value} onMouseDown={event => event.preventDefault()}
          onClick={() => choose(option)} className={'block w-full break-words rounded-lg px-3 py-2 text-left text-xs hover:bg-amber-50 ' + (index === active ? 'bg-slate-100 ' : '') + (option.value === selected?.value ? 'font-bold text-amber-700' : '')}>
          {option.label}
        </button>)}
        {!matches.length && <p role="status" className="px-3 py-3 text-xs text-slate-500">No matching options</p>}
      </div>
    </div>, document.body)}
  </>;
}
