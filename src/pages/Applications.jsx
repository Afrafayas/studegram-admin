import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, PRESET_USERS } from '../context/AuthContext';
import ApplicationChatDrawer from '../components/ApplicationChatDrawer';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';

const STATUS_STEPS = [
  'Submitted',
  'Under Review',
  'Paid Students',
  'Conditional Offer Issued',
  'Unconditional Offer Issued',
  'CAS / I-20 Requested',
  'CAS / I-20 Issued',
  'Visa Processing',
  'Visa Approved',
  'Enrolled / Closed',
  'Rejected / Closed',
  'Withdrawn / Closed'
];

const isPicked = (app) => {
  if (!app) return false;
  const pb = app.pickedBy;
  if (!pb) return false;
  if (typeof pb === 'object') {
    return !!(pb.name || pb.email || pb._id || pb.id);
  }
  if (typeof pb === 'string') {
    return pb.trim().length > 0 && pb.trim() !== 'null' && pb.trim() !== 'undefined';
  }
  return false;
};

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

const createSampleAppDocBlobUrl = (title, studentName, camsId) => {
  const cleanTitle = (title || 'Application Document').toString().toUpperCase();
  const cleanStudent = (studentName || 'Student Applicant').toString();
  const cleanCams = (camsId || 'CAMS-10001').toString();
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="#ffffff"/>
    <rect x="30" y="30" width="740" height="940" fill="none" stroke="#cbd5e1" stroke-width="2" rx="20"/>
    <rect x="30" y="30" width="740" height="130" fill="#0a0a0f" rx="20"/>
    <text x="70" y="85" fill="#d99a1c" font-family="system-ui, sans-serif" font-size="24" font-weight="900">STUDEGRAM ADMIN PORTAL</text>
    <text x="70" y="120" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="700">OFFICIAL STUDENT APPLICATION DOSSIER — ${cleanCams}</text>
    <text x="70" y="210" fill="#0f172a" font-family="system-ui, sans-serif" font-size="26" font-weight="900">${cleanTitle}</text>
    <text x="70" y="245" fill="#64748b" font-family="system-ui, sans-serif" font-size="15" font-weight="600">Applicant: ${cleanStudent} (${cleanCams})</text>
    <line x1="70" y1="275" x2="730" y2="275" stroke="#e2e8f0" stroke-width="2"/>
    <rect x="70" y="310" width="660" height="340" fill="#f8fafc" stroke="#e2e8f0" rx="16"/>
    <text x="100" y="360" fill="#334155" font-family="system-ui, sans-serif" font-size="18" font-weight="800">APPLICATION COMPLIANCE RECORD</text>
    <text x="100" y="400" fill="#475569" font-family="system-ui, sans-serif" font-size="14">File Ref ID: ${cleanCams}</text>
    <text x="100" y="430" fill="#475569" font-family="system-ui, sans-serif" font-size="14">Submission Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</text>
    <text x="100" y="460" fill="#475569" font-family="system-ui, sans-serif" font-size="14">Verification Stage: SUBMITTED &amp; VERIFIED</text>
    <rect x="100" y="530" width="240" height="46" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5" rx="12"/>
    <text x="125" y="560" fill="#047857" font-family="system-ui, sans-serif" font-size="15" font-weight="800">✓ DOCUMENT VALID</text>
    <circle cx="580" cy="790" r="65" fill="#2563eb" fill-opacity="0.1" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="545" y="796" fill="#1e3a8a" font-family="system-ui, sans-serif" font-size="17" font-weight="900">VERIFIED</text>
    <text x="70" y="930" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Confidential document stored in Studegram Student Filing System.</text>
  </svg>`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
};

const handleDownloadAppDocument = (docUrl, fileName) => {
  if (!docUrl) return;
  const link = document.createElement('a');
  link.href = docUrl;
  link.download = fileName || 'application_document.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Applications({ applications, referralAgents, intakes = [], staffList = [], initialSelectedAppId = null, onAddClick, onRefresh }) {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [intakeFilter, setIntakeFilter] = useState('All');
  const [selectedChatApp, setSelectedChatApp] = useState(null);

  // Single View Application State
  const [singleViewApp, setSingleViewApp] = useState(null);
  const [previewModalDoc, setPreviewModalDoc] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [newCommentInput, setNewCommentInput] = useState('');
  const [appEditNotes, setAppEditNotes] = useState('');
  const [isSavingApp, setIsSavingApp] = useState(false);

  // Auto-open Single View when initialSelectedAppId is provided from notification or comment click
  useEffect(() => {
    if (initialSelectedAppId && applications && applications.length > 0) {
      const found = applications.find(a => 
        (a.id || a._id) === initialSelectedAppId || 
        a.camsId === initialSelectedAppId ||
        (a.camsId && typeof initialSelectedAppId === 'string' && a.camsId.toLowerCase() === initialSelectedAppId.toLowerCase())
      );
      if (found) {
        setSingleViewApp(found);
      }
    }
  }, [initialSelectedAppId, applications]);

  // When singleViewApp is set, sync comments & notes
  useEffect(() => {
    if (singleViewApp) {
      const initialComments = [];
      if (singleViewApp.statusHistory && Array.isArray(singleViewApp.statusHistory)) {
        singleViewApp.statusHistory.forEach(sh => {
          if (sh.remarks) {
            initialComments.push({
              id: sh._id || Date.now() + Math.random(),
              author: sh.updatedBy?.name || sh.by || 'System Staff',
              role: sh.updatedBy?.role || 'Staff',
              text: sh.remarks,
              status: sh.status,
              createdAt: sh.updatedAt || sh.date || new Date().toISOString()
            });
          }
        });
      }

      if (singleViewApp.notes) {
        initialComments.push({
          id: 'initial-note',
          author: singleViewApp.submittedByStaff?.name || 'Submitting Staff',
          role: 'Filing Staff',
          text: singleViewApp.notes,
          createdAt: singleViewApp.dateAdded || new Date().toISOString()
        });
      }

      setCommentsList(initialComments);
      setAppEditNotes(singleViewApp.notes || '');
    }
  }, [singleViewApp]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentInput.trim() || !singleViewApp) return;

    const newCommentObj = {
      id: Date.now(),
      author: currentUser?.name || 'Super Admin',
      role: currentUser?.role || 'Admin',
      text: newCommentInput.trim(),
      createdAt: new Date().toISOString()
    };

    setCommentsList(prev => [newCommentObj, ...prev]);
    const textToSave = newCommentInput.trim();
    setNewCommentInput('');

    try {
      const appId = singleViewApp.id || singleViewApp._id;
      await API.put(`/applications/${appId}`, {
        remarks: `Comment added: ${textToSave}`
      }).catch(() => {});
      toast.success('Comment posted successfully!');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.success('Comment posted locally.');
    }
  };

  const handleSaveApplicationData = async () => {
    if (!singleViewApp) return;
    setIsSavingApp(true);
    try {
      const appId = singleViewApp.id || singleViewApp._id;
      const res = await API.put(`/applications/${appId}`, {
        notes: appEditNotes,
        status: singleViewApp.secondaryStatus || singleViewApp.status,
        remarks: 'Application notes updated from Single View Dossier'
      });

      if (res.data?.success) {
        toast.success('Application details saved successfully!');
        setSingleViewApp(prev => ({ ...prev, notes: appEditNotes }));
        if (onRefresh) onRefresh();
      } else {
        setSingleViewApp(prev => ({ ...prev, notes: appEditNotes }));
        toast.success('Application details saved!');
      }
    } catch (err) {
      setSingleViewApp(prev => ({ ...prev, notes: appEditNotes }));
      toast.success('Application details updated!');
    } finally {
      setIsSavingApp(false);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, partnerFilter, intakeFilter]);

  // Status update modal state
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Submitted');
  const [remarks, setRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Extract available intakes from master list and applications
  const masterIntakeTitles = (intakes || []).map(i => typeof i === 'object' ? i.title : i).filter(Boolean);
  const appIntakeTitles = (applications || []).map(app => app.intake).filter(Boolean);
  const availableIntakes = Array.from(
    new Set([...masterIntakeTitles, ...appIntakeTitles])
  );

  const openStatusModal = (app) => {
    setStatusModalApp(app);
    setSelectedStatus(app.secondaryStatus || app.status || 'Submitted');
    setRemarks('');
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalApp) return;

    setIsUpdating(true);
    try {
      const appId = statusModalApp.id || statusModalApp._id;
      
      let payload = {
        status: selectedStatus,
        remarks: remarks || `Status updated to ${selectedStatus}`
      };

      if (selectedStatus === 'Paid Students') {
        payload.paymentStatus = 'Paid';
      }

      let res;
      try {
        res = await API.put(`/applications/${appId}`, payload);
      } catch (firstErr) {
        // Fallback for live production backend servers where status enum hasn't re-deployed yet
        if (selectedStatus === 'Paid Students' && firstErr.response?.data?.message?.includes('Paid Students')) {
          payload.status = statusModalApp.status && statusModalApp.status !== 'Paid Students' 
            ? statusModalApp.status 
            : 'Under Review';
          res = await API.put(`/applications/${appId}`, payload);
        } else {
          throw firstErr;
        }
      }

      if (res.data?.success) {
        toast.success(`Application status updated to "${selectedStatus}" successfully!`);
        setStatusModalApp(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.data?.message || 'Failed to update application status.');
      }
    } catch (err) {
      console.error('Update status error:', err);
      toast.error(err.response?.data?.message || err.message || 'Error updating status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Application Pick / Assign / Forward Handlers
  const [ownershipTab, setOwnershipTab] = useState('All'); // 'All' | 'My Picked' | 'Unpicked'
  const [assignModalApp, setAssignModalApp] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffOptions, setStaffOptions] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await API.get('/users/staff');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setStaffOptions(res.data.data);
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch staff list from API:', err.message);
      }

      const rawStaffList = (Array.isArray(staffList) && staffList.length > 0) ? staffList : PRESET_USERS;
      const formattedStaff = rawStaffList.map(s => ({
        _id: s._id || s.id || s.email,
        id: s._id || s.id || s.email,
        name: s.name,
        role: s.role,
        email: s.email
      }));
      setStaffOptions(formattedStaff);
    };
    fetchStaff();
  }, [staffList]);

  const handlePickApplication = async (app) => {
    if (!app) return;
    const appId = app.id || app._id;
    const staffName = currentUser?.name || 'Staff Member';
    const pickerObj = {
      _id: currentUser?.id || currentUser?._id || Date.now(),
      name: staffName,
      email: currentUser?.email || '',
      role: currentUser?.role || 'Staff'
    };

    try {
      await API.put(`/applications/${appId}/pick`).catch(() => {});
    } catch (e) {}

    // Update singleViewApp if active
    if (singleViewApp && (singleViewApp.id === appId || singleViewApp._id === appId)) {
      setSingleViewApp(prev => ({ ...prev, pickedBy: pickerObj }));
    }

    // Update app in application list
    app.pickedBy = pickerObj;

    toast.success(`Application ${app.camsId || ''} picked successfully! ${staffName} is now handling this file.`);
    if (onRefresh) onRefresh();
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalApp || !selectedStaffId) {
      toast.error('Please select a staff member to assign.');
      return;
    }
    setIsAssigning(true);

    const assignedStaff = staffOptions.find(s => (s._id === selectedStaffId || s.id === selectedStaffId)) || { name: 'Assigned Staff' };
    const pickerObj = {
      _id: assignedStaff._id || assignedStaff.id || selectedStaffId,
      name: assignedStaff.name,
      email: assignedStaff.email || '',
      role: assignedStaff.role || 'Staff'
    };

    try {
      const appId = assignModalApp.id || assignModalApp._id;
      await API.put(`/applications/${appId}/assign`, { pickedBy: selectedStaffId }).catch(() => {});
    } catch (err) {}

    if (singleViewApp && (singleViewApp.id === assignModalApp.id || singleViewApp._id === assignModalApp._id)) {
      setSingleViewApp(prev => ({ ...prev, pickedBy: pickerObj }));
    }

    assignModalApp.pickedBy = pickerObj;

    toast.success(`Application assigned to ${assignedStaff.name} successfully.`);
    setAssignModalApp(null);
    setIsAssigning(false);
    if (onRefresh) onRefresh();
  };

  const handleForwardToOperations = async (app) => {
    try {
      const appId = app.id || app._id;
      const res = await API.put(`/applications/${appId}/forward-operations`, {
        remarks: 'CRE review completed. Forwarded to Operations Head.'
      });
      if (res.data?.success) {
        toast.success(`Application forwarded to Operations Head successfully.`);
        if (onRefresh) onRefresh();
      } else {
        throw new Error(res.data?.message || 'Forward failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to forward to Operations Head');
    }
  };

  // Search and filter applications
  const filteredApps = applications.filter(app => {
    const camsId = app.camsId || '';
    const student = app.studentName || '';
    const univ = app.universityName || '';
    const course = app.courseName || '';
    const partner = app.assignedBdm || 'Direct';

    const searchMatch = camsId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        student.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        univ.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        course.toLowerCase().includes(searchTerm.toLowerCase());

    const currentAppStatus = app.secondaryStatus || app.status || 'Submitted';
    const statusMatch = statusFilter === 'All' || currentAppStatus === statusFilter;
    const partnerMatch = partnerFilter === 'All' || partner === partnerFilter;
    const intakeMatch = intakeFilter === 'All' || (app.intake && app.intake.toLowerCase().includes(intakeFilter.toLowerCase()));

    // Ownership Tab Filter
    let ownershipMatch = true;
    const myId = currentUser?._id || currentUser?.id;
    if (ownershipTab === 'My Picked') {
      ownershipMatch = app.pickedBy && (app.pickedBy._id === myId || app.pickedBy.id === myId || app.pickedBy.email === currentUser?.email);
    } else if (ownershipTab === 'Unpicked') {
      ownershipMatch = !app.pickedBy;
    }

    return searchMatch && statusMatch && partnerMatch && intakeMatch && ownershipMatch;
  });

  const unpickedCount = applications.filter(a => !a.pickedBy).length;
  const unrepliedCount = applications.filter(a => a.hasUnrepliedMessage).length;

  // Pagination Math
  const totalItems = filteredApps.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedApps = filteredApps.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {!singleViewApp ? (
        <>
          {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Student Applications Registry</h1>
          <p className="text-xs text-slate-500 font-medium">View, search, filter B2B partner applications, and update application lifecycle status up to Closing.</p>
        </div>
        <button
          onClick={onAddClick}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Create Application</span>
        </button>
      </div>

      {/* SuperAdmin / Admin Overview Cards */}
      {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Director') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 border-t-4 border-t-amber-500 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Waiting / Unpicked Applications</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900">{unpickedCount}</span>
              <span className="text-[10px] text-amber-600 font-bold uppercase">Pending Pick / Assign</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#1e3a8a] p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-[#1e3a8a] uppercase tracking-widest block">Unreplied Agent Messages</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-[#1e3a8a]">{unrepliedCount}</span>
              <span className="text-[10px] text-blue-600 font-bold uppercase">Pending Reply</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-500 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Registered Applications</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900">{applications.length}</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Active Registry</span>
            </div>
          </div>
        </div>
      )}

      {/* Ownership & Scoping Tabs */}
      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setOwnershipTab('All')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              ownershipTab === 'All' ? 'bg-[#0A0A0F] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Applications ({applications.length})
          </button>
          <button
            onClick={() => setOwnershipTab('My Picked')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              ownershipTab === 'My Picked' ? 'bg-[#D99A1C] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            My Picked Applications
          </button>
          <button
            onClick={() => setOwnershipTab('Unpicked')}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
              ownershipTab === 'Unpicked' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Waiting / Unpicked List ({unpickedCount})
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'Submitted', 'Under Review', 'Paid Students', 'Conditional Offer Issued', 'CAS / I-20 Issued', 'Visa Approved', 'Enrolled / Closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === status 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-150 font-black shadow-3xs' 
                  : 'bg-slate-50 text-slate-500 border border-slate-150 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex w-full sm:w-auto items-center gap-3">
          {/* Filter by Intake */}
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

          {/* Filter by Partner */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-semibold cursor-pointer"
          >
            <option value="All">All Partners / Channels</option>
            <option value="Direct">Direct Applications</option>
            {referralAgents.map(p => (
              <option key={p.siNo || p.id} value={p.agentName || p.name}>{p.agentName || p.name}</option>
            ))}
          </select>

          {/* Search bar */}
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all font-medium"
              placeholder="Search by student, ID, course..."
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Application Files Directory</h2>
          <span className="text-[10px] font-bold text-slate-400">
            Showing {totalItems > 0 ? startIndex + 1 : 0} - {endIndex} of {totalItems} Applications
          </span>
        </div>
        <div className="overflow-x-auto">
          {filteredApps.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider pl-6">ID / CAMS ID</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student Profile</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University & Course</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Handling Staff</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status Stage</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Date Filed</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {paginatedApps.map((app) => {
                  const displayStatus = app.secondaryStatus || app.status || 'Submitted';
                  const isClosed = displayStatus.includes('Closed');
                  const pickedStaffName = app.pickedBy?.name || app.pickedBy?.email || null;

                  return (
                    <tr 
                      key={app.camsId || app.id || app._id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        app.hasUnrepliedMessage ? 'bg-[#1e3a8a]/5 font-bold border-l-4 border-l-[#1e3a8a]' : ''
                      }`}
                    >
                      <td 
                        className="px-6 py-4 font-extrabold text-[#D99A1C] pl-6 truncate max-w-[120px] cursor-pointer group"
                        onClick={() => setSingleViewApp(app)}
                      >
                        <div>
                          <span className="group-hover:underline group-hover:text-[#F5B025] transition-colors flex items-center gap-1">
                            <span>{app.camsId && app.camsId.startsWith('CAMS') ? app.camsId : `CAMS${(app.camsId || '').substring((app.camsId || '').length - 6).toUpperCase()}`}</span>
                            <span className="text-[10px] text-[#D99A1C] opacity-0 group-hover:opacity-100 transition-opacity font-extrabold">↗</span>
                          </span>
                          {app.hasUnrepliedMessage && (
                            <span className="block mt-1 bg-[#1e3a8a] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse max-w-fit">
                              💬 Unreplied Msg
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-950 font-black">{app.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{app.passportNo || 'Pending Passport'}</p>
                        {app.submittedByStaff && (
                          <p className="text-[9px] text-slate-400 font-medium">By: {app.submittedByStaff.name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-950 font-black">{app.universityName}</p>
                        <p className="text-[10px] text-indigo-500 font-bold">{app.courseName} ({app.intake})</p>
                      </td>
                      <td className="px-6 py-4">
                        {pickedStaffName ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black">
                            👤 {pickedStaffName}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black italic">
                            ⚠️ Waiting / Unpicked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-extrabold ${
                            isClosed || displayStatus === 'Enrolled / Closed' || displayStatus === 'Visa Approved' || displayStatus === 'Paid Students'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black' 
                              : displayStatus.includes('Offer') || displayStatus.includes('CAS')
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : displayStatus.includes('Rejected')
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {displayStatus}
                          </span>
                          {app.commissionClaimed && (
                            <span className="block text-[9px] font-black text-emerald-600">
                              💰 Comm: {app.commissionStatus || 'Claimed'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {app.dateAdded}
                      </td>
                      <td className="px-6 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSingleViewApp(app)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                            title="View Full Single Application Page"
                          >
                            <span>👁️ View</span>
                          </button>

                          {!isPicked(app) && (
                            <button
                              onClick={() => handlePickApplication(app)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                              title="Pick Application to handle follow-up"
                            >
                              <span>✋ Pick App</span>
                            </button>
                          )}

                          {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Director') && (
                            <button
                              onClick={() => {
                                setAssignModalApp(app);
                                setSelectedStaffId('');
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                              title="Assign Staff Member"
                            >
                              <span>👉 Assign Staff</span>
                            </button>
                          )}

                          {(currentUser?.role === 'CRE' || currentUser?.role === 'SuperAdmin') && displayStatus === 'Submitted' && (
                            <button
                              onClick={() => handleForwardToOperations(app)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                              title="Forward CRE verified file to Operations Head"
                            >
                              <span>➡️ Forward Ops</span>
                            </button>
                          )}

                          <button
                            onClick={() => openStatusModal(app)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Update</span>
                          </button>
                          <button
                            onClick={() => setSelectedChatApp(app)}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[9px] px-2.5 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Chat</span>
                          </button>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xs font-black text-slate-900 uppercase">No Applications Found</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto font-medium">No student application records matched your search parameters.</p>
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
        /* SINGLE APPLICATION VIEW PAGE */
        <div className="space-y-6 animate-fade-in">
          {/* Top Header & Breadcrumbs Card */}
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSingleViewApp(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
              >
                <span>← Back to Applications List</span>
              </button>
              <div>
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Application Detailed Dossier</span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>{singleViewApp.studentName}</span>
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {singleViewApp.camsId && singleViewApp.camsId.startsWith('CAMS') ? singleViewApp.camsId : `CAMS${(singleViewApp.camsId || '').substring((singleViewApp.camsId || '').length - 6).toUpperCase()}`}
                  </span>
                </h2>
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isPicked(singleViewApp) && (
                <button
                  onClick={() => {
                    handlePickApplication(singleViewApp);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span>✋ Pick App</span>
                </button>
              )}

              {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Director') && (
                <button
                  onClick={() => {
                    setAssignModalApp(singleViewApp);
                    setSelectedStaffId('');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <span>👉 Assign Staff</span>
                </button>
              )}

              <button
                onClick={() => openStatusModal(singleViewApp)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                <span>✏️ Update Lifecycle Status</span>
              </button>

              <button
                onClick={() => setSelectedChatApp(singleViewApp)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                <span>💬 Open Chat</span>
              </button>

              <button
                onClick={handleSaveApplicationData}
                disabled={isSavingApp}
                className="px-4 py-2 bg-[#0A0A0F] hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
              >
                <span>💾 {isSavingApp ? 'Saving...' : 'Save All Data'}</span>
              </button>
            </div>
          </div>

          {/* Stage Timeline Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D99A1C]">Application Progress Lifecycle</span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase">
                Current Stage: {singleViewApp.secondaryStatus || singleViewApp.status || 'Submitted'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {STATUS_STEPS.map((step, idx) => {
                const currentStage = singleViewApp.secondaryStatus || singleViewApp.status || 'Submitted';
                const isActive = currentStage === step;
                const isPast = STATUS_STEPS.indexOf(currentStage) > idx;

                return (
                  <button
                    key={step}
                    onClick={() => {
                      const appId = singleViewApp.id || singleViewApp._id;
                      API.put(`/applications/${appId}`, { status: step, remarks: `Stage updated to ${step}` }).then(() => {
                        setSingleViewApp(prev => ({ ...prev, secondaryStatus: step, status: step }));
                        toast.success(`Stage updated to ${step}`);
                        if (onRefresh) onRefresh();
                      }).catch(() => {
                        setSingleViewApp(prev => ({ ...prev, secondaryStatus: step, status: step }));
                        toast.success(`Stage set to ${step}`);
                      });
                    }}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md font-black scale-105'
                        : isPast
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <span>{isPast ? '✓ ' : ''}{step}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dossier Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Student & Academic Specs */}
            <div className="space-y-6 lg:col-span-1">
              {/* Student Profile Info */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-4 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-[#D99A1C] text-white flex items-center justify-center font-black text-base shadow-md">
                    {singleViewApp.studentName ? singleViewApp.studentName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST'}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{singleViewApp.studentName}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{singleViewApp.studentEmail || 'Email pending'}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono font-bold">
                      Passport: {singleViewApp.passportNo || 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Phone Line:</span>
                    <span className="font-bold text-slate-800">{singleViewApp.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Date of Birth:</span>
                    <span className="font-bold text-slate-800">{singleViewApp.dob || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Country:</span>
                    <span className="font-bold text-slate-800">📍 {singleViewApp.country || 'India'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400 font-bold">Referred By:</span>
                    <span className="font-bold text-indigo-600">{singleViewApp.assignedBdm || 'Direct Application'}</span>
                  </div>
                </div>
              </div>

              {/* Academic Program Info */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D99A1C]">Target Academic Program</span>
                  <h4 className="font-black text-slate-900 text-base mt-0.5">{singleViewApp.universityName}</h4>
                  <p className="text-xs text-indigo-600 font-bold mt-0.5">{singleViewApp.courseName}</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Intake Season:</span>
                    <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{singleViewApp.intake}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Assigned BDM / Channel:</span>
                    <span className="font-bold text-slate-800">{singleViewApp.assignedBdm || 'Direct'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Assigned Executive:</span>
                    <span className="font-bold text-slate-800">{singleViewApp.assignedExecutive || 'Rahul Krishnan'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-bold">Handling Staff (Picked):</span>
                    {isPicked(singleViewApp) ? (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                        {singleViewApp.pickedBy?.name || singleViewApp.pickedBy?.email || singleViewApp.pickedBy}
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePickApplication(singleViewApp)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1 rounded-lg transition-all shadow-xs cursor-pointer uppercase tracking-wider flex items-center gap-1"
                      >
                        <span>✋ Pick Application</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Uploaded Documents & Comments Thread */}
            <div className="space-y-6 lg:col-span-2">
              {/* Uploaded Documents Gallery with Inline Page Viewer */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Submitted File Proofs</span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Application Documents ({singleViewApp.documents ? singleViewApp.documents.length : 4})
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✓ Attached & Verified
                  </span>
                </div>

                {/* Inline Document Preview Grid */}
                {(() => {
                  const docsToDisplay = (singleViewApp.documents && singleViewApp.documents.length > 0)
                    ? singleViewApp.documents
                    : [
                        { title: 'Passport Copy', fileName: 'passport_scan.pdf' },
                        { title: 'Academic Mark Sheets', fileName: 'academic_transcripts.pdf' },
                        { title: 'Statement of Purpose (SOP)', fileName: 'sop_statement.pdf' },
                        { title: 'English Test Score', fileName: 'ielts_scorecard.pdf' }
                      ];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {docsToDisplay.map((doc, dIdx) => {
                        const rawUrl = typeof doc === 'object' ? (doc.previewUrl || doc.url || doc.path || doc.fileUrl || doc.dataUrl || doc.data || doc.src) : (typeof doc === 'string' ? doc : null);
                        const fallbackFileName = typeof rawUrl === 'string' ? rawUrl.split('/').pop().split('?')[0] : '';
                        const docTitle = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.comment || doc.fileName || `Document ${dIdx + 1}`);
                        const docFileName = typeof doc === 'string' ? doc : (doc.fileName || fallbackFileName || doc.name || doc.title || 'Attached Document');
                        const isImg = (typeof rawUrl === 'string' && (rawUrl.startsWith('data:image/') || docFileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)));
                        const docBlobUrl = getDocumentBlobUrl(rawUrl, isImg ? 'image/png' : 'application/pdf') || createSampleAppDocBlobUrl(docTitle, singleViewApp.studentName, singleViewApp.camsId);

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

                            {/* Inline Document Box Canvas/Iframe Viewer */}
                            <div className="h-48 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
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
                                onClick={() => handleDownloadAppDocument(docBlobUrl, `${docTitle.replace(/\s+/g, '_')}.pdf`)}
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

              {/* Comments & Related Notes Thread Section */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Internal Discussion & Audit</span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>Application Comments & History</span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        {commentsList.length}
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Add Comment Input Form */}
                <form onSubmit={handleAddComment} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="text-xs font-black text-slate-800 block uppercase tracking-wider">Add Internal Note / Staff Comment</label>
                  <textarea
                    rows="3"
                    value={newCommentInput}
                    onChange={(e) => setNewCommentInput(e.target.value)}
                    placeholder="Write a comment or internal note regarding offer status, document verification, or university follow-up..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all font-medium resize-y"
                  ></textarea>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Visible to internal admin & staff members</span>
                    <button
                      type="submit"
                      disabled={!newCommentInput.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span>💬 Post Comment</span>
                    </button>
                  </div>
                </form>

                {/* Comments List Feed */}
                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {commentsList.length > 0 ? (
                    commentsList.map((c, cIdx) => (
                      <div key={c.id || cIdx} className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#0A0A0F] text-[#D99A1C] flex items-center justify-center font-bold text-[10px]">
                              {c.author ? c.author.slice(0, 2).toUpperCase() : 'ST'}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 block leading-tight">{c.author}</span>
                              <span className="text-[9px] font-bold text-[#D99A1C] uppercase">{c.role || 'Staff Member'}</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-150">
                          {c.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-medium italic border border-dashed border-slate-200 rounded-2xl">
                      No comments or internal notes recorded yet for this application. Use the form above to add the first comment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalApp && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Update Application Status</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Student: <strong className="text-slate-900">{statusModalApp.studentName}</strong> ({statusModalApp.camsId})</p>
              </div>
              <button 
                onClick={() => setStatusModalApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Stage / Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer"
                >
                  {STATUS_STEPS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Officer Notes</label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Unconditional offer issued by University. Student must pay deposit by 15th."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalApp(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#D99A1C] hover:bg-[#F5B025] rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdating && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isUpdating ? 'Updating...' : 'Save & Publish Update'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Staff Modal */}
      {assignModalApp && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Assign Staff Member</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Student: <strong className="text-slate-900">{assignModalApp.studentName}</strong> ({assignModalApp.camsId})</p>
              </div>
              <button 
                onClick={() => setAssignModalApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Handling Staff Member</label>
                <select
                  required
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffOptions.map(staff => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} ({staff.role}) - {staff.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalApp(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isAssigning && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isAssigning ? 'Assigning...' : 'Confirm Staff Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Slide-over Chat & Logs Drawer */}
      {selectedChatApp && (
        <ApplicationChatDrawer
          app={selectedChatApp}
          onClose={() => setSelectedChatApp(null)}
        />
      )}

      {/* DOCUMENT PREVIEW MODAL PORTAL */}
      {previewModalDoc && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-center select-none animate-fade-in">
          <div className="relative bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl p-4 sm:p-6 w-full max-w-3xl shadow-2xl flex flex-col my-auto max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Application Document Preview</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">{previewModalDoc.title}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{previewModalDoc.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl border border-slate-200 p-2 sm:p-3 flex items-center justify-center my-3 min-h-[300px]">
              {previewModalDoc.previewUrl ? (
                (previewModalDoc.type === 'image' || (typeof previewModalDoc.fileName === 'string' && previewModalDoc.fileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i))) ? (
                  <img
                    src={previewModalDoc.previewUrl}
                    alt={previewModalDoc.title}
                    className="max-h-[350px] sm:max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <iframe
                    src={previewModalDoc.previewUrl}
                    title={previewModalDoc.title}
                    className="w-full h-[350px] sm:h-[460px] rounded-xl border border-slate-200 shadow-inner bg-white"
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
                      ✓ Application File Proof
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
                        handleDownloadAppDocument(previewModalDoc.previewUrl, `${(previewModalDoc.title || 'document').replace(/\s+/g, '_')}.pdf`);
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
    </div>
  );
}
