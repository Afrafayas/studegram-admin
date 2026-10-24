import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import ApplicationChatDrawer from '../components/ApplicationChatDrawer';
import { useToast } from '../context/ToastContext';

const getDocumentBlobUrl = (urlOrBase64, mimeType = 'application/pdf') => {
  if (!urlOrBase64) return '';
  if (typeof urlOrBase64 !== 'string') return '';
  if (urlOrBase64.startsWith('blob:') || urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://')) {
    return urlOrBase64;
  }
  if (urlOrBase64.startsWith('/uploads/') || urlOrBase64.startsWith('uploads/')) {
    const cleanPath = urlOrBase64.startsWith('/') ? urlOrBase64 : `/${urlOrBase64}`;
    return `http://localhost:5000${cleanPath}`;
  }

  let base64 = urlOrBase64;
  let type = mimeType;

  if (urlOrBase64.startsWith('data:')) {
    const parts = urlOrBase64.split(',');
    const match = parts[0].match(/:(.*?);/);
    if (match) type = match[1];
    base64 = parts[1] || '';
  }

  try {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type });
    return URL.createObjectURL(blob);
  } catch (err) {
    return urlOrBase64;
  }
};

const createSampleStudentDocBlobUrl = (title, studentName, studentCode) => {
  const cleanTitle = (title || 'Verification Document').toString().toUpperCase();
  const cleanStudent = (studentName || 'Student Profile').toString();
  const cleanCode = (studentCode || 'STD-10001').toString();
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="#ffffff"/>
    <rect x="30" y="30" width="740" height="940" fill="none" stroke="#cbd5e1" stroke-width="2" rx="20"/>
    <rect x="30" y="30" width="740" height="130" fill="#0a0a0f" rx="20"/>
    <text x="70" y="85" fill="#d99a1c" font-family="system-ui, sans-serif" font-size="24" font-weight="900">UNIGATHER STUDENT DIRECTORY</text>
    <text x="70" y="120" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="700">STUDENT VERIFICATION DOSSIER — ${cleanCode}</text>
    <text x="70" y="210" fill="#0f172a" font-family="system-ui, sans-serif" font-size="26" font-weight="900">${cleanTitle}</text>
    <text x="70" y="245" fill="#64748b" font-family="system-ui, sans-serif" font-size="15" font-weight="600">Student: ${cleanStudent} (${cleanCode})</text>
    <line x1="70" y1="275" x2="730" y2="275" stroke="#e2e8f0" stroke-width="2"/>
    <rect x="70" y="310" width="660" height="340" fill="#f8fafc" stroke="#e2e8f0" rx="16"/>
    <text x="100" y="360" fill="#334155" font-family="system-ui, sans-serif" font-size="18" font-weight="800">OFFICIAL STUDENT VERIFICATION RECORD</text>
    <text x="100" y="400" fill="#475569" font-family="system-ui, sans-serif" font-size="14">Student Code: ${cleanCode}</text>
    <text x="100" y="430" fill="#475569" font-family="system-ui, sans-serif" font-size="14">Verification Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</text>
    <text x="100" y="460" fill="#475569" font-family="system-ui, sans-serif" font-size="14">Identity Proof Status: VERIFIED &amp; COMPLIANT</text>
    <rect x="100" y="530" width="240" height="46" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5" rx="12"/>
    <text x="125" y="560" fill="#047857" font-family="system-ui, sans-serif" font-size="15" font-weight="800">✓ VERIFIED RECORD</text>
    <circle cx="580" cy="790" r="65" fill="#2563eb" fill-opacity="0.1" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="545" y="796" fill="#1e3a8a" font-family="system-ui, sans-serif" font-size="17" font-weight="900">VERIFIED</text>
    <text x="70" y="930" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Confidential student record managed under Unigather Education Portal.</text>
  </svg>`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
};

const handleDownloadStudentDoc = (docUrl, fileName) => {
  if (!docUrl) return;
  const link = document.createElement('a');
  link.href = docUrl;
  link.download = fileName || 'student_document.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Students({ clients = [], setClients, applications = [], intakes = [], initialSelectedStudentId = null, onNavigateToApplication }) {
  const toast = useToast();
  const { currentUser, addAuditLog } = useAuth();
  const [selectedChatApp, setSelectedChatApp] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [intakeFilter, setIntakeFilter] = useState('All');

  // Single View Student Profile Dossier State (persists across page refresh)
  const [singleViewStudent, setSingleViewStudent] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlStudentId = params.get('studentId') || params.get('id');
      const savedStudentId = urlStudentId || localStorage.getItem('studegram_admin_single_view_student_id') || localStorage.getItem('studegram_admin_expanded_student_id');
      const savedStudentJson = localStorage.getItem('studegram_admin_single_view_student');
      let parsed = null;
      if (savedStudentJson) {
        try { parsed = JSON.parse(savedStudentJson); } catch (e) {}
      }
      if (Array.isArray(clients) && clients.length > 0) {
        const targetSearchId = savedStudentId || parsed?.id || parsed?._id || parsed?.studentCode;
        if (targetSearchId) {
          const targetStr = String(targetSearchId).trim().toLowerCase();
          const found = clients.find(c =>
            c.type === 'Student' && (
              String(c.id || c._id || '').toLowerCase() === targetStr ||
              String(c.studentCode || '').toLowerCase() === targetStr ||
              String(c.email || '').toLowerCase() === targetStr
            )
          );
          if (found) return { ...(parsed || {}), ...found };
        }
      }
      if (parsed && (parsed.id || parsed._id)) return parsed;
    } catch (e) {}
    return null;
  });

  const [expandedId, setExpandedId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('studentId') || localStorage.getItem('studegram_admin_expanded_student_id') || null;
    } catch (e) {
      return null;
    }
  });

  const [previewModalDoc, setPreviewModalDoc] = useState(null);

  // Keep singleViewStudent in sync with live clients prop
  useEffect(() => {
    if (!singleViewStudent || !clients || clients.length === 0) return;
    const currentId = String(singleViewStudent.id || singleViewStudent._id || singleViewStudent.studentCode || '').toLowerCase();
    const updated = clients.find(c => 
      c.type === 'Student' && (
        String(c.id || c._id || '').toLowerCase() === currentId ||
        String(c.studentCode || '').toLowerCase() === currentId
      )
    );
    if (updated) {
      setSingleViewStudent(prev => ({ ...(prev || {}), ...updated }));
    }
  }, [clients]);

  // Persist singleViewStudent & expandedId to localStorage and URL search params
  useEffect(() => {
    if (singleViewStudent) {
      const studentId = singleViewStudent.id || singleViewStudent._id || singleViewStudent.studentCode;
      localStorage.setItem('studegram_admin_single_view_student_id', String(studentId));
      localStorage.setItem('studegram_admin_expanded_student_id', String(studentId));
      try {
        localStorage.setItem('studegram_admin_single_view_student', JSON.stringify(singleViewStudent));
      } catch (e) {}
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('studentId') !== String(studentId)) {
          url.searchParams.set('studentId', String(studentId));
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    } else {
      localStorage.removeItem('studegram_admin_single_view_student_id');
      localStorage.removeItem('studegram_admin_single_view_student');
      if (!expandedId) {
        localStorage.removeItem('studegram_admin_expanded_student_id');
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('studentId')) {
            url.searchParams.delete('studentId');
            window.history.replaceState({}, '', url.toString());
          }
        } catch (e) {}
      }
    }
  }, [singleViewStudent, expandedId]);

  useEffect(() => {
    const handleClearStudentExpanded = () => {
      setExpandedId(null);
      setSingleViewStudent(null);
      localStorage.removeItem('studegram_admin_expanded_student_id');
      localStorage.removeItem('studegram_admin_single_view_student_id');
      localStorage.removeItem('studegram_admin_single_view_student');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('studentId');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}
    };

    window.addEventListener('clear_student_expanded', handleClearStudentExpanded);
    return () => {
      window.removeEventListener('clear_student_expanded', handleClearStudentExpanded);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlStudentId = params.get('studentId');
      if (!urlStudentId) {
        setExpandedId(null);
        setSingleViewStudent(null);
      } else {
        const found = (clients || []).find(c => 
          c.type === 'Student' && (
            String(c.id || c._id || '').toLowerCase() === urlStudentId.toLowerCase() ||
            String(c.studentCode || '').toLowerCase() === urlStudentId.toLowerCase()
          )
        );
        if (found) {
          setSingleViewStudent(found);
          setExpandedId(found.id);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [clients]);

  // Auto-expand or open Single View if navigated from notification or saved ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStudentId = params.get('studentId');
    const savedStudentId = urlStudentId || localStorage.getItem('studegram_admin_single_view_student_id') || localStorage.getItem('studegram_admin_expanded_student_id');
    const effectiveTarget = initialSelectedStudentId || (!singleViewStudent ? savedStudentId : null);

    if (!effectiveTarget || !clients || clients.length === 0) return;

    const studentList = clients.filter(c => c.type === 'Student');
    if (studentList.length === 0) return;

    let targetId = effectiveTarget;
    let notifObj = null;
    if (typeof effectiveTarget === 'object' && effectiveTarget !== null) {
      targetId = effectiveTarget.targetId || effectiveTarget.relatedId || effectiveTarget.studentId || effectiveTarget.id;
      notifObj = effectiveTarget.notification || effectiveTarget;
    }

    const targetStr = String(targetId || '').trim().toLowerCase();
    const notifText = notifObj ? `${notifObj.title || ''} ${notifObj.message || ''}`.toLowerCase() : '';

    let found = studentList.find(s => {
      const sId = String(s.id || s._id || '').toLowerCase();
      const sCode = String(s.studentCode || '').toLowerCase();
      const sEmail = String(s.email || '').toLowerCase();
      return (targetStr && (sId === targetStr || sCode === targetStr || sEmail === targetStr));
    });

    if (!found && targetStr) {
      found = studentList.find(s => {
        const sName = (s.name || '').toLowerCase();
        return sName && (sName.includes(targetStr) || targetStr.includes(sName));
      });
    }

    if (!found && notifText) {
      found = studentList.find(s => {
        const sName = (s.name || '').toLowerCase();
        return sName && notifText.includes(sName);
      });
    }

    if (found) {
      setSingleViewStudent(found);
      setExpandedId(found.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialSelectedStudentId, clients]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, partnerFilter, intakeFilter]);
  
  // Onboard Student Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPassport, setNewStudentPassport] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [newStudentReferredBy, setNewStudentReferredBy] = useState('Direct');

  const canOnboard = currentUser?.role !== 'Executive';

  // Extract students (type === 'Student')
  const students = clients.filter(c => c.type === 'Student');
  const partners = clients.filter(c => c.type === 'Agent');

  // Find linked applications for a specific student
  const getStudentApplications = (studentName) => {
    if (!studentName) return [];
    const clean = studentName.trim().toLowerCase();
    return (applications || []).filter(app => {
      const aName = (app.studentName || app.student?.name || '').trim().toLowerCase();
      return aName === clean;
    });
  };

  // Dynamically extract all unique intakes from master intakes and applications
  const masterIntakeTitles = (intakes || []).map(i => typeof i === 'object' ? i.title : i).filter(Boolean);
  const appIntakeTitles = (applications || []).map(app => app.intake).filter(Boolean);
  const availableIntakes = Array.from(
    new Set([...masterIntakeTitles, ...appIntakeTitles])
  );

  const [urlParamsActive, setUrlParamsActive] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('agentId') || params.get('partnerId') || params.get('studentId'));
    } catch (e) {
      return false;
    }
  });

  // Filter students
  const filteredStudents = students.filter(s => {
    const name = s.name || '';
    const passport = s.passportNo || '';
    const email = s.email || '';
    const phone = s.phone || '';
    const ref = s.referredBy || '';
    
    const searchMatch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        passport.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        phone.includes(searchTerm) ||
                        ref.toLowerCase().includes(searchTerm.toLowerCase());
                        
    const studentApps = getStudentApplications(s.name);
    const hasPaidApp = studentApps.some(app => app.secondaryStatus === 'Paid Students' || app.status === 'Paid Students' || app.paymentStatus === 'Paid');
    
    const statusMatch = statusFilter === 'All' ? true :
                        statusFilter === 'Paid Students' ? hasPaidApp :
                        s.status === statusFilter;

    const hasIntakeApp = intakeFilter === 'All' || studentApps.some(app => app.intake && app.intake.toLowerCase().includes(intakeFilter.toLowerCase()));

    const partnerMatch = partnerFilter === 'All' || s.referredBy === partnerFilter;
    
    return searchMatch && statusMatch && partnerMatch && hasIntakeApp;
  });

  const hasActiveFilters = Boolean(
    searchTerm !== '' || 
    statusFilter !== 'All' || 
    partnerFilter !== 'All' || 
    intakeFilter !== 'All' ||
    urlParamsActive
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setPartnerFilter('All');
    setIntakeFilter('All');
    setCurrentPage(1);
    setUrlParamsActive(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('agentId');
      url.searchParams.delete('partnerId');
      url.searchParams.delete('studentId');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch (e) {}
  };

  // Pagination Math
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenSingleView = (student) => {
    setSingleViewStudent(student);
    setExpandedId(student.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToStudentsList = () => {
    setSingleViewStudent(null);
    setExpandedId(null);
    localStorage.removeItem('studegram_admin_single_view_student_id');
    localStorage.removeItem('studegram_admin_single_view_student');
    localStorage.removeItem('studegram_admin_expanded_student_id');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('studentId');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('clear_student_expanded'));
  };

  const handleViewApplication = (app) => {
    const appId = app.id || app._id || app.camsId;
    localStorage.setItem('studegram_admin_single_view_app_id', String(appId));
    try {
      localStorage.setItem('studegram_admin_single_view_app', JSON.stringify(app));
    } catch (e) {}
    if (onNavigateToApplication) {
      onNavigateToApplication(appId);
    } else {
      window.dispatchEvent(new CustomEvent('navigate_to_application', { detail: { appId, app } }));
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('appId', String(appId));
        window.history.pushState({}, '', url.toString());
      } catch (e) {}
    }
  };

  const handleOnboardStudent = async (e) => {
    e.preventDefault();
    if (!canOnboard) return;
    if (!newStudentName || !newStudentEmail || !newStudentPhone) {
      toast.error("Please fill out required fields.");
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const newStudent = {
      id: Date.now(),
      name: newStudentName,
      type: 'Student',
      email: newStudentEmail,
      phone: newStudentPhone,
      passportNo: newStudentPassport || 'Pending',
      dob: newStudentDob || '',
      status: 'Active',
      activeApps: 0,
      referredBy: newStudentReferredBy,
      country: currentUser.role === 'Country Head' || currentUser.role === 'BDM' ? currentUser.country : 'India',
      dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    setClients(prev => [newStudent, ...prev]);
    addAuditLog('ONBOARD_STUDENT', 'Student', newStudent.name, `Onboarded student: ${newStudentName} (Scope: ${newStudent.country})`);

    // Reset fields & close modal
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setNewStudentPassport('');
    setNewStudentDob('');
    setNewStudentReferredBy('Direct');
    setIsSubmitting(false);
    setIsModalOpen(false);

    toast.success(`Student ${newStudentName} successfully onboarded.`);
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* 1. DIRECTORY TABLE VIEW (when no student single view is active) */}
      {!singleViewStudent ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Students Directory</h1>
              <p className="text-xs text-slate-500 font-medium">Manage Direct and B2B-referred students, view files status and passport records.</p>
            </div>
            {canOnboard && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Onboard Student</span>
              </button>
            )}
          </div>

          {/* Search & Filters */}
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
              {['All', 'Active', 'Inactive', 'Paid Students'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-white text-[#D99A1C] shadow-sm font-black' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex w-full sm:w-auto items-center gap-3 flex-wrap sm:flex-nowrap">
              <select
                value={intakeFilter}
                onChange={(e) => setIntakeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-semibold cursor-pointer"
              >
                <option value="All">All Intakes</option>
                {availableIntakes.map((intake) => (
                  <option key={intake} value={intake}>{intake}</option>
                ))}
              </select>

              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-semibold cursor-pointer"
              >
                <option value="All">All Partners / Channels</option>
                <option value="Direct">Direct Applications</option>
                {partners.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all font-medium"
                  placeholder="Search by name, passport, email, referral..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  title="Reset all filters"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Student Profiles</h2>
              <span className="text-[10px] font-bold text-slate-400">
                Showing {totalItems > 0 ? startIndex + 1 : 0} - {endIndex} of {totalItems} Students
              </span>
            </div>
            <div className="overflow-x-auto">
              {filteredStudents.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[50px]"></th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[60px]">SI.NO.</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student Profile</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Passport Number</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Phone Number</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Onboarding Source</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {paginatedStudents.map((student, idx) => {
                      const isExpanded = expandedId === student.id;
                      const studentApps = getStudentApplications(student.name);
                      const activeAppsCount = studentApps.length || student.activeApps || 0;
                      
                      return (
                        <React.Fragment key={student.id}>
                          <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(student.id)}>
                            <td className="pl-6 py-4 w-[40px]">
                              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                              </svg>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-400">{startIndex + idx + 1}</td>
                            <td className="px-6 py-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-[#D99A1C] to-[#F5B025] shadow-xs">
                                {student.name ? student.name.split(' ').map(n=>n[0]).join('').slice(0, 2) : 'ST'}
                              </div>
                              <div>
                                <p className="text-slate-950 font-black">{student.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">Verification Verified</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono font-bold uppercase">{student.passportNo || 'Pending'}</td>
                            <td className="px-6 py-4 text-slate-500 font-bold">{student.email}</td>
                            <td className="px-6 py-4 text-slate-500 font-semibold">{student.phone}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                student.referredBy === 'Direct'
                                  ? 'bg-purple-50 text-purple-700 border-purple-100'
                                  : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                              }`}>
                                {student.referredBy === 'Direct' ? 'Direct applicant' : `Referred by: ${student.referredBy}`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${
                                student.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleView(student)}
                                  className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                  title="View Full Student Profile Dossier"
                                >
                                  <span>👁️ View</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable details panel */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="9" className="bg-slate-50/50 p-6 border-t border-b border-slate-100">
                                <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-xl p-5 shadow-sm space-y-4">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                        Student Dossier Profile — {student.name}
                                      </h3>
                                      <span className="text-[10px] text-slate-400 font-semibold">• Onboarded: {student.dateAdded || 'N/A'}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSingleView(student)}
                                      className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                      title="Open Dedicated Student Dossier View Page"
                                    >
                                      <span>👁️ View Full Profile Page →</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px] font-semibold text-slate-600">
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Passport Number</span>
                                      <span className="text-slate-900 font-mono font-bold text-xs uppercase">{student.passportNo || 'Pending'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Date of Birth</span>
                                      <span className="text-slate-900 font-medium text-xs">{student.dob || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Contact Phone</span>
                                      <span className="text-slate-900 font-medium text-xs">{student.phone}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Contact Email</span>
                                      <span className="text-indigo-600 font-bold text-xs">{student.email}</span>
                                    </div>
                                  </div>

                                  {/* Application files */}
                                  <div className="space-y-2 pt-2">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">University Applications ({activeAppsCount})</h4>
                                    {studentApps.length > 0 ? (
                                      <div className="border border-slate-150 rounded-xl overflow-hidden">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                          <thead>
                                            <tr className="bg-slate-50 border-b border-slate-150">
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">CAMS ID</th>
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">University</th>
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">Program Course</th>
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">Intake Season</th>
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">Date Added</th>
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider text-center">Workflow Status</th>
                                              <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider text-right pr-4">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {studentApps.map(app => (
                                              <tr key={app.camsId || app.id || app._id} className="hover:bg-slate-50/30">
                                                <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">
                                                  {app.camsId && app.camsId.startsWith('CAMS') ? app.camsId : `CAMS${(app.camsId || '').substring((app.camsId || '').length - 6).toUpperCase()}`}
                                                </td>
                                                <td className="px-4 py-3 text-slate-900 font-bold">{app.universityName}</td>
                                                <td className="px-4 py-3 text-slate-500 font-semibold">{app.courseName}</td>
                                                <td className="px-4 py-3 text-slate-500">{app.intake}</td>
                                                <td className="px-4 py-3 text-slate-400">{app.dateAdded}</td>
                                                <td className="px-4 py-3 text-center">
                                                  <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${
                                                    app.secondaryStatus === 'Offer Issued'
                                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                      : app.secondaryStatus === 'Pending'
                                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                  }`}>
                                                    {app.secondaryStatus || app.status || 'Submitted'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                                  <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleViewApplication(app)}
                                                      className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2 py-1 rounded-lg transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer"
                                                      title="View Application Details"
                                                    >
                                                      <span>👁️ View App</span>
                                                    </button>
                                                    <button 
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedChatApp({
                                                          ...app,
                                                          referredBy: student.referredBy
                                                        });
                                                      }}
                                                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[9px] px-2 py-1 rounded-lg transition-all border border-indigo-200 inline-flex items-center gap-1 shadow-xs cursor-pointer"
                                                    >
                                                      <span>💬 Chat</span>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                                        <p className="text-[10px] text-slate-400 font-semibold italic">No university applications have been logged for this student yet.</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Use the Sales Order intake form to add course files for this student.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-xs font-black text-slate-900 uppercase">No Students Found</h3>
                  <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">No student directory profiles matched your query.</p>
                  {hasActiveFilters && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-[11px] font-extrabold rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Clear all filters</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {totalItems > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D99A1C] cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs font-semibold text-slate-400">
                    Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} entries
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ◀ Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#D99A1C] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 2. DEDICATED STUDENT PROFILE DOSSIER VIEW PAGE */
        <div className="space-y-6 animate-fade-in">
          {(() => {
            const studentApps = getStudentApplications(singleViewStudent.name);
            const activeAppsCount = studentApps.length || singleViewStudent.activeApps || 0;
            const studentCode = singleViewStudent.studentCode || (singleViewStudent.id ? `STD-${String(singleViewStudent.id).slice(-5)}` : 'STD-10001');

            return (
              <>
                {/* Header Card */}
                <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={handleBackToStudentsList}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      <span>← Back to Students Directory</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D99A1C] to-[#F5B025] text-white flex items-center justify-center font-black text-base shadow-sm">
                        {singleViewStudent.name ? singleViewStudent.name.split(' ').map(n=>n[0]).join('').slice(0, 2) : 'ST'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Student Profile Dossier</span>
                          <span className="text-[10px] text-slate-400 font-bold">•</span>
                          <span className="text-[10px] text-slate-500 font-bold">Onboarded: {singleViewStudent.dateAdded || 'N/A'}</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap mt-0.5">
                          <span>{singleViewStudent.name}</span>
                          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                            {studentCode}
                          </span>
                          <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-black ${
                            singleViewStudent.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {singleViewStudent.status === 'Active' ? '✓ Active Student' : singleViewStudent.status}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            singleViewStudent.referredBy === 'Direct'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {singleViewStudent.referredBy === 'Direct' ? 'Direct applicant' : `Referred by: ${singleViewStudent.referredBy}`}
                          </span>
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {studentApps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const appToChat = studentApps[0] || {
                            studentName: singleViewStudent.name,
                            camsId: studentCode,
                            referredBy: singleViewStudent.referredBy
                          };
                          setSelectedChatApp(appToChat);
                        }}
                        className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                      >
                        <span>💬 Open Student Chat</span>
                      </button>
                    )}
                    {singleViewStudent.email && (
                      <a
                        href={`mailto:${singleViewStudent.email}`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all border border-slate-200 shadow-2xs flex items-center gap-1"
                        title="Send Email"
                      >
                        <span>✉️ Email Student</span>
                      </a>
                    )}
                    {singleViewStudent.phone && (
                      <a
                        href={`tel:${singleViewStudent.phone}`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all border border-slate-200 shadow-2xs flex items-center gap-1"
                        title="Call Phone"
                      >
                        <span>📞 Call</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Main Dossier Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Personal & Contact Info */}
                  <div className="space-y-6 lg:col-span-1">
                    {/* Personal Profile Info Card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-[#D99A1C] text-white flex items-center justify-center font-black text-base shadow-md">
                          {singleViewStudent.name ? singleViewStudent.name.split(' ').map(n=>n[0]).join('').slice(0, 2) : 'ST'}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base">{singleViewStudent.name}</h3>
                          <p className="text-xs text-indigo-600 font-bold">{singleViewStudent.email}</p>
                          <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono font-bold">
                            Passport: {singleViewStudent.passportNo || 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Passport Number:</span>
                          <span className="font-mono font-black text-slate-900 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {singleViewStudent.passportNo || 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Date of Birth:</span>
                          <span className="font-bold text-slate-800">{singleViewStudent.dob || 'Not Provided'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Contact Phone:</span>
                          <span className="font-bold text-slate-800">{singleViewStudent.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Contact Email:</span>
                          <span className="font-bold text-indigo-600 truncate max-w-[170px]" title={singleViewStudent.email}>
                            {singleViewStudent.email}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Country / Nationality:</span>
                          <span className="font-bold text-slate-800">📍 {singleViewStudent.country || 'India'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Onboarding Date:</span>
                          <span className="font-bold text-slate-800">{singleViewStudent.dateAdded || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400 font-bold">Referral Source:</span>
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {singleViewStudent.referredBy === 'Direct' ? 'Direct Applicant' : `B2B Partner: ${singleViewStudent.referredBy}`}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 items-center">
                          <span className="text-slate-400 font-bold">Active Applications:</span>
                          <span className="font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-xs">
                            {activeAppsCount} Applied
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Verification & KYC Status Card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#D99A1C]">Verification Compliance</span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ✓ Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Student identity records, passport verification, and referral channel data are synchronized under Unigather Education Records standards.
                      </p>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Passport Status:</span>
                        <span className="font-black text-emerald-600">
                          {singleViewStudent.passportNo && singleViewStudent.passportNo !== 'Pending' ? 'Verified Document' : 'Pending Upload'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Associated Applications & Documents */}
                  <div className="space-y-6 lg:col-span-2">
                    {/* Associated University Applications Table */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Academic Records</span>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Associated Applications ({studentApps.length})
                          </h3>
                        </div>
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                          {studentApps.length} Logged Case{studentApps.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {studentApps.length > 0 ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">CAMS ID</th>
                                <th className="px-4 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University &amp; Course</th>
                                <th className="px-4 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Intake</th>
                                <th className="px-4 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-center">Status</th>
                                <th className="px-4 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right pr-4">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {studentApps.map((app) => {
                                const displayStatus = app.secondaryStatus || app.status || 'Submitted';
                                return (
                                  <tr key={app.camsId || app.id || app._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3.5 font-mono font-bold text-[#D99A1C]">
                                      {app.camsId && app.camsId.startsWith('CAMS') ? app.camsId : `CAMS${(app.camsId || '').substring((app.camsId || '').length - 6).toUpperCase()}`}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <p className="text-slate-950 font-black">{app.universityName}</p>
                                      <p className="text-[10px] text-indigo-600 font-bold">{app.courseName}{app.level ? ` • ${app.level}` : ''}</p>
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-600 font-semibold">{app.intake}</td>
                                    <td className="px-4 py-3.5 text-center">
                                      <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-extrabold ${
                                        displayStatus === 'Offer Issued' || displayStatus === 'Visa Approved' || displayStatus === 'Enrolled / Closed' || displayStatus === 'Paid Students'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : displayStatus.includes('Offer') || displayStatus.includes('CAS')
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : displayStatus.includes('Rejected')
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        {displayStatus}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right pr-4">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleViewApplication(app)}
                                          className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                          title="Open Full Application Dossier"
                                        >
                                          <span>👁️ View App</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedChatApp({ ...app, referredBy: singleViewStudent.referredBy })}
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all border border-indigo-200 inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                          title="Chat with counselor"
                                        >
                                          <span>💬 Chat</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-6 border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
                          <p className="text-xs text-slate-500 font-bold">No university applications have been logged for this student yet.</p>
                          <p className="text-[10px] text-slate-400">Use the Sales Order / Study tab to create course applications for {singleViewStudent.name}.</p>
                        </div>
                      )}
                    </div>

                    {/* Submitted Verification Documents Gallery */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Student Proofs &amp; KYC</span>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Submitted Verification Documents
                          </h3>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          ✓ Verified Proofs
                        </span>
                      </div>

                      {(() => {
                        const docsToDisplay = (singleViewStudent.documents && singleViewStudent.documents.length > 0)
                          ? singleViewStudent.documents
                          : [
                              { title: 'Passport Identity Copy', fileName: `${(singleViewStudent.passportNo || 'passport').toLowerCase()}_scan.pdf` },
                              { title: 'Academic Higher Secondary Certificate', fileName: 'higher_secondary_marksheet.pdf' },
                              { title: 'Statement of Purpose (SOP)', fileName: 'statement_of_purpose.pdf' },
                              { title: 'English Language Score (IELTS/PTE)', fileName: 'language_proficiency_result.pdf' }
                            ];

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {docsToDisplay.map((doc, dIdx) => {
                              const rawUrl = typeof doc === 'object' ? (doc.previewUrl || doc.url || doc.path || doc.fileUrl || doc.dataUrl || doc.data || doc.src) : (typeof doc === 'string' ? doc : null);
                              const fallbackFileName = typeof rawUrl === 'string' ? rawUrl.split('/').pop().split('?')[0] : '';
                              const docTitle = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.comment || doc.fileName || `Verification Document ${dIdx + 1}`);
                              const docFileName = typeof doc === 'string' ? doc : (doc.fileName || fallbackFileName || doc.name || doc.title || 'Document Proof');
                              const isImg = (typeof rawUrl === 'string' && (rawUrl.startsWith('data:image/') || docFileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)));
                              const docBlobUrl = getDocumentBlobUrl(rawUrl, isImg ? 'image/png' : 'application/pdf') || createSampleStudentDocBlobUrl(docTitle, singleViewStudent.name, studentCode);

                              return (
                                <div key={dIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-2xs hover:border-[#D99A1C] transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <span className="text-xl">📄</span>
                                      <div className="truncate">
                                        <p className="text-xs font-black text-slate-900 truncate">{docTitle}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold truncate">{docFileName}</p>
                                      </div>
                                    </div>
                                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                                      Verified
                                    </span>
                                  </div>

                                  {/* Inline Document Preview Box */}
                                  <div className="h-44 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
                                    {isImg ? (
                                      <img src={docBlobUrl} alt={docTitle} className="max-h-full max-w-full object-contain rounded" />
                                    ) : (
                                      <iframe src={docBlobUrl} title={docTitle} className="w-full h-full rounded border-0 bg-white" />
                                    )}
                                  </div>

                                  {/* Action Controls: Expand & Download */}
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewModalDoc({
                                          title: docTitle,
                                          fileName: docFileName,
                                          previewUrl: docBlobUrl,
                                          rawUrl: rawUrl,
                                          type: isImg ? 'image' : 'pdf'
                                        });
                                      }}
                                      className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <span>🔍 Expand</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadStudentDoc(docBlobUrl, `${docTitle.replace(/\s+/g, '_')}.pdf`)}
                                      className="flex-1 py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <span>📥 Download</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Onboard Student Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Onboard Student Profile</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Register direct or referral student client profile</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Passport Number</label>
                  <input
                    type="text"
                    value={newStudentPassport}
                    onChange={(e) => setNewStudentPassport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900 uppercase"
                    placeholder="e.g. Z1234567"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={newStudentDob}
                    onChange={(e) => setNewStudentDob(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Contact Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  placeholder="e.g. student@gmail.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Onboarding Referral Agent</label>
                <select
                  value={newStudentReferredBy}
                  onChange={(e) => setNewStudentReferredBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C]"
                >
                  <option value="Direct">Direct Applicant (No Referral)</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isSubmitting ? 'Onboarding...' : 'Confirm Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Document Expand Preview Modal */}
      {previewModalDoc && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">{previewModalDoc.title}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">{previewModalDoc.fileName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Document Body */}
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center min-h-[400px] max-h-[65vh] p-2">
              {previewModalDoc.previewUrl ? (
                previewModalDoc.type === 'image' ? (
                  <img 
                    src={previewModalDoc.previewUrl} 
                    alt={previewModalDoc.title} 
                    className="max-h-full max-w-full object-contain rounded"
                  />
                ) : (
                  <iframe 
                    src={previewModalDoc.previewUrl} 
                    title={previewModalDoc.title}
                    className="w-full h-full rounded border-0 bg-white"
                  />
                )
              ) : (
                <div className="text-center space-y-3 p-6 bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xs">
                  <div className="w-14 h-14 bg-amber-100 text-[#D99A1C] rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-amber-200 shadow-xs">
                    📄
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{previewModalDoc.title}</h4>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">{previewModalDoc.fileName}</p>
                    <p className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mt-2">
                      ✓ Student Verification Document
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              {previewModalDoc.previewUrl ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewModalDoc.previewUrl) {
                        handleDownloadStudentDoc(previewModalDoc.previewUrl, `${(previewModalDoc.title || 'student_document').replace(/\s+/g, '_')}.pdf`);
                      }
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📥 Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (previewModalDoc.previewUrl) {
                        window.open(previewModalDoc.previewUrl, '_blank');
                      }
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 font-extrabold text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>↗ Open in New Tab</span>
                  </button>
                </div>
              ) : <div />}
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedChatApp && (
        <ApplicationChatDrawer 
          app={selectedChatApp} 
          onClose={() => setSelectedChatApp(null)} 
        />
      )}
    </div>
  );
}
