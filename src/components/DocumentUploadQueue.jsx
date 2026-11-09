import DocumentPreview from './DocumentPreview';
import { useState } from 'react';
import DocumentNameSelect from './DocumentNameSelect';
import { appendDocumentFiles } from '../utils/documentQueue.mjs';
export default function DocumentUploadQueue({ role = 'Student', entries, onChange, disabled = false }) {
  const [pendingNames, setPendingNames] = useState('');
  const [error, setError] = useState('');
  const add = files => {
    if (!files.length) return;
    try {
      const result = appendDocumentFiles(entries, files, pendingNames);
      onChange(result.entries); setPendingNames(result.remainingNames); setError('');
    } catch (err) { setError(err.message); }
  };
  return <div className="space-y-3">
    <DocumentNameSelect role={role} value={pendingNames} onChange={setPendingNames} disabled={disabled} label="Document names" />
    <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-xs font-semibold text-slate-700" onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (!disabled) add(Array.from(event.dataTransfer.files || [])); }}>
      {entries.length ? 'Add More Files from Another Folder' : 'Choose Files or Drop Them Here'}
      <input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" disabled={disabled} className="mt-2 block w-full text-xs" onChange={event => { add(Array.from(event.target.files || [])); event.target.value = ''; }} />
    </label>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {entries.length > 0 && <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-700 break-words">Queued documents ({entries.length}): {entries.map(entry => entry.name || entry.file.name).join(', ')}</p>
      {entries.map((entry, index) => <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <div className="flex items-start justify-between gap-3 text-xs"><span className="break-all">{index + 1}. {entry.file.name}</span><button type="button" disabled={disabled} className="shrink-0 font-bold text-red-700 disabled:opacity-50" aria-label={'Remove queued file ' + entry.file.name} onClick={() => onChange(entries.filter(item => item.id !== entry.id))}>Remove</button></div>
        <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
        <DocumentNameSelect role={role} multiple={false} value={entry.name || ''} disabled={disabled} onChange={name => onChange(entries.map(item => item.id === entry.id ? { ...item, name } : item))} />
          </div>
          <DocumentPreview file={entry.file} />
        </div>
      </div>)}
    </div>}
  </div>;
}
