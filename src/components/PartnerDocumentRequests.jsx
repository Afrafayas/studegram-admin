import DocumentUploadQueue from './DocumentUploadQueue';
import { planQueuedDocuments } from '../utils/documentQueue.mjs';
import DocumentNameSelect from './DocumentNameSelect';
import { parseDocumentNames } from '../utils/documentNames.mjs';
import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { ActionButton, ActionForm } from './ActionControls';

const QUICK_DOC_SUGGESTIONS = [
  'Trade License',
  'GST Certificate',
  'Company Incorporation Certificate',
  'Business Registration License',
  'Tax / GST Registration Certificate',
  'PAN Card',
  'Authorised Signatory ID Proof',
  'Company Address Proof',
  'Bank Statement',
  'Cancelled Cheque',
  'Bank Account Proof',
  'Company Profile'
];

export default function PartnerDocumentRequests({
  partnerId,
  onUpdate,
  isOpen: controlledIsOpen,
  onToggleOpen,
  hideButton = false
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const toggleOpen = onToggleOpen || (() => setInternalIsOpen(open => !open));
  const [partner, setPartner] = useState(null);
  const [selectedDocNames, setSelectedDocNames] = useState('');
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
      setNames(''); setSelectedDocNames(''); setMessage('');
    } catch (error) { setNotice(error.response?.data?.message || 'Unable to save. Please retry.'); }
    finally { setBusy(false); }
  }
  const canRequest = partner && ['Pending', 'Waiting for Missing Document', 'Active'].includes(partner.status);
  async function download(doc) {
    try {
      const res = await API.get('/upload/download', { params: { url: doc.url, filename: doc.fileName }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url; link.download = doc.fileName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setNotice('Unable to download this document. Please retry.'); }
  }
  return <div className={isOpen ? 'space-y-4' : ''}>
    {!hideButton && (
      <ActionButton
        type="button"
        aria-expanded={isOpen}
        aria-controls={`partner-document-requests-${partnerId}`}
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all focus-visible:outline-none cursor-pointer"
      >
        <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M12 12v3M12 18h.01" />
        </svg>
        <span>{isOpen ? 'Hide document requests' : 'Missing document request'}</span>
      </ActionButton>
    )}
    {isOpen && <section id={`partner-document-requests-${partnerId}`} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
    <h3 className="font-bold text-slate-900">Partner Missing Document Requests</h3>
    <p className="text-sm text-slate-600">Ask the agent to reply with attachments. Replies are addressed to the handling staff member and super admins. Download the reply attachments from your mailbox, then upload them below for review.</p>
    {notice && <p role="status" className="text-sm text-amber-800">{notice}</p>}
    {!partner && <p className="text-xs text-slate-500">Loading document requests...</p>}
    {partner && !canRequest && (
      <p className="text-xs text-amber-700 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200">
        Document requests are disabled for partners with status: {partner.status}
      </p>
    )}
    {canRequest && (
      <ActionForm
        className="space-y-4 bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5"
        onSubmit={e => {
          e.preventDefault();
          const fromSelect = parseDocumentNames(selectedDocNames);
          const fromManual = names.split('\n').map(s => s.trim()).filter(Boolean);
          const allDocs = [...new Set([...fromSelect, ...fromManual])];
          if (!allDocs.length) {
            setNotice('Please select or specify at least one missing document to request.');
            return;
          }
          return run(() => API.post(`/partners/${partnerId}/document-requests`, { documents: allDocs, message: message.trim() }));
        }}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
              Missing Documents <span className="text-amber-600 font-bold">*</span>
            </label>
            {parseDocumentNames(selectedDocNames).length > 0 && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-md">
                {parseDocumentNames(selectedDocNames).length} document(s) chosen
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Select missing legal/company verification documents from the dropdown list (same as agent registration form):
          </p>

          <DocumentNameSelect
            role="Agent"
            multiple={true}
            value={selectedDocNames}
            onChange={setSelectedDocNames}
            disabled={busy}
            label="Select Document Names"
          />

          {/* Quick-Pick Popular Badges */}
          <div className="space-y-1.5 pt-2">
            <span className="block text-[11px] font-bold text-slate-600">Quick-add common documents:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DOC_SUGGESTIONS.map(doc => {
                const currentList = parseDocumentNames(selectedDocNames);
                const isSelected = currentList.includes(doc);
                return (
                  <button
                    key={doc}
                    type="button"
                    disabled={busy || isSelected}
                    onClick={() => {
                      if (!isSelected) {
                        const updated = [...currentList, doc].join(', ');
                        setSelectedDocNames(updated);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 opacity-60 cursor-not-allowed'
                        : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-400 shadow-2xs active:scale-95'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{doc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Optional Manual Freeform textarea */}
        <div className="space-y-1 pt-1">
          <label className="block text-xs font-bold text-slate-600">
            Other Custom Documents (optional &mdash; one per line if not in list)
          </label>
          <textarea
            maxLength={2000}
            rows={2}
            value={names}
            onChange={e => setNames(e.target.value)}
            disabled={busy}
            className="block w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#D99A1C] focus:ring-2 focus:ring-amber-100 transition-all bg-white"
            placeholder="e.g. Specific Local Municipal Certificate&#10;Partnership Deed Addendum"
          />
        </div>

        {/* Instructions to agent */}
        <div className="space-y-1 pt-1">
          <label className="block text-xs font-bold text-slate-700">
            Instructions to agent <span className="text-slate-400 font-normal">(optional instructions / requirements)</span>
          </label>
          <textarea
            maxLength={4000}
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={busy}
            className="block w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#D99A1C] focus:ring-2 focus:ring-amber-100 transition-all bg-white"
            placeholder="e.g. Please provide a clear stamped copy of the trade license and latest GST certificate..."
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <ActionButton
            type="submit"
            disabled={busy || (!parseDocumentNames(selectedDocNames).length && !names.trim())}
            className="px-4 py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 uppercase tracking-wider inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
          >
            {busy ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Document Request</span>
            )}
          </ActionButton>
          {(parseDocumentNames(selectedDocNames).length > 0 || names.trim()) && (
            <span className="text-xs font-semibold text-slate-500">
              {parseDocumentNames(selectedDocNames).length + (names.trim() ? names.split('\n').filter(Boolean).length : 0)} document(s) ready to request
            </span>
          )}
        </div>
      </ActionForm>
    )}
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
