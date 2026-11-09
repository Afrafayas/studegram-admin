import DocumentPreview from './DocumentPreview';
import React, { useState, useEffect, useRef } from 'react';
import API, { API_BASE_URL } from '../api/axios';
import { ActionButton, ActionForm } from './ActionControls';
import { useToast } from '../context/ToastContext';

export default function ApplicationMessagesActivity({
  app,
  commentsList = [],
  onAddComment,
  isPostingComment,
  currentUser,
  onRefresh
}) {
  const toast = useToast();
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [newNote, setNewNote] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const appId = app?.id || app?._id || app?.camsId;

  // Load chat messages
  const loadChatMessages = async (showLoadingSpinner = true) => {
    if (!appId) return;
    if (showLoadingSpinner) setIsChatLoading(true);
    setChatError('');
    try {
      const res = await API.get(`/applications/${appId}/chat`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setChatMessages(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Failed to fetch messages');
      }
    } catch (err) {
      setChatError(err.response?.data?.message || err.message || 'Unable to load chat messages.');
    } finally {
      if (showLoadingSpinner) setIsChatLoading(false);
    }
  };

  useEffect(() => {
    loadChatMessages(true);

    // Background poll every 20 seconds for incoming messages
    const timer = setInterval(() => {
      loadChatMessages(false);
    }, 20000);

    return () => clearInterval(timer);
  }, [appId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (chatFiles.length + files.length > 5) {
      toast.error('You can only attach a maximum of 5 files.');
      return;
    }
    setChatFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send chat message
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() && chatFiles.length === 0) return;

    setIsChatSending(true);
    setChatError('');

    const formData = new FormData();
    formData.append('message', chatInput.trim());
    chatFiles.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const res = await API.post(`/applications/${appId}/chat`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data.data) {
        setChatMessages(prev => [...prev, res.data.data]);
        setChatInput('');
        setChatFiles([]);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(res.data?.message || 'Failed to deliver message');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Message could not be sent.';
      setChatError(msg);
      toast.error(msg);
    } finally {
      setIsChatSending(false);
    }
  };

  // Post internal progress note
  const handlePostNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    if (onAddComment) {
      await onAddComment(newNote.trim());
      setNewNote('');
    } else {
      try {
        await API.post(`/applications/${appId}/comments`, {
          text: newNote.trim()
        });
        setNewNote('');
        if (onRefresh) onRefresh();
        toast.success('Internal note posted successfully!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to post internal note');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
      {/* ================= LEFT COLUMN: SECURE CONVERSATION ================= */}
      <div className="flex flex-col h-[600px] sm:h-[680px] min-h-0 min-w-0 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 relative">
        {/* Chat Secure Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              Secure Conversation
            </span>
          </div>

          <ActionButton
            onClick={() => loadChatMessages(false)}
            disabled={isChatLoading}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
            title="Refresh chat thread"
          >
            <svg
              className={`w-3.5 h-3.5 text-slate-500 ${isChatLoading ? 'animate-spin text-[#D99A1C]' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            <span>Sync Updates</span>
          </ActionButton>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 min-h-0">
          {chatError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-semibold text-center">
              ⚠️ {chatError}
            </div>
          )}

          {isChatLoading && chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <svg className="animate-spin h-6 w-6 text-[#D99A1C]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 select-none">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-xs font-bold text-slate-700">No Chat Messages Yet</p>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs leading-relaxed">
                Communicate directly with the agent or student handling team in this secure thread.
              </p>
            </div>
          ) : (
            chatMessages.map((msg, index) => {
              if (msg.isSystemLog) {
                return (
                  <div key={msg._id || index} className="flex justify-center my-3 px-4">
                    <div className="text-[9px] text-slate-500 font-extrabold bg-slate-100 border border-slate-200/60 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs max-w-full text-center uppercase tracking-wider select-none">
                      <span>★ {msg.message}</span>
                      <span className="text-[8px] text-slate-400 font-bold select-none">
                        · {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                );
              }

              const isPartner = msg.senderModel === 'Partner' || msg.senderModel === 'PartnerStaff';
              const bubbleClass = isPartner
                ? 'bg-gradient-to-r from-[#D99A1C] to-[#C28410] text-white rounded-l-2xl rounded-tr-2xl self-end ml-auto shadow-sm border border-amber-600/10'
                : 'bg-slate-800 text-slate-100 rounded-r-2xl rounded-tl-2xl self-start mr-auto shadow-sm border border-slate-700';

              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col max-w-[85%] ${isPartner ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  {/* Sender Name & Role */}
                  <div className="flex items-center gap-1.5 mb-1 px-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    <span>{msg.sender?.name || (isPartner ? 'Agent' : 'Staff')}</span>
                    <span>·</span>
                    <span className={isPartner ? 'text-[#D99A1C] font-black' : 'text-slate-400'}>
                      {isPartner ? 'Agent' : 'Staff'}
                    </span>
                  </div>

                  {/* Bubble Content */}
                  <div className={`p-3.5 text-xs leading-relaxed font-medium ${bubbleClass}`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2.5 space-y-1.5 border-t border-white/15 pt-2.5">
                        {msg.attachments.map((att, attIdx) => {
                          const filename = att.split('/').pop() || `document_${attIdx + 1}`;
                          return (
                            <a
                              key={attIdx}
                              href={att}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all truncate hover:scale-[1.01] ${
                                isPartner
                                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                  : 'bg-slate-900/40 hover:bg-slate-900/60 text-slate-100 border-slate-600'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="truncate max-w-[180px]">{filename}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[8px] text-slate-400 font-bold mt-1 px-1 select-none">
                    🕒 {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected File Previews */}
        {chatFiles.length > 0 && (
          <div className="bg-white px-4 py-2 border-t border-slate-100 flex flex-wrap gap-2 shrink-0">
            {chatFiles.map((file, idx) => (
              <div
                key={idx}
                className="bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[9px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
              >
                <DocumentPreview file={file} />
                <span className="truncate max-w-[140px]">{file.name}</span>
                <ActionButton
                  type="button"
                  onClick={() => setChatFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:text-red-700 font-extrabold focus:outline-none cursor-pointer"
                >
                  ✕
                </ActionButton>
              </div>
            ))}
          </div>
        )}

        {/* Message Input Form */}
        <ActionForm
          onSubmit={handleSendChatMessage}
          className="bg-white p-3.5 border-t border-slate-200 flex items-center gap-2.5 shrink-0"
        >
          <div className="relative">
            <input
              type="file"
              id="admin-chat-file-upload"
              ref={fileInputRef}
              multiple
              disabled={isChatSending}
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="admin-chat-file-upload"
              className={`p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-[#0F172A] rounded-xl border border-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                isChatSending ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
              }`}
              title="Attach files (up to 5 files)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </label>
          </div>

          <input
            type="text"
            placeholder={chatFiles.length > 0 ? "Add details for attached file(s)..." : "Type message to communicate with agent..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatSending}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C] transition-all font-medium disabled:opacity-50"
          />

          <ActionButton
            type="submit"
            disabled={isChatSending || (!chatInput.trim() && chatFiles.length === 0)}
            className="p-2.5 bg-gradient-to-r from-[#D99A1C] to-[#C28410] hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center shadow-md disabled:pointer-events-none cursor-pointer"
          >
            {isChatSending ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </ActionButton>
        </ActionForm>
      </div>

      {/* ================= RIGHT COLUMN: ACTIVITY LOGS & NOTES ================= */}
      <div className="p-5 sm:p-6 flex flex-col min-w-0 bg-slate-50/40 space-y-6 overflow-y-auto max-h-[680px]">
        {/* Note Composer Box */}
        <ActionForm onSubmit={handlePostNoteSubmit} className="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
            Add Internal Note / Task Remark
          </label>
          <textarea
            rows="3"
            placeholder="Add a progress note or internal task description..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C] transition-all font-medium resize-none shadow-inner"
          ></textarea>
          <div className="flex justify-between items-center pt-1">
            <span className="text-[9px] text-slate-400 font-semibold">Saved to application activity stream</span>
            <ActionButton
              type="submit"
              disabled={!newNote.trim() || isPostingComment}
              className="bg-[#D99A1C] hover:bg-[#C28410] disabled:opacity-50 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              {isPostingComment && (
                <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{isPostingComment ? 'Posting...' : 'Post Note'}</span>
            </ActionButton>
          </div>
        </ActionForm>

        {/* Communication Stream & Audit Logs */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
              Communication Stream & Audit Logs
            </h4>
            <span className="text-[10px] font-bold text-slate-400">
              {commentsList.length} updates
            </span>
          </div>

          <div className="space-y-3">
            {commentsList.length > 0 ? (
              commentsList.map((item, idx) => {
                const isStatus = item.type === 'status';
                const avatarBg = isStatus
                  ? 'bg-blue-600'
                  : item.role === 'Agent'
                    ? 'bg-amber-600'
                    : 'bg-slate-800';

                return (
                  <div
                    key={item.id || idx}
                    className="flex gap-3 bg-white p-3.5 border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs`}>
                      <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                      </svg>
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h5 className="text-xs font-black text-slate-900">{item.author}</h5>
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          isStatus
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.role === 'Agent'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {item.role || (isStatus ? 'Status Update' : 'Staff')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                        {item.text}
                      </p>
                      <span className="block text-[8px] text-slate-400 font-bold select-none mt-1">
                        🕒 {item.createdAt ? new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', hour12: true }) : 'Recent'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-white text-xs text-slate-400 font-semibold">
                No activity records logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

