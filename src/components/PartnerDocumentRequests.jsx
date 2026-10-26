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
      className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 rounded-xl font-extrabold text-xs transition-all"
    >
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
        <label className="block text-sm font-semibold">Attach documents received by email (all files for this request)
          <input type="file" multiple disabled={busy} className="block mt-2" onChange={e => {
            const files = Array.from(e.target.files || []); e.target.value = '';
            if (!files.length) return;
            if (files.length > 10 || files.some(file => file.size > 15 * 1024 * 1024)) { setNotice('Upload up to 10 files, maximum 15 MB each.'); return; }
            const data = new FormData(); files.forEach(file => data.append('documents', file));
            run(() => API.post(`/partners/${partnerId}/document-requests/${request._id}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } }));
          }} />
        </label>
      </div>}
      {request.receivedDocuments?.map((doc, index) => <ActionButton type="button" key={index} onClick={() => download(doc)} className="block text-blue-700 underline text-sm">Download {doc.fileName}</ActionButton>)}
    </article>)}
  </section>}
  </div>;
}
