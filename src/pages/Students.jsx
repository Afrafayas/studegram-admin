import SearchableSelect from '../components/SearchableSelect';
import ValidatedInput from '../components/ValidatedInput';
import { getDisplayId } from '../utils/displayId';
import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import ApplicationChatDrawer from '../components/ApplicationChatDrawer';
import { useToast } from '../context/ToastContext';
import API from '../api/axios';
import { resolveDocumentUrl, documentFileName, downloadApplicationDocument } from '../utils/applicationDocuments';

export default function Students({ clients = [], setClients, applications = [], intakes = [], initialSelectedStudentId = null, onNavigateToApplication }) {
  const toast = useToast();
  const { currentUser, addAuditLog } = useAuth();
  const handleDownloadStudentDoc = async (url, fileName) => {
    try {
      await downloadApplicationDocument(url, fileName);
    } catch (error) {
      toast.error(error.message || 'Unable to download the uploaded document.');
    }
  };
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

  // Find linked applications for a specific student
  const getStudentApplications = (student) => {
    if (!student) return [];
    const sName = typeof student === 'string' ? student : student.name;
    const sId = typeof student === 'object' ? String(student.id || student._id || '') : '';
    const cleanName = (sName || '').trim().toLowerCase();

    return (applications || []).filter(app => {
      if (sId) {
        const appStudentId = String(app.student?._id || app.student?.id || app.studentId || (typeof app.student === 'string' ? app.student : ''));
        if (appStudentId) return appStudentId === sId;
      }
      if (cleanName) {
        const aName = (app.studentName || app.student?.name || '').trim().toLowerCase();
        if (aName === cleanName) return true;
      }
      return false;
    });
  };

  // Email Student Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetStudent, setEmailTargetStudent] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailErrorNotice, setEmailErrorNotice] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isEmailModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSendingEmail) {
        setIsEmailModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmailModalOpen, isSendingEmail]);

  const handleOpenEmailModal = (student) => {
    const target = student || singleViewStudent;
    if (!target) return;

    const apps = getStudentApplications(target);
    const primaryApp = apps[0];
    const stdCode = getDisplayId(target);

    setEmailTargetStudent(target);
    setEmailErrorNotice('');

    let subject = `Application & Admission Update - Unigather`;
    if (primaryApp && (primaryApp.universityName || primaryApp.university)) {
      const uName = primaryApp.universityName || primaryApp.university;
      subject = `Admission Update: ${uName} (${stdCode || target.name})`;
    } else if (stdCode) {
      subject = `Unigather Admission Portfolio Update [${stdCode}]`;
    }
    setEmailSubject(subject);

    let messageBody = `Dear ${target.name || 'Student'},

We are contacting you from the Unigather Admissions & Operations team regarding your documentation and university application portfolio.`;

    if (primaryApp) {
      const uName = primaryApp.universityName || primaryApp.university || 'Target University';
      const cName = primaryApp.courseName || primaryApp.course || 'Academic Program';
      const cams = primaryApp.camsId ? ` (Application ID: ${primaryApp.camsId})` : '';
      const intake = primaryApp.intake ? ` for ${primaryApp.intake}` : '';
      messageBody += `

Regarding your application to ${uName} — ${cName}${cams}${intake}:
• Current Status: ${primaryApp.status || 'Under Review'}
• Portfolio Reference: ${stdCode || 'Registered Student'}`;
    }

    messageBody += `

Please let us know if you have any questions or require guidance with your admissions dossier.

Best regards,
Unigather Administration Team
support@unigather.app`;

    setEmailMessage(messageBody);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (e) => {
    e?.preventDefault();
    if (!emailTargetStudent?.email) {
      toast.error('Recipient email address is missing.');
      return;
    }
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Subject and message body cannot be empty.');
      return;
    }

    setIsSendingEmail(true);
    setEmailErrorNotice('');
    try {
      const res = await API.post('/mail/send', {
        name: emailTargetStudent.name || 'Student',
        email: emailTargetStudent.email.trim(),
        subject: emailSubject.trim(),
        message: emailMessage.trim()
      });

      addAuditLog?.('EMAIL_STUDENT', 'Student', emailTargetStudent.id || emailTargetStudent._id, `Sent email to ${emailTargetStudent.name} (${emailTargetStudent.email})`);
      toast.success(res.data?.message || `Email successfully dispatched to ${emailTargetStudent.email}!`);
      setIsEmailModalOpen(false);
    } catch (err) {
      console.warn('Backend mail API failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Direct mail service unavailable';
      setEmailErrorNotice(errMsg);
      toast.error(`Direct dispatch could not complete: ${errMsg}. You can click 'Open in Gmail' below to send immediately.`);
    } finally {
      setIsSendingEmail(false);
    }
  };

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
          window.history.pushState({ studentView: String(studentId) }, '', url.toString());
        }
      } catch (e) {}
    } else {
      localStorage.removeItem('studegram_admin_single_view_student_id');
      localStorage.removeItem('studegram_admin_single_view_student');
      localStorage.removeItem('studegram_admin_expanded_student_id');
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('studentId')) {
          url.searchParams.delete('studentId');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
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
                        
    const studentApps = getStudentApplications(s);
    const hasPaidApp = studentApps.some(app => app.secondaryStatus === 'Paid Students' || app.status === 'Paid Students' || app.paymentStatus === 'Paid');
    
    const statusMatch = statusFilter === 'All' ? true :
                        statusFilter === 'Paid Students' ? hasPaidApp :
                        s.status === statusFilter;

    const hasIntakeApp = intakeFilter === 'All' || studentApps.some(app => app.intake && app.intake.toLowerCase().includes(intakeFilter.toLowerCase()));

    let partnerMatch = true;
    if (partnerFilter !== 'All') {
      if (partnerFilter === 'Direct') {
        const isStudentDirect = (s.referredBy || '').toLowerCase() === 'direct';
        const hasDirectApp = studentApps.length > 0 && studentApps.some(app => 
          !app.partner || app.partnerName === 'Direct' || app.partnerCompanyName === 'Direct' || app.assignedBdm === 'Direct'
        );
        const hasNoAgentApp = studentApps.every(app => 
          !app.partner || app.partnerName === 'Direct' || app.partnerCompanyName === 'Direct' || app.assignedBdm === 'Direct'
        );
        partnerMatch = isStudentDirect || (!s.partner && (s.referredBy || '').toLowerCase() !== 'agent' && hasNoAgentApp) || hasDirectApp;
      } else {
        const pf = partnerFilter.toLowerCase().trim();
        const sRef = (s.referredBy || '').toLowerCase().trim();
        const sPartnerId = String(s.partner?._id || s.partner?.id || s.partner || '').toLowerCase().trim();
        const sPartnerName = (s.partner?.name || s.partnerName || '').toLowerCase().trim();
        const sPartnerCompany = (s.partner?.companyName || s.partnerCompanyName || '').toLowerCase().trim();

        const matchedP = partners.find(p => 
          (p.name && p.name.toLowerCase().trim() === pf) ||
          (p.companyName && p.companyName.toLowerCase().trim() === pf) ||
          String(p.id || p._id || '').toLowerCase().trim() === pf
        );

        const targetIds = [pf, String(matchedP?.id || matchedP?._id || '').toLowerCase().trim()].filter(Boolean);
        const targetNames = [
          pf,
          matchedP?.name?.toLowerCase()?.trim(),
          matchedP?.companyName?.toLowerCase()?.trim()
        ].filter(Boolean);

        const studentDirectMatch = targetIds.includes(sPartnerId) ||
          targetNames.includes(sRef) ||
          targetNames.includes(sPartnerName) ||
          targetNames.includes(sPartnerCompany);

        const appPartnerMatch = studentApps.some(app => {
          const appPId = String(app.partner?._id || app.partner?.id || (typeof app.partner === 'string' && app.partner.match(/^[0-9a-fA-F]{24}$/) ? app.partner : '')).toLowerCase().trim();
          const appPName = (app.partnerName || app.partner?.name || (typeof app.partner === 'string' ? app.partner : '')).toLowerCase().trim();
          const appPCompany = (app.partnerCompanyName || app.partner?.companyName || app.assignedBdm || '').toLowerCase().trim();

          return targetIds.includes(appPId) ||
            targetNames.some(tn => tn && (appPName === tn || appPCompany === tn || appPName.includes(tn) || appPCompany.includes(tn) || tn.includes(appPName) || tn.includes(appPCompany)));
        });

        partnerMatch = studentDirectMatch || appPartnerMatch;
      }
    }
    
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


    try {
    const response = await API.post('/students', {
      name: newStudentName, email: newStudentEmail, phone: newStudentPhone,
      passportNo: newStudentPassport, dob: newStudentDob, referredBy: newStudentReferredBy
    });
    if (!response.data?.success) throw new Error(response.data?.message || 'Unable to create student.');
    const savedStudent = response.data.data;
    const newStudent = {
      ...savedStudent,
      id: savedStudent._id,
      type: 'Student',
      activeApps: 0,
      country: savedStudent.country || '',
      dateAdded: savedStudent.createdAt ? new Date(savedStudent.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
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
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F0F2F5]">
      {/* 1. DIRECTORY TABLE VIEW (when no student single view is active) */}
      {!singleViewStudent ? (
        <>
          {/* Header */}
          <div className="flex flex-wrap gap-3 justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Students Directory</h1>
              <p className="text-xs text-slate-500 font-medium">Manage Direct and B2B-referred students, view files status and passport records.</p>
            </div>
            {canOnboard && (
              <ActionButton
                onClick={() => setIsModalOpen(true)}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Onboard Student</span>
              </ActionButton>
            )}
          </div>

          {/* Search & Filters */}
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:flex-wrap gap-4 items-center justify-between">
            <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
              {['All', /* 'Active', 'Inactive', */ 'Paid Students'].map((status) => (
                <ActionButton
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-white text-[#D99A1C] shadow-sm font-black' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status}
                </ActionButton>
              ))}
            </div>

            <div className="flex min-w-0 w-full sm:w-auto items-center gap-3 flex-wrap">
              <SearchableSelect
                value={intakeFilter}
                onChange={(e) => setIntakeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-semibold cursor-pointer"
              >
                <option value="All">All Intakes</option>
                {availableIntakes.map((intake) => (
                  <option key={intake} value={intake}>{intake}</option>
                ))}
              </SearchableSelect>

              <SearchableSelect
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-semibold cursor-pointer"
              >
                <option value="All">All Partners / Channels</option>
                <option value="Direct">Direct Applications</option>
                {partners.map(p => {
                  const displayName = p.companyName && p.companyName !== p.name
                    ? `${p.companyName} (${p.name})`
                    : (p.companyName || p.name || 'Partner');
                  const optionVal = p.companyName || p.name;
                  return (
                    <option key={p.id || p._id} value={optionVal}>{displayName}</option>
                  );
                })}
              </SearchableSelect>

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
                  <ActionButton
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </ActionButton>
                )}
              </div>

              <ActionButton
                type="button"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs ${
                  hasActiveFilters
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
                title={hasActiveFilters ? "Reset all active filters" : "No filters applied"}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset Filters</span>
              </ActionButton>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Student Profiles</h2>
            </div>
            <div className="overflow-x-auto">
              {filteredStudents.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
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
                      return (
                        <tr 
                          key={student.id} 
                          className="hover:bg-amber-50/40 transition-colors cursor-pointer group" 
                          onClick={() => handleOpenSingleView(student)}
                        >
                          <td className="px-6 py-4 font-bold text-slate-400">{startIndex + idx + 1}</td>
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-[#D99A1C] to-[#F5B025] shadow-xs">
                              {student.name ? student.name.split(' ').map(n=>n[0]).join('').slice(0, 2) : 'ST'}
                            </div>
                            <div>
                              <p className="text-slate-950 font-black group-hover:text-[#D99A1C] transition-colors">{student.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">Student record</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono font-bold uppercase">{student.passportNo || 'Pending'}</td>
                          <td className="px-6 py-4 text-slate-500 font-bold">{student.email}</td>
                          <td className="px-6 py-4 text-slate-500 font-semibold">{student.phone}</td>
                          <td className="px-6 py-4">
                            {(() => {
                              const sApps = getStudentApplications(student);
                              const linkedPartnerApp = sApps.find(a => a.partnerCompanyName || a.partner?.companyName || a.partnerName || a.partner?.name);
                              const partnerLabel = linkedPartnerApp?.partnerCompanyName ||
                                linkedPartnerApp?.partner?.companyName ||
                                linkedPartnerApp?.partnerName ||
                                linkedPartnerApp?.partner?.name ||
                                (partners.find(p => String(p.id || p._id) === String(student.partner))?.companyName) ||
                                (student.referredBy && student.referredBy !== 'Agent' ? student.referredBy : 'Partner Agency');
                              const isDirect = (student.referredBy === 'Direct' && !linkedPartnerApp?.partner);

                              return (
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                  isDirect
                                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                                    : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                                }`}>
                                  {isDirect ? 'Direct applicant' : `Referred by: ${partnerLabel}`}
                                </span>
                              );
                            })()}
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
                              <ActionButton
                                type="button"
                                onClick={() => handleOpenSingleView(student)}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                title="View Full Student Profile Dossier"
                              >
                                <span>👁️ View</span>
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
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
                      <ActionButton
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-[11px] font-extrabold rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Clear all filters</span>
                      </ActionButton>
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
                  <SearchableSelect
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
                  </SearchableSelect>
                </div>

                <div className="flex items-center gap-1.5">
                  <ActionButton
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ◀ Prev
                  </ActionButton>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <ActionButton
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#D99A1C] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </ActionButton>
                  ))}

                  <ActionButton
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Next ▶
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 2. DEDICATED STUDENT PROFILE DOSSIER VIEW PAGE */
        <div className="space-y-6 animate-fade-in">
          {(() => {
            const studentApps = getStudentApplications(singleViewStudent);
            const activeAppsCount = studentApps.length || singleViewStudent.activeApps || 0;
            const studentCode = singleViewStudent.studentCode || singleViewStudent.id || singleViewStudent._id || 'Not assigned';

            return (
              <>
                {/* Header Card */}
                <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <ActionButton
                      type="button"
                      onClick={handleBackToStudentsList}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      <span>← Back to Students Directory</span>
                    </ActionButton>

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
                      <ActionButton
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
                      </ActionButton>
                    )}
                    {singleViewStudent.email && (
                      <ActionButton
                        type="button"
                        onClick={() => handleOpenEmailModal(singleViewStudent)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-[#D99A1C] hover:from-amber-600 hover:to-[#b88214] text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        title={`Send Email to ${singleViewStudent.email}`}
                      >
                        <span>✉️ Email Student</span>
                      </ActionButton>
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
                          <span className="font-bold text-slate-800">📍 {singleViewStudent.country || 'Not provided'}</span>
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

                    {/* Verification & KYC Status Card: hidden until a verification workflow records these statuses.
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#D99A1C]">Verification Compliance</span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {singleViewStudent.verificationStatus || 'Not verified'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Verification status is shown when recorded for this student.
                      </p>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Passport Status:</span>
                        <span className="font-black text-emerald-600">
                          {singleViewStudent.passportVerificationStatus || 'Not verified'}
                        </span>
                      </div>
                    </div>
                    */}
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
                        <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Application ID</th>
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
                                      {getDisplayId(app)}
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
                                        <ActionButton
                                          type="button"
                                          onClick={() => handleViewApplication(app)}
                                          className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                          title="Open Full Application Dossier"
                                        >
                                          <span>👁️ View App</span>
                                        </ActionButton>
                                        <ActionButton
                                          type="button"
                                          onClick={() => setSelectedChatApp({ ...app, referredBy: singleViewStudent.referredBy })}
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all border border-indigo-200 inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                          title="Chat with counselor"
                                        >
                                          <span>💬 Chat</span>
                                        </ActionButton>
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

                      </div>

                      {(() => {
                        const uploadedDocs = [
                          ...(Array.isArray(singleViewStudent.documents) ? singleViewStudent.documents : []),
                          ...getStudentApplications(singleViewStudent).flatMap(app => Array.isArray(app.documents) ? app.documents : [])
                        ];
                        const seenUrls = new Set();
                        const docsToDisplay = uploadedDocs.filter(doc => {
                          const source = typeof doc === 'string' ? doc : (doc?.url || doc?.fileUrl || doc?.path || doc?.dataUrl || doc?.data || doc?.src || doc?.previewUrl);
                          const url = resolveDocumentUrl(source);
                          if (!url || seenUrls.has(url)) return false;
                          seenUrls.add(url);
                          return true;
                        });
                        if (!docsToDisplay.length) {
                          return <p className="text-xs text-slate-500 py-4">No documents uploaded yet.</p>;
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {docsToDisplay.map((doc, dIdx) => {
                              const rawUrl = typeof doc === 'string' ? doc : (doc.url || doc.fileUrl || doc.path || doc.dataUrl || doc.data || doc.src || doc.previewUrl);
                              const docBlobUrl = resolveDocumentUrl(rawUrl);
                              const docFileName = documentFileName(typeof doc === 'object' ? { ...doc, fileName: doc.fileName || doc.originalName || doc.name } : doc, docBlobUrl);
                              const docTitle = doc.fileName || doc.originalName || doc.name || doc.title || docFileName;
                              const isImg = /^data:image\//i.test(docBlobUrl) || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(docFileName);

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
                                    <ActionButton
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
                                    </ActionButton>
                                    <ActionButton
                                      type="button"
                                      onClick={() => handleDownloadStudentDoc(rawUrl, docFileName)}
                                      className="flex-1 py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <span>📥 Download</span>
                                    </ActionButton>
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
              <ActionButton
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleOnboardStudent} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Passport Number</label>
                  <ValidatedInput validationKind="passport"
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
                <ValidatedInput validationKind="phone"
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
                <SearchableSelect
                  value={newStudentReferredBy}
                  onChange={(e) => setNewStudentReferredBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C]"
                >
                  <option value="Direct">Direct Applicant (No Referral)</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <ActionButton
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </ActionButton>
                <ActionButton
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
                </ActionButton>
              </div>
            </ActionForm>
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
              <ActionButton
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ActionButton>
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
                  <ActionButton
                    type="button"
                    onClick={() => {
                      if (previewModalDoc.previewUrl) {
                        handleDownloadStudentDoc(previewModalDoc.rawUrl || previewModalDoc.previewUrl, previewModalDoc.fileName);
                      }
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📥 Download</span>
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => {
                      if (previewModalDoc.previewUrl) {
                        window.open(previewModalDoc.previewUrl, '_blank');
                      }
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 hover:bg-amber-100 text-[#D99A1C] border border-amber-200 font-extrabold text-[11px] sm:text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>↗ Open in New Tab</span>
                  </ActionButton>
                </div>
              ) : <div />}
              <ActionButton
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Preview
              </ActionButton>
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

      {/* Email Student Modal Portal */}
      {isEmailModalOpen && emailTargetStudent && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSendingEmail) {
              setIsEmailModalOpen(false);
            }
          }}
        >
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Student Communications</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Compose Email to Student</h3>
                <p className="text-[10.5px] text-slate-400 font-semibold">Directly dispatch official updates to student's inbox</p>
              </div>
              <ActionButton
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                ✕
              </ActionButton>
            </div>

            {/* Recipient Details Chip */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-[#D99A1C] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {emailTargetStudent.name ? emailTargetStudent.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">{emailTargetStudent.name}</p>
                  <p className="text-[11px] font-mono font-bold text-indigo-600">{emailTargetStudent.email}</p>
                </div>
              </div>
              {emailTargetStudent.phone && (
                <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {emailTargetStudent.phone}
                </span>
              )}
            </div>

            {/* Error / Fallback Banner if direct API had an issue */}
            {emailErrorNotice && (
              <div className="bg-amber-50 border border-amber-200/90 text-amber-900 rounded-2xl p-3 text-xs flex items-start gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="font-extrabold text-[11px] text-amber-950 uppercase tracking-wide">Direct Delivery Issue</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {emailErrorNotice}. You can click <strong>"↗ Open in Gmail"</strong> below to send directly with your customized message preserved.
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <ActionForm onSubmit={handleSendEmail} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-900 select-text"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Email Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="7"
                  required
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Type message content here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-900 resize-none font-sans leading-relaxed select-text"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-2 justify-between items-center">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <ActionButton
                    type="button"
                    onClick={() => {
                      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTargetStudent.email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`;
                      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Compose directly in Gmail web application"
                  >
                    <span>↗ Open in Gmail</span>
                  </ActionButton>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <ActionButton
                    type="button"
                    disabled={isSendingEmail}
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-[#D99A1C] hover:from-amber-600 hover:to-[#b88214] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <span>✉️ Send Email</span>
                      </>
                    )}
                  </ActionButton>
                </div>
              </div>
            </ActionForm>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
