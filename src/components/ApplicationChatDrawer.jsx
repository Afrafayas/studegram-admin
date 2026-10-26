import { getAssignedExecutiveName } from '../utils/applicationAssignment';
import { ActionButton, ActionForm } from './ActionControls';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import API, { API_BASE_URL } from '../api/axios';
import { useToast } from '../context/ToastContext';

// Error Boundary to prevent crashes in Chat Drawer from taking down the main application
class DrawerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Drawer Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Workspace View Notice</h3>
              <p className="text-xs text-slate-500 font-semibold">
                An unexpected display issue occurred in this drawer. Your main application session is intact and safe.
              </p>
              {this.state.error?.message && (
                <p className="text-[10px] font-mono bg-slate-50 text-red-500 p-2 rounded-lg mt-2 text-left break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <ActionButton
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onClose) this.props.onClose();
              }}
              className="w-full bg-[#D99A1C] hover:bg-[#b88214] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
            >
              Close Drawer
            </ActionButton>
          </div>
        </div>,
        document.body
      ) : null;
    }
    return this.props.children;
  }
}

function ApplicationChatDrawerContent({ app, onClose }) {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'details'

  const [localDocuments, setLocalDocuments] = useState(() => Array.isArray(app?.documents) ? app.documents : []);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState('');
  const [uploadComment, setUploadComment] = useState('');
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [editingDocIdx, setEditingDocIdx] = useState(null);
  const [editDocComment, setEditDocComment] = useState('');
  const [replaceFile, setReplaceFile] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Intercept browser back button to smoothly close drawer instead of exiting site
  useEffect(() => {
    window.history.pushState({ drawer: 'chat' }, '');
    const handlePopState = () => {
      onCloseRef.current?.();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (app) {
      setLocalDocuments(Array.isArray(app?.documents) ? app.documents : []);
      setUploadComment('');
      setSelectedUploadFile(null);
      setEditingDocIdx(null);
      setEditDocComment('');
      setReplaceFile(null);
    }
  }, [app]);

  const handleUploadNewDoc = async () => {
    if (!selectedUploadFile) return;
    setIsUploadingDoc(true);
    setUploadDocError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      const res = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newDoc = { 
        name: selectedUploadFile.name, 
        url: res.data.url,
        comment: uploadComment.trim(),
        uploadedAt: new Date().toISOString()
      };
      const currentDocs = Array.isArray(localDocuments) ? localDocuments : [];
      const updatedDocs = [...currentDocs, newDoc];
      
      const targetAppId = app?.id || app?._id || app?.camsId;
      if (targetAppId) {
        await API.put(`/applications/${targetAppId}`, { documents: updatedDocs });
      }
      setLocalDocuments(updatedDocs);
      setSelectedUploadFile(null);
      setUploadComment('');
      if (toast?.success) {
        toast.success('Document uploaded successfully!');
      }
    } catch (err) {
      console.error('File upload failed:', err);
      const errMessage = err?.response?.data?.message || err?.message || 'Failed to upload document.';
      setUploadDocError(errMessage);
      if (toast?.error) {
        toast.error(errMessage);
      }
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleSaveEditedDoc = async (idx) => {
    setIsReplacing(true);
    try {
      let updatedUrl = localDocuments[idx]?.url;
      let updatedName = localDocuments[idx]?.name;

      if (replaceFile) {
        const formData = new FormData();
        formData.append('file', replaceFile);
        const uploadRes = await API.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        updatedUrl = uploadRes.data.url;
        updatedName = replaceFile.name;
      }

      const updatedDocs = localDocuments.map((d, i) => 
        i === idx ? { ...d, name: updatedName, url: updatedUrl, comment: editDocComment.trim() } : d
      );

      const targetAppId = app?.id || app?._id || app?.camsId;
      if (targetAppId) {
        await API.put(`/applications/${targetAppId}`, { documents: updatedDocs });
      }
      setLocalDocuments(updatedDocs);
      setEditingDocIdx(null);
      setReplaceFile(null);
      if (toast?.success) {
        toast.success('Document updated successfully!');
      }
    } catch (err) {
      console.error('Failed to update document:', err);
      if (toast?.error) {
        toast.error('Failed to update document.');
      }
    } finally {
      setIsReplacing(false);
    }
  };
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('studegram_token');

  // Load chat messages
  useEffect(() => {
    if (!app) return;
    
    const fetchChatMessages = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const targetAppId = app?.id || app?._id || app?.camsId;
        const response = await fetch(`${API_BASE_URL}/applications/${targetAppId}/chat`, {
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
      toast.error('You can only attach a maximum of 5 files.');
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
      const targetAppId = app?.id || app?._id || app?.camsId;
      const response = await fetch(`${API_BASE_URL}/applications/${targetAppId}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Message and attachments could not be saved. Please retry.');
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
      setErrorMsg(err.message || 'Message and attachments could not be saved. Please retry.');
      toast.error(err.message || 'Failed to send message.');
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

  return typeof document !== 'undefined' ? createPortal(
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9998] transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-over Panel */}
      <aside className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-[9999] flex flex-col h-full transform transition-transform duration-300 animate-in slide-in-from-right">
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
          <ActionButton
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
            title="Close Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </ActionButton>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-slate-250 bg-slate-100/60 px-4 pt-2 gap-4">
          <ActionButton
            onClick={() => setActiveTab('chat')}
            className={`pb-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'chat' 
                ? 'border-[#D99A1C] text-[#D99A1C]' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Chat Discussion
          </ActionButton>
          <ActionButton
            onClick={() => setActiveTab('details')}
            className={`pb-2 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'details' 
                ? 'border-[#D99A1C] text-[#D99A1C]' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Application Details
          </ActionButton>
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-slate-800">
                              {msg.sender?.name || (isFromMe ? 'Admin' : (msg.senderModel === 'PartnerStaff' ? 'Agent Staff' : 'Agent'))}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                              isFromMe 
                                ? 'bg-slate-200 text-slate-700' 
                                : msg.senderModel === 'PartnerStaff'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {isFromMe ? (msg.sender?.role || 'Admin') : (msg.senderModel === 'PartnerStaff' ? 'Agent Staff' : 'Partner')}
                            </span>
                          </div>
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
                      <ActionButton
                        onClick={() => removeFile(fIdx)} 
                        className="p-0.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-300/40 transition-colors shrink-0"
                        title="Remove attachment"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </ActionButton>
                    </div>
                  ))}
                </div>
              )}

              {/* Form action */}
              <ActionForm onSubmit={handleSendMessage} className="flex gap-2 items-center">
                {/* File attachment hook */}
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                />
                <ActionButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-[#D99A1C] hover:border-[#D99A1C] hover:bg-slate-50 transition-all shrink-0 shadow-xs"
                  title="Add attachment (Max 5)"
                  disabled={isSending}
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </ActionButton>

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
                <ActionButton
                  type="submit"
                  disabled={isSending || (!messageText.trim() && selectedFiles.length === 0)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-[#D99A1C] text-white hover:scale-[1.03] transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 shrink-0 shadow-md"
                  title="Send Message"
                >
                  {isSending ? (
                    <svg className="animate-spin w-4 h-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </ActionButton>
              </ActionForm>
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

            {/* Comments / Notes */}
            {app.notes && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                  <span>📝</span> Application Notes / Comments
                </h4>
                <p className="text-xs font-semibold text-slate-805 whitespace-pre-wrap leading-relaxed">
                  {app.notes}
                </p>
              </div>
            )}

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
                  <span className="text-slate-900">{getAssignedExecutiveName(app) || 'Unassigned'}</span>
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

            {/* Uploaded Documents Section */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📄</span> Uploaded Documents List
                </h4>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                  {localDocuments.length} Document(s)
                </span>
              </div>

              {/* Additional File Uploader */}
              {selectedUploadFile ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-left shadow-3xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                        {selectedUploadFile.name}
                      </span>
                    </div>
                    <ActionButton
                      type="button"
                      onClick={() => {
                        setSelectedUploadFile(null);
                        setUploadComment('');
                      }}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer shrink-0"
                    >
                      ✕ Remove
                    </ActionButton>
                  </div>
                  <input
                    type="text"
                    placeholder="Document description (e.g. Passport Front Page, Semester 1-6 Marksheet)..."
                    value={uploadComment}
                    onChange={(e) => setUploadComment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D99A1C] shadow-3xs"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#E2E8F0] hover:border-[#D99A1C] transition-colors rounded-xl p-4 text-center cursor-pointer relative bg-slate-50">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedUploadFile(file);
                        setUploadDocError('');
                      }
                    }}
                  />
                  <div className="space-y-1 text-slate-500">
                    <svg className="w-6 h-6 mx-auto text-[#D99A1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <p className="text-xs font-semibold text-slate-700">Click to upload additional document</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Attach any supporting file (PDF, PNG, JPG, Word)</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <ActionButton
                  type="button"
                  disabled={isUploadingDoc || !selectedUploadFile}
                  onClick={handleUploadNewDoc}
                  className="bg-[#D99A1C] hover:bg-[#C28410] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploadingDoc && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isUploadingDoc ? 'Uploading...' : 'Upload Document'}
                </ActionButton>
              </div>

              {uploadDocError && (
                <p className="text-[10px] text-rose-500 font-semibold">❌ {uploadDocError}</p>
              )}

              {/* Documents List */}
              <div className="divide-y divide-slate-100 border border-slate-100 bg-white rounded-xl overflow-hidden shadow-sm">
                {localDocuments.length > 0 ? (
                  localDocuments.map((doc, idx) => {
                    const docTitle = typeof doc === 'string' ? doc : (doc?.name || doc?.fileName || doc?.title || 'Document');
                    const docUrl = typeof doc === 'string' ? doc : (doc?.url || doc?.previewUrl || doc?.fileUrl || '#');
                    const docDate = (doc && typeof doc === 'object' && doc.uploadedAt) ? new Date(doc.uploadedAt) : null;
                    const formattedDate = docDate && !isNaN(docDate.getTime()) 
                      ? docDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                      : 'Just Now';

                    return (
                      <div key={idx} className="p-3.5 hover:bg-slate-50/70 transition-colors border-b last:border-b-0 border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-slate-800 break-words">{docTitle}</h5>
                              {typeof doc === 'object' && doc?.comment && (
                                <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-2.5 mt-2 space-y-1">
                                  <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                    <span>Document Description</span>
                                  </h6>
                                  <p className="text-[10.5px] font-semibold text-slate-800 whitespace-pre-wrap leading-normal">
                                    {doc.comment}
                                  </p>
                                </div>
                              )}
                              <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                Uploaded: {formattedDate}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ActionButton
                              type="button"
                              onClick={() => {
                                setEditingDocIdx(editingDocIdx === idx ? null : idx);
                                setEditDocComment(doc.comment || '');
                                setReplaceFile(null);
                              }}
                              className="border border-amber-200 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>✏️ Edit</span>
                            </ActionButton>
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>View file</span>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        {/* Inline Edit Form */}
                        {editingDocIdx === idx && (
                          <div className="mt-3 p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2 text-left">
                            <label className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-wider">
                              ✏️ Edit Description or Replace File
                            </label>
                            <input
                              type="text"
                              placeholder="Update document description..."
                              value={editDocComment}
                              onChange={(e) => setEditDocComment(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#D99A1C]"
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                              <input
                                type="file"
                                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                                className="text-[10px] text-slate-500 font-semibold cursor-pointer"
                              />
                              <div className="flex gap-1.5 self-end">
                                <ActionButton
                                  type="button"
                                  onClick={() => {
                                    setEditingDocIdx(null);
                                    setReplaceFile(null);
                                  }}
                                  className="border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </ActionButton>
                                <ActionButton
                                  type="button"
                                  disabled={isReplacing}
                                  onClick={() => handleSaveEditedDoc(idx)}
                                  className="bg-[#D99A1C] hover:bg-[#C28410] disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  {isReplacing && (
                                    <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  )}
                                  {isReplacing ? 'Saving...' : 'Save Changes'}
                                </ActionButton>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                    ⚠️ No documents found. Upload one above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>,
    document.body
  ) : null;
}

export default function ApplicationChatDrawer(props) {
  if (!props?.app) return null;
  return (
    <DrawerErrorBoundary onClose={props.onClose}>
      <ApplicationChatDrawerContent {...props} />
    </DrawerErrorBoundary>
  );
}
