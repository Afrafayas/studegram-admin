import DocumentUploadQueue from './DocumentUploadQueue';
import { planQueuedDocuments } from '../utils/documentQueue.mjs';
import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { ActionButton, ActionForm } from './ActionControls';

export default function PartnerDocumentRequests({ partnerId, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [partner, setPartner] = useState(null);
  const [names, setNames] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    API.get(`/partners/${partnerId}`).then(res => { if (active) setPartner(res.data.data); }).catch(() => { if (active) setNotice('Unable to load document requests. Refresh to retry.'); });
    return () => { active = false; };
  }, [partnerId, isOpen]);
  async function run(action) {
    setBusy(true); setNotice('');
    try {
      const res = await action();
      setPartner(res.data.data); onUpdate(res.data.data);
      setNotice(res.data.emailSent === false || res.data.teamEmailSent === false ? 'Saved, but an email could not be delivered. Check mail configuration; use Resend email if the request failed.' : 'Saved and email notifications sent.');
      setNames(''); setMessage('');
    } catch (error) { setNotice(error.response?.data?.message || 'Unable to save. Please retry.'); }
    finally { setBusy(false); }
  }
  const canRequest = partner && ['Pending', 'Waiting for Missing Document'].includes(partner.status);
  async function download(doc) {
    try {
      const res = await API.get('/upload/download', { params: { url: doc.url, filename: doc.fileName }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url; link.download = doc.fileName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setNotice('Unable to download this document. Please retry.'); }
  }
  return <div className="space-y-4">
    <ActionButton
      type="button"
      aria-expanded={isOpen}
      aria-controls={`partner-document-requests-${partnerId}`}
      onClick={() => setIsOpen(open => !open)}
      className="inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 rounded-xl font-extrabold text-sm shadow-md shadow-amber-500/25 ring-2 ring-amber-200 ring-offset-2 transition-all focus-visible:outline-none focus-visible:ring-amber-600"
    >
      <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M12 12v3M12 18h.01" />
      </svg>
      {isOpen ? 'Hide document requests' : 'Missing document request'}
    </ActionButton>
    {isOpen && <section id={`partner-document-requests-${partnerId}`} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
    <h3 className="font-bold text-slate-900">Missing registration documents</h3>
    <p className="text-sm text-slate-600">Ask the agent to reply with attachments. Replies are addressed to the handling staff member and super admins. Download the reply attachments from your mailbox, then upload them below for review.</p>
    {notice && <p role="status" className="text-sm text-amber-800">{notice}</p>}
    {canRequest && <ActionForm className="space-y-3" onSubmit={e => { e.preventDefault(); return run(() => API.post(`/partners/${partnerId}/document-requests`, { documents: names.split('\n').map(s => s.trim()).filter(Boolean), message })); }}>
      <label className="block text-sm font-semibold">Missing documents (one per line)<textarea required maxLength={4000} value={names} onChange={e => setNames(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" /></label>
      <label className="block text-sm font-semibold">Instructions to agent<textarea maxLength={4000} value={message} onChange={e => setMessage(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" /></label>
      <ActionButton type="submit" disabled={busy} className="bg-amber-500 text-white font-bold rounded-lg px-4 py-2 disabled:opacity-50">Send document request</ActionButton>
    </ActionForm>}
    {partner?.documentRequests?.map(request => <article key={request._id} className="border rounded-xl p-4 space-y-2">
      <p className="font-semibold">{request.documents.join(', ')} — {request.status}</p>
      <p className="text-sm whitespace-pre-wrap">{request.message}</p>
      <p className="text-xs text-slate-500">Requested {new Date(request.requestedAt).toLocaleString()} · Email: {request.emailStatus} · Replies: {request.replyTo.join(', ')}</p>
      {request.status === 'Open' && canRequest && <div className="space-y-2">
        <ActionButton type="button" disabled={busy} className="text-sm underline disabled:opacity-50" onClick={() => run(() => API.post(`/partners/${partnerId}/document-requests`, { requestId: request._id, documents: request.documents, message: request.message }))}>Resend email</ActionButton>
<ReceiptDocumentUpload key={request._id} busy={busy} run={run} partnerId={partnerId} requestId={request._id} setNotice={setNotice} />
      </div>}
      {request.receivedDocuments?.map((doc, index) => <ActionButton type="button" key={index} onClick={() => download(doc)} className="block text-blue-700 underline text-sm">Download {doc.fileName}</ActionButton>)}
    </article>)}
  </section>}
  </div>;
}

function ReceiptDocumentUpload({ busy, run, partnerId, requestId, setNotice }) {
  const [entries, setEntries] = useState([]);
  return <div className="space-y-3">
    <DocumentUploadQueue role="Agent" entries={entries} onChange={setEntries} disabled={busy} />
    <ActionButton type="button" disabled={busy || !entries.length} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={() => {
      try {
        const plan = planQueuedDocuments(entries);
        if (plan.length > 10) throw new Error('Upload up to 10 files for this request.');
        const data = new FormData(); plan.forEach(entry => data.append('documents', entry.file)); data.append('documentNames', JSON.stringify(plan.map(entry => entry.name)));
        return run(async () => {
          const response = await API.post('/partners/' + partnerId + '/document-requests/' + requestId + '/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (!response.data?.success) throw new Error(response.data?.message || 'Unable to save documents.');
          setEntries([]); return response;
        });
      } catch (err) { setNotice(err.message); }
    }}>Upload All Documents</ActionButton>
  </div>;
}
