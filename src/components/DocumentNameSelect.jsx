import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { documentNamesForRole, parseDocumentNames, addCustomDocumentName } from '../utils/documentNames.mjs';
export default function DocumentNameSelect({ role = 'Student', value, onChange, disabled = false, id, multiple = true, label }) {
  const [internal, setInternal] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const current = value === undefined ? internal : value;
  const selected = multiple ? parseDocumentNames(current) : (current ? [current] : []);
  const options = [...new Set([...documentNamesForRole(role), ...selected])];
  const change = next => { if (value === undefined) setInternal(next); onChange?.(next); };
  const addCustom = () => {
    try {
      const existing = options.find(name => name.toLowerCase() === custom.trim().toLowerCase());
      change(addCustomDocumentName(current, existing || custom, multiple));
      setCustom(''); setError(''); setShowCustom(false);
    } catch (err) { setError(err.message); }
  };
  return <div className="space-y-2 text-left">
    <label className="block text-xs font-bold text-slate-600">
      {label || (role + (multiple ? ' document names' : ' document name'))}
      <SearchableSelect
        id={id}
        value={multiple ? '' : current}
        displayValue={multiple ? selected.join(', ') : undefined}
        placeholder={multiple ? 'Select document names' : 'Select document name'}
        hideEmptyOption={multiple}
        disabled={disabled}
        searchLabel={'Search ' + role.toLowerCase() + ' document names'}
        onChange={event => {
          const name = event.target.value;
          if (multiple) { if (name && !selected.includes(name)) change([...selected, name].join(', ')); }
          else change(name);
        }}
        className="mt-1 w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
      >
        <option value="">{multiple ? 'Select document names' : 'Use original filename'}</option>
        {options.map(name => <option key={name} value={name} disabled={multiple && selected.includes(name)}>{name}</option>)}
      </SearchableSelect>
    </label>
    {multiple && selected.length > 0 && <div className="flex flex-wrap gap-1">{selected.map(name => <button key={name} type="button" disabled={disabled} onClick={() => change(selected.filter(item => item !== name).join(', '))} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 disabled:opacity-50" aria-label={'Remove selected name ' + name}>{name} &times;</button>)}</div>}
    {!showCustom ? <button type="button" disabled={disabled} onClick={() => setShowCustom(true)} className="text-xs font-semibold text-amber-700 disabled:opacity-50">+ Add custom document name</button> : <div className="flex flex-wrap items-center gap-2">
      <input type="text" aria-label="Custom document name" value={custom} maxLength={200} disabled={disabled} onChange={event => { setCustom(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShowCustom(false); } }} placeholder="Custom document name" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs" />
      <button type="button" disabled={disabled || !custom.trim()} onClick={addCustom} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Add</button>
      <button type="button" disabled={disabled} onClick={() => { setShowCustom(false); setCustom(''); setError(''); }} className="text-xs text-slate-600">Cancel</button>
    </div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
