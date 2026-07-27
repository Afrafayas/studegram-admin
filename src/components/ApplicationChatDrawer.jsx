import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ApplicationChatDrawer({ app, onClose }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'details'
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const API_BASE_URL = '/api';
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('studegram_token');

  // Load chat messages
  useEffect(() => {
    if (!app) return;
    
    const fetchChatMessages = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        // Attempt backend API call
        const response = await fetch(`${API_BASE_URL}/applications/${app.camsId}/chat`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Backend offline or application not found. Using local mock workspace.');
        }
        
        const resData = await response.json();
        if (resData.success) {
          setMessages(resData.data);
        } else {
          throw new Error(resData.message || 'Failed to fetch messages');
        }
      } catch (err) {
        console.warn('API Chat fetch failed, falling back to localStorage:', err.message);
        loadMockMessages();
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatMessages();
  }, [app, token]);

  // Autoscroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isSending]);

  // Load mock messages from localStorage or generate defaults
  const loadMockMessages = () => {
    const storageKey = `chat_messages_${app.camsId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      // Default sample flow messages for the demo
      const defaults = [
        {
          _id: 'sys-1',
          senderModel: 'User',
          sender: { name: 'System' },
          message: `Application initially generated in system by Agent: ${app.referredBy || 'Direct'}`,
          isSystemLog: true,
          attachments: [],
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          _id: 'part-1',
          senderModel: 'Partner',
          sender: { name: app.referredBy !== 'Direct' ? app.referredBy : 'Partner Agent' },
          message: `Hello Support, I have uploaded the verification transcripts for student ${app.studentName}. Please verify.`,
          isSystemLog: false,
          attachments: [],
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          _id: 'user-1',
          senderModel: 'User',
          sender: { name: 'Elena Rostova' },
          message: 'Received. Checking the transcripts now. Will let you know if additional file formats are required.',
          isSystemLog: false,
          attachments: [],
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaults));
      setMessages(defaults);
    }
  };

  // Save current messages to localStorage mock DB
  const saveMockMessages = (newMessages) => {
    const storageKey = `chat_messages_${app.camsId}`;
    localStorage.setItem(storageKey, JSON.stringify(newMessages));
  };

  // Handle file select
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      alert('You can only attach a maximum of 5 files.');
      return;
    }
    
    // Add local preview helper
    const updated = files.map(file => ({
      raw: file,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2), // MB
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setSelectedFiles(prev => [...prev, ...updated]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && selectedFiles.length === 0) return;

    setIsSending(true);
    setErrorMsg('');

    // Prepare FormData
    const formData = new FormData();
    formData.append('message', messageText);
    selectedFiles.forEach(file => {
      formData.append('attachments', file.raw);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/applications/${app.camsId}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('API sending failed. Falling back to local offline posting.');
      }

      const resData = await response.json();
      if (resData.success) {
        setMessages(prev => [...prev, resData.data]);
        setMessageText('');
        setSelectedFiles([]);
      } else {
        throw new Error(resData.message || 'Failed to deliver message');
      }
    } catch (err) {
      console.warn('API message send failed. Saving to mock storage:', err.message);
      
      // Perform fallback storage updates
      const mockAttachments = selectedFiles.map(file => 
        file.preview ? file.preview : `/uploads/mock-file-${Date.now()}-${file.name}`
      );

      const newMsg = {
        _id: `msg-${Date.now()}`,
        senderModel: 'User',
        sender: { 
          name: currentUser ? currentUser.name : 'Super Admin',
          email: currentUser ? currentUser.email : 'admin@studegram.com'
        },
        message: messageText,
        attachments: mockAttachments,
        isSystemLog: false,
        createdAt: new Date().toISOString()
      };

      const updatedMsgs = [...messages, newMsg];
      setMessages(updatedMsgs);
      saveMockMessages(updatedMsgs);

      setMessageText('');
      setSelectedFiles([]);
    } finally {
      setIsSending(false);
    }
  };

  // Helper to format timestamps
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRelativeDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const isImage = (path) => {
    const lower = path.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.startsWith('blob:');
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-over Panel */}
      <aside className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col h-full transform transition-transform duration-300 animate-in slide-in-from-right">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 bg-[#0A0A0F] text-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Application Workspace</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono text-[#F5B025]">{app.camsId}</span>
              <span className="h-1 w-1 bg-slate-500 rounded-full"></span>
              <span className="text-[10px] font-semibold text-slate-400">{app.studentName}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
            title="Close Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-slate-250 bg-slate-100/60 px-4 pt-2 gap-4">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`pb-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'chat' 
                ? 'border-[#D99A1C] text-[#D99A1C]' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Chat Discussion
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`pb-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'details' 
                ? 'border-[#D99A1C] text-[#D99A1C]' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Application Details
          </button>
        </div>

        {/* Small metadata summary bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 text-[10px] font-bold text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>Univ: <strong className="text-slate-800">{app.universityName}</strong></span>
          <span>Course: <strong className="text-slate-800 truncate max-w-[150px] inline-block align-bottom">{app.courseName}</strong></span>
          <span>Intake: <strong className="text-slate-800">{app.intake}</strong></span>
        </div>

        {activeTab === 'chat' && (
          <>
            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin">
              {isLoading ? (
                <div className="space-y-4 py-6">
                  {/* Skeleton loading bubbles */}
                  <div className="flex items-start gap-2.5 max-w-[70%] animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                    <div className="space-y-2 bg-slate-200/50 rounded-2xl rounded-tl-none p-3.5 w-full">
                      <div className="h-2 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 max-w-[70%] ml-auto justify-end animate-pulse">
                    <div className="space-y-2 bg-slate-200/50 rounded-2xl rounded-tr-none p-3.5 w-full">
                      <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                      <div className="h-2 bg-slate-200 rounded w-1/4"></div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="flex items-start gap-2.5 max-w-[70%] animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                    <div className="space-y-2 bg-slate-200/50 rounded-2xl rounded-tl-none p-3.5 w-full">
                      <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <svg className="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase">No Messages Yet</h4>
                  <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">Start the discussion regarding document status, CAS invoices, or file checklists.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isSystem = msg.isSystemLog;
                  const isFromMe = msg.senderModel === 'User';
                  const senderInitials = msg.sender?.name?.split(' ').map(n=>n[0]).join('') || 'U';

                  if (isSystem) {
                    return (
                      <div key={msg._id || index} className="flex justify-center my-2">
                        <div className="bg-slate-200/60 border border-slate-300/40 text-slate-600 text-[10px] px-3.5 py-1.5 rounded-full font-bold italic tracking-wide text-center max-w-[90%]">
                          ⚙️ {msg.message}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg._id || index} 
                      className={`flex items-start gap-2.5 max-w-[85%] ${isFromMe ? 'ml-auto justify-end' : ''}`}
                    >
                      {!isFromMe && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-[#D99A1C] to-[#F5B025] shrink-0 shadow-sm uppercase">
                          {senderInitials}
                        </div>
                      )}

                      <div className="space-y-1 max-w-[85%]">
                        {/* Sender Name & Meta */}
                        <div className={`flex items-baseline gap-2 ${isFromMe ? 'justify-end' : ''}`}>
                          <span className="text-[10px] font-extrabold text-slate-800">{msg.sender?.name}</span>
                          <span className="text-[9px] font-semibold text-slate-400">
                            {getRelativeDate(msg.createdAt)} {formatTime(msg.createdAt)}
                          </span>
                        </div>

                        {/* Chat Bubble */}
                        <div className={`rounded-2xl px-3.5 py-2.5 text-[11px] font-semibold shadow-xs leading-relaxed space-y-2 ${
                          isFromMe 
                            ? 'bg-slate-800 text-white rounded-tr-none' 
                            : 'bg-[#D99A1C] text-white rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-line">{msg.message}</p>
                          
                          {/* Attachments Section */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="pt-2 border-t border-white/10 space-y-1.5">
                              <span className="text-[8px] uppercase tracking-wider text-white/50 block font-bold">Attachments:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.attachments.map((fileUrl, attachmentIdx) => {
                                  const fileName = fileUrl.split('/').pop() || 'file';
                                  const displayUrl = fileUrl.startsWith('http') || fileUrl.startsWith('/api') || fileUrl.startsWith('/uploads') ? fileUrl : `/uploads/${fileName}`;

                                  return (
                                    <a 
                                      key={attachmentIdx}
                                      href={displayUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md text-[9px] font-bold text-white border border-white/10 transition-colors max-w-[150px] truncate"
                                      title={fileName}
                                    >
                                      {isImage(fileUrl) ? (
                                        <svg className="w-3 h-3 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      )}
                                      <span className="truncate">{fileName}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Optimistic send loading */}
              {isSending && (
                <div className="flex items-start gap-2.5 max-w-[85%] ml-auto justify-end">
                  <div className="space-y-1 max-w-[85%]">
                    <div className="flex items-baseline gap-2 justify-end">
                      <span className="text-[10px] font-extrabold text-slate-800">Delivering...</span>
                    </div>
                    <div className="rounded-2xl rounded-tr-none px-3.5 py-2.5 text-[11px] font-semibold bg-slate-300 text-slate-700 shadow-xs">
                      <span>Uploading files and sending secure email triggers...</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-650 text-xs shrink-0 uppercase">
                    ...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Tray Footer */}
            <div className="p-4 bg-white border-t border-slate-100 space-y-3">
              {/* File attachment preview chips */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 py-1 max-h-24 overflow-y-auto">
                  {selectedFiles.map((file, fIdx) => (
                    <div 
                      key={fIdx} 
                      className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 border border-slate-200 text-[10px] font-semibold max-w-[200px]"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="truncate flex-1 font-mono">{file.name}</span>
                      <span className="text-[8px] text-slate-400 shrink-0">({file.size}MB)</span>
                      <button 
                        onClick={() => removeFile(fIdx)} 
                        className="p-0.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-300/40 transition-colors shrink-0"
                        title="Remove attachment"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form action */}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                {/* File attachment hook */}
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-[#D99A1C] hover:border-[#D99A1C] hover:bg-slate-50 transition-all shrink-0 shadow-xs"
                  title="Add attachment (Max 5)"
                  disabled={isSending}
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Message input */}
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  placeholder="Post a secure update comment..."
                  disabled={isSending}
                />

                {/* Submit button */}
                <button 
                  type="submit"
                  disabled={isSending || (!messageText.trim() && selectedFiles.length === 0)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-[#D99A1C] text-white hover:scale-[1.03] transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0 shadow-md flex items-center justify-center"
                  title="Send Message"
                >
                  <svg className="w-4.5 h-4.5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'details' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50">
            {/* Student Profile Info */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                <span>👤</span> Student Profile Details
              </h4>
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="text-slate-900 font-bold">{app.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Passport Number:</span>
                  <span className="text-slate-900 font-mono">{app.passportNo || 'Pending'}</span>
                </div>
                {app.dob && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date of Birth:</span>
                    <span className="text-slate-900">{app.dob}</span>
                  </div>
                )}
                {app.studentEmail && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Address:</span>
                    <span className="text-indigo-600 font-bold">{app.studentEmail}</span>
                  </div>
                )}
                {app.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact Number:</span>
                    <span className="text-slate-900">{app.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Academic Program Info */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                <span>🏛️</span> Program & Institution
              </h4>
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">University:</span>
                  <span className="text-slate-900 font-bold">{app.universityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location/Country:</span>
                  <span className="text-slate-900 font-bold">{app.country || 'India'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Course Name:</span>
                  <span className="text-slate-900 font-bold">{app.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Academic Intake:</span>
                  <span className="text-indigo-600 font-bold">{app.intake}</span>
                </div>
              </div>
            </div>

            {/* Referral Channel & Assignment Info */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                <span>🤝</span> Referral & Operations
              </h4>
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Referred B2B Agent:</span>
                  <span className="text-[#D99A1C] font-bold">{app.assignedBdm || 'Direct'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Executive:</span>
                  <span className="text-slate-900">{app.assignedExecutive || 'Rahul Krishnan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Application Date:</span>
                  <span className="text-slate-500">{app.dateAdded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Workflow Status:</span>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-extrabold ${
                    app.secondaryStatus === 'Processed' || app.secondaryStatus === 'Offer Issued'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : app.secondaryStatus === 'Pending' || app.secondaryStatus === 'Document Verification'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {app.secondaryStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
