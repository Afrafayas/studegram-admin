import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const rowViewProps = (open) => ({
  tabIndex: 0,
  onClick: event => { if (!event.target.closest('button,a,input,select,textarea,[data-row-actions]')) open(); },
  onKeyDown: event => { if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); open(); } },
});

export default function RowActions({ children, label = 'Row actions' }) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();
  const close = () => setPosition(null);
  const hasText = nodes => React.Children.toArray(nodes).some(node => typeof node === 'string' ? !!node.trim() : typeof node === 'number' || React.isValidElement(node) && hasText(node.props.children));
  const menuChildren = nodes => React.Children.map(nodes, node => {
    if (!React.isValidElement(node)) return node;
    const actionable = typeof node.props.onClick === 'function' || node.type === 'a' && node.props.href;
    if (actionable) {
      const caption = node.props['aria-label'] || node.props.title;
      return React.cloneElement(node, { role: 'menuitem', onClick: event => { event.stopPropagation(); if (node.props.disabled) return; const result = node.props.onClick?.(event); close(); return result; } },
        <>{node.props.children}{!hasText(node.props.children) && typeof caption === 'string' && <span>{caption}</span>}</>);
    }
    return node.props.children ? React.cloneElement(node, {}, menuChildren(node.props.children)) : node;
  });
  useEffect(() => {
    if (!position) return;
    const outside = event => { if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(); };
    const key = event => { if (event.key === 'Escape') { event.stopPropagation(); close(); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    menu.current?.querySelector('button:not(:disabled),a[href]')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [Boolean(position)]);
  return <span data-row-actions onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <button ref={trigger} type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position ? id : undefined}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      onClick={event => { event.stopPropagation(); if (position) return close(); const rect = event.currentTarget.getBoundingClientRect(); setPosition({ top: Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 320)), left: Math.max(8, Math.min(rect.right - 240, window.innerWidth - 248)) }); }}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
    </button>
    {position && createPortal(<div ref={menu} id={id} role="menu" aria-label={label} data-row-actions style={{position:'fixed',...position,zIndex:10050,width:240,maxHeight:'min(300px, calc(100vh - 16px))'}}
      onClick={event => { event.stopPropagation(); if(event.target.closest("button,a")) close(); }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); close(); trigger.current?.focus(); } if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) { event.preventDefault(); const items=[...menu.current.querySelectorAll('button:not(:disabled),a[href]')]; const index=items.indexOf(document.activeElement); items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus(); } }}
      className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl [&_div]:!flex [&_div]:!flex-col [&_div]:!items-stretch [&_div]:!gap-1 [&_button]:!flex [&_button]:!w-full [&_button]:!h-auto [&_button]:!min-h-9 [&_button]:!justify-start [&_button]:!whitespace-normal [&_button]:!px-3 [&_button]:!py-2 [&_button]:!text-left [&_button]:!text-xs [&_button]:!rounded-lg [&_button]:!shadow-none">
      {menuChildren(children)}
    </div>, document.body)}
  </span>;
}
