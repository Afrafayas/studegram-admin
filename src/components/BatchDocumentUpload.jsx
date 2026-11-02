import React, { useEffect, useRef, useState } from 'react';
import API from '../api/axios';
import DocumentUploadQueue from './DocumentUploadQueue';
import { ActionButton } from './ActionControls';
import { uploadDocumentBatch } from '../utils/documentNames.mjs';
import { planQueuedDocuments } from '../utils/documentQueue.mjs';
export default function BatchDocumentUpload({ role = 'Student', onComplete, disabled = false, onBusyChange, onPendingChange }) {
  const [comment, setComment] = useState('');
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [staged, setStaged] = useState(null);
  const locked = useRef(false);
  useEffect(() => { onPendingChange?.(entries.length > 0); }, [entries.length, onPendingChange]);
  const upload = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try {
      const result = staged || await uploadDocumentBatch(API, planQueuedDocuments(entries));
      setStaged(result);
      if (result.uploaded.length) await onComplete(result.uploaded.map(doc => ({ ...doc, comment: comment.trim() })));
      setEntries(result.failed.map(({ id, file, name }) => ({ id, file, name })));
      setStaged(null);
      setMessage(result.uploaded.length ? result.uploaded.length + ' document(s) uploaded and attached. You can add more files from any folder.' : '');
      setError(result.failed.map(item => item.file.name + ': ' + item.error).join(' '));
    } catch (err) { setError(err.response?.data?.message || err.message || 'Unable to upload documents. Retry to continue.'); }
    finally { locked.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
    <DocumentUploadQueue role={role} entries={entries} onChange={setEntries} disabled={busy || disabled || Boolean(staged)} />
    <label className="block text-xs font-semibold text-slate-700">Description (optional)<textarea value={comment} onChange={event => setComment(event.target.value)} disabled={busy || disabled} className="block mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs" /></label>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    <ActionButton type="button" onClick={upload} disabled={busy || disabled || !entries.length} className="rounded-xl bg-[#D99A1C] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Uploading and saving...' : staged ? 'Retry Save' : 'Upload All Documents'}</ActionButton>
  </div>;
}
