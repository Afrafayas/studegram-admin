import ListFilterTabs from '../components/ListFilterTabs';
import useServerList, { restoreListRows } from '../hooks/useServerList';
import ListToolbar from '../components/ListToolbar';
import ActionMenu from '../components/ActionMenu';
import SearchableSelect from '../components/SearchableSelect';
import ValidatedInput from '../components/ValidatedInput';
import { getDisplayId } from '../utils/displayId';
import { applicationFee } from '../utils/courseFee';
import { getAssignedExecutiveName } from '../utils/applicationAssignment';
import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import ApplicationChatDrawer from '../components/ApplicationChatDrawer';
import ApplicationMessagesActivity from '../components/ApplicationMessagesActivity';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';
import { resolveDocumentUrl, documentFileName, downloadApplicationDocument } from '../utils/applicationDocuments';

const LIST_ACTION_CLASS = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const LIST_ICON_ACTION_CLASS = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

function ListActionIcon({ action }) {
  const paths = {
    view: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    pick: <><path d="M9 11V5a2 2 0 0 1 4 0v5m0-2a2 2 0 0 1 4 0v3m0-1a2 2 0 0 1 4 0v4c0 4-3 7-7 7h-1c-2 0-3-1-4-2l-5-6a2 2 0 0 1 3-3l2 2" /></>,
    assign: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m4-13v6m-3-3h6" /></>,
    forward: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    edit: <><path d="m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7 6-2" /></>,
    update: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z" /><path d="M7 10h9m-9 4h6" /></>,
  };
  return <svg className="h-3.5 w-3.5 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths[action]}</svg>;
}

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
    return !!(
      pb.id ||
      pb._id ||
      (typeof pb.name === 'string' && pb.name.trim().length > 0) ||
      (typeof pb.email === 'string' && pb.email.trim().length > 0)
    );
  }
  if (typeof pb === 'string') {
    return pb.trim().length > 0 && pb.trim() !== 'null' && pb.trim() !== 'undefined';
  }
  return false;
};

export default function Applications({ applications, referralAgents = [], intakes = [], staffList = [], universities = [], courses = [], initialSelectedAppId = null, onAddClick, onRefresh, onApplicationUpdated }) {
  const toast = useToast();
  const handleDownloadAppDocument = async (url, fileName) => {
    try {
      await downloadApplicationDocument(url, fileName);
    } catch (error) {
      toast.error(error.message || 'Unable to download the document.');
    }
  };
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [intakeFilter, setIntakeFilter] = useState('All');
  const [ownershipTab, setOwnershipTab] = useState('All'); // 'All' | 'My Picked' | 'Unpicked'
  const [selectedChatApp, setSelectedChatApp] = useState(null);
  const [singleViewMainTab, setSingleViewMainTab] = useState('details'); // 'details' | 'activity'

  // Single View Application State (persists across page refresh)
  const [singleViewApp, setSingleViewApp] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlAppId = params.get('appId') || params.get('applicationId');
      const savedAppId = urlAppId || localStorage.getItem('studegram_admin_single_view_app_id');
      const savedAppJson = localStorage.getItem('studegram_admin_single_view_app');

      let parsedApp = null;
      if (savedAppJson) {
        try {
          parsedApp = JSON.parse(savedAppJson);
        } catch (e) {}
      }

      // Check if applications list contains this application
      if (Array.isArray(applications) && applications.length > 0) {
        const targetSearchId = savedAppId || parsedApp?.id || parsedApp?._id || parsedApp?.camsId;
        if (targetSearchId) {
          const targetStr = String(targetSearchId).trim().toLowerCase();
          const found = applications.find(a => 
            String(a.id || a._id || '').toLowerCase() === targetStr ||
            String(a.camsId || '').toLowerCase() === targetStr
          );
          if (found) {
            return { ...(parsedApp || {}), ...found };
          }
        }
      }

      // Fallback to parsed cached application object
      if (parsedApp && (parsedApp.id || parsedApp._id)) {
        return parsedApp;
      }
    } catch (e) {}
    return null;
  });
  const [previewModalDoc, setPreviewModalDoc] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  useEffect(() => {
    setCommentsExpanded(false);
  }, [singleViewApp?.id, singleViewApp?._id]);
  const [newCommentInput, setNewCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [appEditNotes, setAppEditNotes] = useState('');

  // Edit Application Modal State
  const [editModalApp, setEditModalApp] = useState(null);
  const [editCountry, setEditCountry] = useState('');
  const [editUniversity, setEditUniversity] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editLevel, setEditLevel] = useState('Undergraduate (UG)');
  const [editIntake, setEditIntake] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const availableCountries = Array.from(
    new Set([
      ...(universities || []).map(u => (typeof u === 'object' ? u.country : '').trim()).filter(Boolean),
      'United Kingdom',
      'Canada',
      'United States',
      'Australia',
      'Ireland',
      'Germany',
      'New Zealand'
    ])
  ).sort();

  const editFilteredUniversities = (universities || []).filter(u => {
    if (!editCountry) return false;
    const uCountry = (typeof u === 'object' ? u.country : '').trim().toLowerCase();
    const sel = editCountry.trim().toLowerCase();
    return uCountry === sel ||
      (sel === 'united kingdom' && (uCountry === 'uk' || uCountry === 'england')) ||
      (sel === 'united states' && (uCountry === 'usa' || uCountry === 'us'));
  });

  const editFilteredCourses = (courses || []).filter(c => {
    if (!editUniversity) return false;
    const cUniv = typeof c === 'object' ? (c.university?._id || c.university) : '';
    return cUniv === editUniversity;
  });

  const openEditModal = (app) => {
    setEditModalApp(app);
    const currentUni = (universities || []).find(u => {
      const uId = typeof u === 'object' ? u._id : u;
      return uId === (app.universityId || app.university?._id || app.university) || 
        (typeof u === 'object' && u.name === app.universityName);
    });

    const uniCountry = currentUni?.country || app.university?.country || app.country || '';
    setEditCountry(uniCountry);
    setEditUniversity(currentUni?._id || app.universityId || app.university?._id || app.university || '');
    setEditCourse(app.courseId || app.course?._id || app.course || '');
    setEditLevel(app.level || 'Undergraduate (UG)');
    setEditIntake(app.intake || '');
    setEditStudentName(app.studentName || '');
    setEditStudentEmail(app.studentEmail || '');
    setEditStudentPhone(app.phone || '');
    setEditNotes(app.notes || '');
  };

  const handleSaveEditApplication = async (e) => {
    e.preventDefault();
    if (!editCountry) {
      toast.error('Please select a destination country.');
      return;
    }
    if (!editUniversity) {
      toast.error('Please select a destination university.');
      return;
    }
    if (!editCourse) {
      toast.error('Please select an academic program.');
      return;
    }

    setIsSavingEdit(true);
    const appId = editModalApp.id || editModalApp._id;
    const selectedUni = (universities || []).find(u => (typeof u === 'object' ? u._id : u) === editUniversity);
    const selectedC = (courses || []).find(c => (typeof c === 'object' ? c._id : c) === editCourse);

    const uName = typeof selectedUni === 'object' ? selectedUni.name : (editModalApp.universityName || 'Assigned');
    const cName = typeof selectedC === 'object' ? selectedC.title : (editModalApp.courseName || 'Assigned');

    try {
      const studentId = editModalApp.studentId || editModalApp.student?._id || editModalApp.student;
      if (studentId) {
        const studentRes = await API.put(`/students/${studentId}`, {
          name: editStudentName,
          email: editStudentEmail,
          phone: editStudentPhone
        });
        if (!studentRes.data?.success) throw new Error(studentRes.data?.message || 'Failed to save student details.');
      }

      const applicationRes = await API.put(`/applications/${appId}`, {
        university: editUniversity,
        course: editCourse,
        level: editLevel,
        intake: editIntake,
        notes: editNotes,
        country: editCountry
      });
      if (!applicationRes.data?.success) throw new Error(applicationRes.data?.message || 'Failed to update application.');

      editModalApp.universityId = editUniversity;
      editModalApp.universityName = uName;
      editModalApp.courseId = editCourse;
      editModalApp.courseName = cName;
      editModalApp.level = editLevel;
      editModalApp.intake = editIntake;
      editModalApp.country = editCountry;
      editModalApp.studentName = editStudentName;
      editModalApp.studentEmail = editStudentEmail;
      editModalApp.phone = editStudentPhone;
      editModalApp.notes = editNotes;

      if (singleViewApp && (singleViewApp.id === appId || singleViewApp._id === appId)) {
        setSingleViewApp(prev => ({
          ...prev,
          universityId: editUniversity,
          universityName: uName,
          courseId: editCourse,
          courseName: cName,
          level: editLevel,
          intake: editIntake,
          country: editCountry,
          studentName: editStudentName,
          studentEmail: editStudentEmail,
          phone: editStudentPhone,
          notes: editNotes
        }));
      }

      toast.success('Application updated successfully!');
      setEditModalApp(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update application');
    } finally {
      setIsSavingEdit(false);
    }
  };
  const [isSavingApp, setIsSavingApp] = useState(false);
  const dismissedTargetRef = useRef(false);

  const handleBackToList = () => {
    dismissedTargetRef.current = true;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('appId');
      url.searchParams.delete('applicationId');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
    localStorage.removeItem('studegram_admin_single_view_app_id');
    localStorage.removeItem('studegram_admin_single_view_app');
    setSingleViewApp(null);
    window.dispatchEvent(new CustomEvent('clear_single_view_app'));
  };

  const handleOpenSingleView = (app) => {
    dismissedTargetRef.current = false;
    setSingleViewApp(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-open Single View when initialSelectedAppId or saved single view ID is provided
  useEffect(() => {
    let cancelled = false;
    if (dismissedTargetRef.current && !initialSelectedAppId) return;

    const params = new URLSearchParams(window.location.search);
    const urlAppId = params.get('appId') || params.get('applicationId');
    const savedAppId = urlAppId || localStorage.getItem('studegram_admin_single_view_app_id');
    const effectiveTarget = initialSelectedAppId || (!singleViewApp ? savedAppId : null);

    if (!effectiveTarget) return;

    if (initialSelectedAppId) {
      dismissedTargetRef.current = false;
    }

    let targetId = effectiveTarget;
    let notifObj = null;
    if (typeof effectiveTarget === 'object' && effectiveTarget !== null) {
      targetId = effectiveTarget.targetId || effectiveTarget.relatedId || effectiveTarget.applicationId || effectiveTarget.id;
      notifObj = effectiveTarget.notification || effectiveTarget;
    }

    const targetStr = String(targetId || '').trim().toLowerCase();
    const notifText = notifObj ? `${notifObj.title || ''} ${notifObj.message || ''}`.toLowerCase() : '';

    let found = null;
    if (Array.isArray(applications) && applications.length > 0) {
      // 1. Direct ID / CAMS match
      found = applications.find(a => {
        const aId = String(a.id || a._id || '').toLowerCase();
        const aCams = String(a.camsId || '').toLowerCase();
        return targetStr && (aId === targetStr || aCams === targetStr);
      });


    }

    if (found) {
      setSingleViewApp(found);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (targetId && typeof targetId === 'string' && /^[0-9a-fA-F]{24}$/.test(targetId)) {
      // Direct API fetch if not found in memory list
      API.get(`/applications/${targetId}`).then(res => {
        if (!cancelled && res.data?.success && res.data.data) {
          const freshApp = res.data.data;
          const mappedApp = {
            id: freshApp._id,
            _id: freshApp._id,
            camsId: getDisplayId(freshApp),
            studentName: freshApp.student?.name || 'N/A',
            passportNo: freshApp.student?.passportNo || 'N/A',
            universityName: freshApp.university?.name || 'N/A',
            courseName: freshApp.course?.title || 'N/A',
            level: freshApp.level || 'Undergraduate (UG)',
            intake: freshApp.intake || '',
            status: freshApp.status || 'Submitted',
            secondaryStatus: freshApp.status || 'Pending',
            paymentStatus: freshApp.paymentStatus || 'Pending',
            dateAdded: new Date(freshApp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            country: freshApp.university?.country || '',
            partner: freshApp.partner || null,
            partnerName: freshApp.partner?.name || 'Direct',
            partnerCompanyName: freshApp.partner?.companyName || freshApp.partner?.name || 'Direct',
            assignedBdm: freshApp.partner?.companyName || freshApp.partner?.name || 'Direct',
            assignedExecutive: getAssignedExecutiveName(freshApp),
            statusHistory: freshApp.statusHistory || [],
            dob: freshApp.student?.dob ? new Date(freshApp.student.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
            studentEmail: freshApp.student?.email || null,
            phone: freshApp.student?.phone || null,
            documents: freshApp.documents || [],
            notes: freshApp.notes || '',
            applicationComments: freshApp.applicationComments || [],
            pickedBy: (freshApp.pickedBy && (freshApp.pickedBy.id || freshApp.pickedBy._id || (freshApp.pickedBy.name && freshApp.pickedBy.name.trim()))) ? freshApp.pickedBy : null,
            submittedByStaff: freshApp.submittedByStaff || null
          };
          setSingleViewApp(mappedApp);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          document.getElementById('admin-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }).catch(err => console.warn('Could not fetch target application:', err.message));
    }
    return () => { cancelled = true; };
  }, [initialSelectedAppId, applications]);

  // Keep singleViewApp in sync with latest applications list updates
  useEffect(() => {
    if (!singleViewApp || !applications || applications.length === 0) return;
    const currentId = String(singleViewApp.id || singleViewApp._id || singleViewApp.camsId || '').toLowerCase();
    const updated = applications.find(a => 
      String(a.id || a._id || '').toLowerCase() === currentId ||
      String(a.camsId || '').toLowerCase() === currentId
    );
    if (updated) {
      setSingleViewApp(prev => {
        // Navigation may already have selected another application in this batch.
        const selectedId = String(prev?.id || prev?._id || prev?.camsId || '').toLowerCase();
        if (!prev || selectedId !== currentId) return prev;
        return {
          ...prev,
          ...updated,
          notes: prev.notes !== undefined ? prev.notes : updated.notes,
          applicationComments: (prev.applicationComments && prev.applicationComments.length > (updated.applicationComments?.length || 0)) 
            ? prev.applicationComments 
            : (updated.applicationComments || prev.applicationComments || []),
          statusHistory: (prev.statusHistory && prev.statusHistory.length > (updated.statusHistory?.length || 0))
            ? prev.statusHistory
            : (updated.statusHistory || prev.statusHistory || [])
        };
      });
    }
  }, [applications]);

  // Persist singleViewApp to localStorage and URL search params so page refresh stays on this single view
  useEffect(() => {
    if (singleViewApp) {
      const appId = singleViewApp.id || singleViewApp._id || singleViewApp.camsId;
      if (appId) {
        localStorage.setItem('studegram_admin_single_view_app_id', String(appId));
      }
      try {
        localStorage.setItem('studegram_admin_single_view_app', JSON.stringify(singleViewApp));
      } catch (e) {
        console.warn('Could not serialize singleViewApp:', e);
      }

      try {
        const url = new URL(window.location.href);
        if (appId && url.searchParams.get('appId') !== String(appId)) {
          url.searchParams.set('appId', String(appId));
          window.history.pushState({ appView: String(appId) }, '', url.toString());
        }
      } catch (e) {}
    } else {
      localStorage.removeItem('studegram_admin_single_view_app_id');
      localStorage.removeItem('studegram_admin_single_view_app');
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('appId') || url.searchParams.has('applicationId')) {
          url.searchParams.delete('appId');
          url.searchParams.delete('applicationId');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    }
  }, [singleViewApp]);

  // Listen for reset events (e.g. sidebar navigation or header navigation)
  useEffect(() => {
    const handleClearSingleView = () => {
      dismissedTargetRef.current = true;
      setSingleViewApp(null);
      localStorage.removeItem('studegram_admin_single_view_app_id');
      localStorage.removeItem('studegram_admin_single_view_app');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('appId');
        url.searchParams.delete('applicationId');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}
    };

    window.addEventListener('clear_single_view_app', handleClearSingleView);
    return () => {
      window.removeEventListener('clear_single_view_app', handleClearSingleView);
    };
  }, []);

  // Handle browser Back / Forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlAppId = params.get('appId') || params.get('applicationId');
      if (!urlAppId) {
        dismissedTargetRef.current = true;
        setSingleViewApp(null);
      } else if (!singleViewApp || (singleViewApp.id !== urlAppId && singleViewApp._id !== urlAppId && singleViewApp.camsId !== urlAppId)) {
        dismissedTargetRef.current = false;
        if (Array.isArray(applications) && applications.length > 0) {
          const found = applications.find(a => 
            String(a.id || a._id || '').toLowerCase() === urlAppId.toLowerCase() ||
            String(a.camsId || '').toLowerCase() === urlAppId.toLowerCase()
          );
          if (found) setSingleViewApp(found);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applications, singleViewApp]);

  // Helper to compile all comments & audit history into a unified timeline
  const buildCommentsList = (appObj) => {
    if (!appObj) return [];
    const list = [];
    const seen = new Set();

    // 1. Direct Application Comments (from DB applicationComments thread)
    if (appObj.applicationComments && Array.isArray(appObj.applicationComments)) {
      appObj.applicationComments.forEach((ac, idx) => {
        if (ac && ac.text) {
          const key = ac._id ? String(ac._id) : `ac-${ac.createdAt || idx}-${ac.text}`;
          if (!seen.has(key)) {
            seen.add(key);
            let authorName = ac.author || 'User';
            let roleName = 'Staff';
            if (authorName.includes('(')) {
              const match = authorName.match(/^(.*?)\s*\((.*?)\)$/);
              if (match) {
                authorName = match[1];
                roleName = match[2];
              }
            } else if (authorName.toLowerCase().includes('agent')) {
              roleName = 'Agent';
            }
            list.push({
              id: key,
              author: authorName,
              role: roleName,
              text: ac.text,
              type: 'comment',
              createdAt: ac.createdAt || appObj.dateAdded || new Date().toISOString()
            });
          }
        }
      });
    }

    // 2. Lifecycle Status Transitions & Remarks
    if (appObj.statusHistory && Array.isArray(appObj.statusHistory)) {
      appObj.statusHistory.forEach((sh, idx) => {
        if (sh && sh.remarks) {
          const key = sh._id ? String(sh._id) : `sh-${sh.updatedAt || sh.date || idx}-${sh.remarks}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              id: key,
              author: sh.updatedBy?.name || sh.by || 'System Staff',
              role: sh.updatedBy?.role || 'Status Update',
              text: sh.remarks,
              status: sh.status,
              type: 'status',
              createdAt: sh.updatedAt || sh.date || new Date().toISOString()
            });
          }
        }
      });
    }

    // 3. Initial Submission Notes
    if (appObj.notes && typeof appObj.notes === 'string' && appObj.notes.trim()) {
      const key = `note-${appObj.id || appObj._id || 'init'}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: key,
          author: appObj.submittedByStaff?.name || appObj.assignedBdm || 'Filing Agent',
          role: 'Application Note',
          text: appObj.notes,
          type: 'note',
          createdAt: appObj.dateAdded || new Date().toISOString()
        });
      }
    }

    // Sort: newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  };

  // When singleViewApp is set, sync comments & notes and fetch fresh data from backend
  const currentAppId = singleViewApp?.id || singleViewApp?._id;
  useEffect(() => {
    let cancelled = false;
    let requestVersion = 0;
    setCommentsList(buildCommentsList(singleViewApp));
    setAppEditNotes(singleViewApp?.notes || '');
    const refreshComments = (event) => {
      const version = ++requestVersion;
      if (singleViewApp) {
        const appId = singleViewApp.id || singleViewApp._id;
        if (appId) {
          API.get(`/applications/${appId}`).then(res => {
            if (!cancelled && version === requestVersion && res.data?.success && res.data.data) {
              const freshApp = res.data.data;
              const updatedApp = {
                ...singleViewApp,
                ...freshApp,
                id: freshApp._id || singleViewApp.id,
                applicationComments: freshApp.applicationComments || [],
                statusHistory: freshApp.statusHistory || singleViewApp.statusHistory || [],
                notes: freshApp.notes !== undefined ? freshApp.notes : singleViewApp.notes
              };
              setSingleViewApp(prev => String(prev?.id || prev?._id) !== String(appId) ? prev : ({
                ...prev,
                applicationComments: freshApp.applicationComments || [],
                statusHistory: freshApp.statusHistory || prev?.statusHistory || [],
                notes: freshApp.notes !== undefined ? freshApp.notes : prev?.notes
              }));
              setCommentsList(buildCommentsList(updatedApp));
              if (!event && freshApp.notes !== undefined) {
                setAppEditNotes(freshApp.notes);
              }
            }
          }).catch(err => {
            console.warn('Could not refresh application comments:', err.message);
          });
        }
      }
    };
    refreshComments();
    window.addEventListener('application_comments_updated', refreshComments);
    return () => {
      cancelled = true;
      window.removeEventListener('application_comments_updated', refreshComments);
    };
  }, [currentAppId, initialSelectedAppId]);

  const handleAddComment = async (eOrText) => {
    let textToSave = '';
    if (typeof eOrText === 'string') {
      textToSave = eOrText.trim();
    } else if (eOrText && eOrText.preventDefault) {
      eOrText.preventDefault();
      textToSave = newCommentInput.trim();
    }
    if (!textToSave || !singleViewApp) return false;
    setIsPostingComment(true);
    try {
      const appId = singleViewApp.id || singleViewApp._id;
      const res = await API.post(`/applications/${appId}/comments`, {
        text: textToSave
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to post comment.');

      if (res.data?.success && Array.isArray(res.data.data)) {
        const updatedApp = {
          ...singleViewApp,
          applicationComments: res.data.data
        };
        setSingleViewApp(updatedApp);
        setCommentsList(buildCommentsList(updatedApp));
      }
      setNewCommentInput('');
      toast.success('Comment posted successfully!');
      if (onRefresh) onRefresh();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to post comment.');
      return false;
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleSaveApplicationData = async () => {
    if (!singleViewApp) return;
    setIsSavingApp(true);
    try {
      const appId = singleViewApp.id || singleViewApp._id;
      const res = await API.put(`/applications/${appId}`, {
        notes: appEditNotes,
        remarks: 'Application notes updated from Single View Dossier'
      });

      if (res.data?.success) {
        toast.success('Application details saved successfully!');
        setSingleViewApp(prev => ({ ...prev, notes: appEditNotes }));
        if (onRefresh) onRefresh();
      } else {
        throw new Error(res.data?.message || 'Failed to save application notes.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save application notes.');
    } finally {
      setIsSavingApp(false);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Reset page on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, partnerFilter, intakeFilter, ownershipTab]);

  // Status update modal state
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Submitted');
  const [remarks, setRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const statusUpdateLock = useRef(false);
  const [pendingStage, setPendingStage] = useState(null);

  const applySavedStatus = (appId, status, data = {}) => {
    const changes = {
      status, secondaryStatus: status,
      ...(data.statusHistory ? { statusHistory: data.statusHistory } : {}),
      ...(data.paymentStatus ? { paymentStatus: data.paymentStatus } : {}),
      ...(status === 'Paid Students' ? { paymentStatus: 'Paid' } : {}),
    };
    setSingleViewApp(prev => prev && String(prev.id || prev._id) === String(appId)
      ? { ...prev, ...changes } : prev);
    onApplicationUpdated?.(appId, changes);
  };

  const handleStageUpdate = async (step) => {
    if (statusUpdateLock.current || !singleViewApp) return;
    if ((singleViewApp.secondaryStatus || singleViewApp.status) === step) return;
    statusUpdateLock.current = true;
    setPendingStage(step);
    try {
      const appId = singleViewApp.id || singleViewApp._id;
      const res = await API.put(`/applications/${appId}`, {
        status: step, remarks: `Stage updated to ${step}`,
        ...(step === 'Paid Students' ? { paymentStatus: 'Paid' } : {}),
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update status.');
      applySavedStatus(appId, step, res.data.data);
      toast.success(`Stage updated to ${step}`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update status.');
    } finally {
      statusUpdateLock.current = false;
      setPendingStage(null);
    }
  };
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
    if (!statusModalApp || statusUpdateLock.current) return;

    statusUpdateLock.current = true;
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

      const res = await API.put(`/applications/${appId}`, payload);

      if (res.data?.success) {
        const savedStatus = res.data.data?.status || selectedStatus;
        applySavedStatus(appId, savedStatus, res.data.data);
        toast.success(`Application status updated to "${savedStatus}" successfully!`);
        setStatusModalApp(null);
      } else {
        toast.error(res.data?.message || 'Failed to update application status.');
      }
    } catch (err) {
      console.error('Update status error:', err);
      toast.error(err.response?.data?.message || err.message || 'Error updating status.');
    } finally {
      statusUpdateLock.current = false;
      setIsUpdating(false);
    }
  };

  // Application Pick / Assign / Forward Handlers
  const [assignModalApp, setAssignModalApp] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffOptions, setStaffOptions] = useState(() => {
    const raw = (Array.isArray(staffList) && staffList.length > 0) ? staffList : [];
    return raw.map(s => ({
      _id: s._id || s.id || s.email,
      id: s._id || s.id || s.email,
      name: s.name,
      role: s.role,
      email: s.email
    }));
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStaff = async () => {
      try {
        const res = await API.get('/users/staff');
        if (isMounted && res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setStaffOptions(res.data.data);
          return;
        }
      } catch (err) {
        // Fallback gracefully without throwing warnings
      }

      if (isMounted) {
        const rawStaffList = (Array.isArray(staffList) && staffList.length > 0) ? staffList : [];
        const formattedStaff = rawStaffList.map(s => ({
          _id: s._id || s.id || s.email,
          id: s._id || s.id || s.email,
          name: s.name,
          role: s.role,
          email: s.email
        }));
        setStaffOptions(formattedStaff);
      }
    };
    fetchStaff();
    return () => { isMounted = false; };
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
      const res = await API.put(`/applications/${appId}/pick`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to pick application.');
      Object.assign(pickerObj, res.data.data?.pickedBy || {});
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to pick application.');
      return;
    }

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
      const res = await API.put(`/applications/${appId}/assign`, { staffId: selectedStaffId, pickedBy: selectedStaffId });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to assign application.');
      Object.assign(pickerObj, res.data.data?.pickedBy || {});
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to assign application.');
      return;
    } finally {
      setIsAssigning(false);
    }

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

  const serverList = useServerList('/applications', { search: searchTerm, filters: { status: statusFilter, partner: partnerFilter, intake: intakeFilter, ...(ownershipTab === 'Unreplied' ? {hasUnrepliedMessage:'true'} : {}) }, params: { scope: ownershipTab === 'My Picked' ? 'my_picked' : ownershipTab === 'Unpicked' ? 'unpicked' : 'all' }, page: currentPage, limit: itemsPerPage, onPageChange: setCurrentPage, reloadKey: JSON.stringify(applications) });

  // Search and filter applications
  let filteredApps = restoreListRows(serverList.data, applications);

  const unpickedCount = applications.filter(a => !isPicked(a)).length;
  const unrepliedCount = applications.filter(a => a.hasUnrepliedMessage).length;
  const myPickedCount = applications.filter(a => isPicked(a) && (a.pickedBy?.id === currentUser?._id || a.pickedBy?.email === currentUser?.email || a.pickedBy?._id === currentUser?._id)).length;

  // Pagination Math
  const totalItems = serverList.totalCount;
  const totalPages = serverList.totalPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApps = filteredApps;

  return (
    <div className="workspace-page flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F0F2F5]">
      <div className={editModalApp ? 'hidden' : 'contents'}>
      {!singleViewApp ? (
        <>
          {/* Header */}
      <div className="workspace-panel flex flex-wrap gap-3 justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Student Applications Registry</h1>
          <p className="text-xs text-slate-500 font-medium">View, search, filter B2B partner applications, and update application lifecycle status up to Closing.</p>
        </div>
        <ActionButton
          onClick={onAddClick}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Create Application</span>
        </ActionButton>
      </div>

      {/* Applications Table */}
      <div className="workspace-panel workspace-list-frame bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        {/* Ownership & Scoping Tabs on top of table */}
        <ListFilterTabs value={ownershipTab} onChange={value => { setOwnershipTab(value); setCurrentPage(1); }} options={[{value:'All',label:'All applications',params:{scope:'all'}},{value:'My Picked',label:'My picked',params:{scope:'my_picked'}},{value:'Unpicked',label:'Waiting / unpicked',params:{scope:'unpicked'}},{value:'Unreplied',label:'Unreplied messages',params:{scope:'all'},filters:{hasUnrepliedMessage:'true'}}]} query={{endpoint:'/applications',search:searchTerm,filters:{status:statusFilter,partner:partnerFilter,intake:intakeFilter},reloadKey:JSON.stringify(applications)}} />

        <ListToolbar search={searchTerm} onSearchChange={setSearchTerm} filters={[{ key: 'status', label: 'statuses', value: statusFilter, onChange: setStatusFilter, options: serverList.facets.status || [] },{ key: 'intake', label: 'intakes', value: intakeFilter, onChange: setIntakeFilter, options: serverList.facets.intake || [] },{ key: 'partner', label: 'channels', value: partnerFilter, onChange: setPartnerFilter, options: serverList.facets.partner || [] }]} onReset={() => { setSearchTerm(''); setStatusFilter('All'); setIntakeFilter('All'); setPartnerFilter('All'); setCurrentPage(1); }} loading={serverList.loading} error={serverList.error} onRetry={serverList.reload} />
        
        <div className="overflow-x-auto">
          {filteredApps.length > 0 ? (
            <table className="workspace-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider pl-6">ID / Application ID</th>
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
                  const pickedStaffName = typeof app.pickedBy === 'string' ? app.pickedBy : ((app.pickedBy?.name && app.pickedBy.name.trim()) || app.pickedBy?.email || null);

                  return (
                    <tr tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") { event.preventDefault(); event.currentTarget.click(); } }} 
                      key={app.camsId || app.id || app._id} 
                      onClick={() => handleOpenSingleView(app)}
                      className={`hover:bg-amber-50/40 transition-colors cursor-pointer group ${
                        app.hasUnrepliedMessage ? 'bg-[#1e3a8a]/5 font-bold border-l-4 border-l-[#1e3a8a]' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-extrabold text-[#D99A1C] pl-6 truncate max-w-[120px]">
                        <div>
                          <span className="group-hover:underline group-hover:text-[#F5B025] transition-colors flex items-center gap-1">
                            <span>{getDisplayId(app)}</span>
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
                        <p className="text-slate-950 font-black group-hover:text-[#D99A1C] transition-colors">{app.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{app.passportNo || 'Pending Passport'}</p>
                        {app.submittedByStaff && (
                          <p className="text-[9px] text-slate-400 font-medium">By: {app.submittedByStaff.name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-950 font-black">{app.universityName}</p>
                        <p className="text-[10px] text-indigo-500 font-bold">{app.courseName} ({app.intake}){app.level ? ` • ${app.level}` : ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        {isPicked(app) ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black">
                            👤 {pickedStaffName || 'Picked Staff'}
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
                        <ActionMenu
                          items={[
                            {
                              label: 'View Application Details',
                              onClick: () => handleOpenSingleView(app)
                            },
                            {
                              label: 'Edit Application',
                              onClick: () => openEditModal(app)
                            },
                            {
                              label: 'Chat / Messages',
                              onClick: () => setSelectedChatApp(app)
                            },
                            !isPicked(app) && {
                              label: 'Pick Application',
                              onClick: () => handlePickApplication(app)
                            },
                            (['SuperAdmin', 'Super Admin', 'Admin', 'Director'].includes(currentUser?.role)) && {
                              label: 'Assign Staff',
                              onClick: () => {
                                setAssignModalApp(app);
                                setSelectedStaffId('');
                              }
                            },
                            {
                              label: 'Update Status',
                              onClick: () => {
                                setStatusModalApp(app);
                                setSelectedStatus(app.secondaryStatus || app.status || 'Submitted');
                              }
                            }
                          ]}
                        />
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
        /* SINGLE APPLICATION VIEW PAGE */
        <div className="min-w-0 space-y-6 animate-fade-in [overflow-wrap:anywhere]">
          {/* Top Header & Breadcrumbs Card */}
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <ActionButton
                onClick={handleBackToList}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
              >
                <span>← Back to Applications List</span>
              </ActionButton>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider">Application Details</span>
                  <span className="text-[10px] text-slate-400 font-bold">•</span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Date Created: {singleViewApp.dateAdded || (singleViewApp.createdAt ? new Date(singleViewApp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent')}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap mt-0.5">
                  <span>{singleViewApp.studentName}</span>
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {getDisplayId(singleViewApp)}
                  </span>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold ${
                    (singleViewApp.secondaryStatus || singleViewApp.status || 'Submitted').includes('Closed') || (singleViewApp.secondaryStatus || singleViewApp.status) === 'Enrolled / Closed' || (singleViewApp.secondaryStatus || singleViewApp.status) === 'Visa Approved' || (singleViewApp.secondaryStatus || singleViewApp.status) === 'Paid Students'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black' 
                      : (singleViewApp.secondaryStatus || singleViewApp.status || '').includes('Offer') || (singleViewApp.secondaryStatus || singleViewApp.status || '').includes('CAS')
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : (singleViewApp.secondaryStatus || singleViewApp.status || '').includes('Rejected')
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {singleViewApp.secondaryStatus || singleViewApp.status || 'Submitted'}
                  </span>
                </h2>
              </div>
            </div>

            {/* Application actions wrap to remain accessible at narrow widths. */}
            <div className="flex min-w-0 items-center gap-2 flex-wrap py-1 w-full xl:w-auto justify-start xl:justify-end">
              {!isPicked(singleViewApp) && (
                <ActionButton
                  onClick={() => {
                    return handlePickApplication(singleViewApp);
                  }}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                >
                  <ListActionIcon action="pick" /><span>Pick App</span>
                </ActionButton>
              )}

              {(['SuperAdmin', 'Super Admin', 'Admin', 'Director'].includes(currentUser?.role)) && (
                <ActionButton
                  onClick={() => {
                    setAssignModalApp(singleViewApp);
                    setSelectedStaffId('');
                  }}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  <ListActionIcon action="assign" /><span>Assign Staff</span>
                </ActionButton>
              )}

              <ActionButton
                onClick={() => openEditModal(singleViewApp)}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <ListActionIcon action="edit" /><span>Edit App</span>
              </ActionButton>
              <ActionButton
                onClick={() => openStatusModal(singleViewApp)}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <ListActionIcon action="update" /><span>Update Status</span>
              </ActionButton>

              <ActionButton
                onClick={() => setSingleViewMainTab(singleViewMainTab === 'activity' ? 'details' : 'activity')}
                className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer ${
                  singleViewMainTab === 'activity'
                    ? 'border-indigo-400 bg-indigo-600 text-white shadow-xs'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <ListActionIcon action="chat" /><span>{singleViewMainTab === 'activity' ? 'View App Details' : 'Open Messages & Activity'}</span>
              </ActionButton>

              <ActionButton
                onClick={handleSaveApplicationData}
                disabled={isSavingApp}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              >
                {isSavingApp && (
                  <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>💾 {isSavingApp ? 'Saving...' : 'Save All Data'}</span>
              </ActionButton>
            </div>
          </div>

          {/* Single View Main Tab Bar: App Details vs Messages & Activity */}
          <div className="flex flex-wrap bg-white border border-slate-200 rounded-2xl p-2 gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => setSingleViewMainTab('details')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                singleViewMainTab === 'details'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 002 2z" />
              </svg>
              <span>App Details</span>
            </button>

            <button
              type="button"
              onClick={() => setSingleViewMainTab('activity')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                singleViewMainTab === 'activity'
                  ? 'bg-[#D99A1C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Messages & Activity</span>
              {singleViewApp.hasUnrepliedMessage ? (
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              )}
            </button>
          </div>

          {singleViewMainTab === 'details' ? (
            <section aria-label="Application details" className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm [overflow-wrap:anywhere]">
          {/* Stage Timeline Card */}
          <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 space-y-3">
            <div className="flex flex-wrap gap-2 justify-between items-center pb-2 border-b border-slate-100">
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
                  <ActionButton
                    key={step}
                    onClick={() => handleStageUpdate(step)}
                    disabled={isActive || pendingStage !== null || isUpdating}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md font-black scale-105'
                        : isPast
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <span>{isPast ? '✓ ' : ''}{step}</span>
                  </ActionButton>
                );
              })}
            </div>
          </div>

          {/* Dossier Grid Layout - Perfectly Balanced Bottom Level */}
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2">
            {/* Left Column: Student, Academic Specs & Counselor Remarks */}
            <div className="contents">
              {/* Student Profile Info */}
              <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 space-y-4 lg:col-span-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">Student details</h2>
                

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 text-xs">
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Phone Line:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-slate-800">{singleViewApp.phone || 'N/A'}</span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Date of Birth:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-slate-800">{singleViewApp.dob || 'N/A'}</span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Country:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-slate-800">📍 {singleViewApp.country || ''}</span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1">
                    <span className="text-slate-400 font-bold">Referred By:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-indigo-600">{singleViewApp.assignedBdm || 'Direct Application'}</span>
                  </div>
                </div>
              </div>

              {/* Academic Program Info */}
              <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 space-y-4 lg:border-b-0 lg:border-r">
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D99A1C]">Target Academic Program</span>
                  <h4 className="font-black text-slate-900 text-base mt-0.5">{singleViewApp.universityName}</h4>
                  <p className="text-xs text-indigo-600 font-bold mt-0.5">{singleViewApp.courseName}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Destination Country:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-slate-800">📍 {singleViewApp.country || singleViewApp.destinationCountry || singleViewApp.university?.country || 'Not provided'}</span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Level of Study:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{singleViewApp.level || 'Undergraduate (UG)'}</span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Intake Season:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{singleViewApp.intake}</span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Tuition Fees:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {applicationFee(singleViewApp)}
                    </span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Referral Partner / Source:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-indigo-600">
                      {singleViewApp.referredBy || singleViewApp.partnerName || singleViewApp.partner?.name || singleViewApp.assignedBdm || 'Direct Applicant'}
                    </span>
                  </div>
                  <div className="min-w-0 flex flex-wrap items-start gap-x-2 gap-y-1 py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">Assigned Executive:</span>
                    <span className="min-w-0 max-w-full break-words font-bold text-slate-800">{getAssignedExecutiveName(singleViewApp) || 'Unassigned'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 py-1">
                    <span className="text-slate-400 font-bold">Handling Staff (Picked):</span>
                    {isPicked(singleViewApp) ? (
                      <span className="min-w-0 max-w-full break-words font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                        {singleViewApp.pickedBy?.name || singleViewApp.pickedBy?.email || singleViewApp.pickedBy}
                      </span>
                    ) : (
                      <ActionButton
                        onClick={() => handlePickApplication(singleViewApp)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1 rounded-lg transition-all shadow-xs cursor-pointer uppercase tracking-wider flex items-center gap-1"
                      >
                        <span>✋ Pick Application</span>
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>

              {/* Counselor Notes section temporarily hidden.
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs">📝</span>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider whitespace-nowrap">
                        Counselor Notes
                      </h3>
                    </div>
                    <ActionButton
                      type="button"
                      onClick={handleSaveApplicationData}
                      disabled={isSavingApp}
                      className="px-2.5 py-1 bg-[#0A0A0F] hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                    >
                      {isSavingApp && (
                        <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <span>💾 {isSavingApp ? 'Saving...' : 'Save Notes'}</span>
                    </ActionButton>
                  </div>
                  <div className="pt-2">
                    <textarea
                      rows="4"
                      value={appEditNotes}
                      onChange={(e) => setAppEditNotes(e.target.value)}
                      placeholder="Enter counselor remarks, special instructions, eligibility notes, or document follow-ups for this application..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all font-medium resize-y"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold italic pt-1">
                  Saved directly to application record and visible to all staff handling this case.
                </p>
              </div>
              */}
            </div>

            {/* Right Column: Uploaded Documents & Application Comments */}
            <div className="contents">
              {/* Compact Uploaded Documents Gallery */}
              <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 space-y-4 lg:border-b-0">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">Uploaded documents ({singleViewApp.documents?.length || 0})</h2>
                

                {/* Compact Document Cards Grid */}
                {(() => {
                  const docsToDisplay = singleViewApp.documents || [];
                  if (!docsToDisplay.length) return <p className="text-xs text-slate-500 py-4">No documents uploaded yet.</p>;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {docsToDisplay.map((doc, dIdx) => {
                        const rawUrl = typeof doc === 'object' ? (doc.url || doc.fileUrl || doc.path || doc.dataUrl || doc.data || doc.src || doc.previewUrl) : (typeof doc === 'string' ? doc : null);
                        const docTitle = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.comment || doc.fileName || ('Document ' + (dIdx + 1)));
                        const docFileName = documentFileName(doc, rawUrl);
                        const isImg = (typeof rawUrl === 'string' && (rawUrl.startsWith('data:image/') || docFileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)));
                        const docBlobUrl = resolveDocumentUrl(rawUrl);

                        return (
                          <div key={dIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-0 flex flex-col justify-between space-y-3 hover:border-[#D99A1C] hover:shadow-xs transition-all">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D99A1C] border border-amber-200/60 flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs">
                                  📄
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-black text-slate-900 truncate" title={docTitle}>{docTitle}</p>
                                  <p className="text-[10px] text-slate-400 font-medium truncate" title={docFileName}>{docFileName}</p>
                                </div>
                              </div>
                              <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                Verified
                              </span>
                            </div>

                            {/* Action Controls: Expand & Download */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                              <ActionButton
                                type="button"
                                disabled={!docBlobUrl}
                                onClick={() => {
                                  setPreviewModalDoc({
                                    title: docTitle,
                                    fileName: docFileName,
                                    previewUrl: docBlobUrl,
                                    rawUrl: rawUrl,
                                    type: isImg ? 'image' : 'pdf'
                                  });
                                }}
                                className="min-w-0 flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <span>🔍 Expand</span>
                              </ActionButton>
                              <ActionButton
                                type="button"
                                onClick={() => handleDownloadAppDocument(rawUrl, docFileName)}
                                disabled={!docBlobUrl}
                                className="min-w-0 flex-1 py-1.5 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
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

              {/* Comments panel expands to show the full history on demand. */}
              <div className="min-w-0 p-4 sm:p-6 flex flex-col lg:col-span-2">
                

                {/* Add Comment Input Form */}
                <ActionForm onSubmit={handleAddComment} className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 my-3 shrink-0">
                  <label className="text-xs font-black text-slate-800 block uppercase tracking-wider">Add Internal Note / Staff Comment</label>
                  <textarea
                    rows="2"
                    value={newCommentInput}
                    onChange={(e) => setNewCommentInput(e.target.value)}
                    placeholder="Write a comment or internal note regarding offer status, document verification, or university follow-up..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all font-medium resize-none"
                  ></textarea>
                  <div className="flex flex-wrap gap-3 justify-between items-center pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold">Visible to internal admin &amp; staff members</span>
                    <ActionButton
                      type="submit"
                      disabled={!newCommentInput.trim() || isPostingComment}
                      className="px-4 py-1.5 bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:from-[#c28815] hover:to-[#e09e1d] text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                    >
                      {isPostingComment && (
                        <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <span>{isPostingComment ? 'Posting...' : '💬 Post Comment'}</span>
                    </ActionButton>
                  </div>
                </ActionForm>

                {/* Show the latest three entries until the full history is expanded. */}
                <div id="application-comments-history" className="space-y-3 break-words">
                  {commentsList.length > 0 ? (
                    (commentsExpanded ? commentsList : commentsList.slice(0, 3)).map((c, cIdx) => (
                      <div key={c.id || cIdx} className="bg-slate-50/80 border border-slate-200/80 p-3.5 rounded-2xl space-y-2">
                        <div className="flex flex-wrap gap-3 justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 shrink-0 rounded-full bg-[#0A0A0F] text-[#D99A1C] flex items-center justify-center font-bold text-[10px]">
                              <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 block leading-tight">{c.author}</span>
                              <span className="text-[9px] font-bold text-[#D99A1C] uppercase">{c.role || 'Staff Member'}</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', hour12: true }) : 'Recently'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-150">
                          {c.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 px-4 text-center space-y-1.5 border border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
                      <span className="text-xl block">💬</span>
                      <p className="text-xs font-bold text-slate-700">No internal notes recorded yet</p>
                      <p className="text-[10px] text-slate-400 font-medium">Use the form above to add internal notes regarding offer status, document verification, or university follow-up.</p>
                    </div>
                  )}
                </div>
                {commentsList.length > 3 && (
                  <ActionButton
                    type="button"
                    onClick={() => setCommentsExpanded(expanded => !expanded)}
                    aria-expanded={commentsExpanded}
                    aria-controls="application-comments-history"
                    className="mt-4 self-center px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    {commentsExpanded ? 'View less' : `View more (${commentsList.length - 3})`}
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
          </section>
        ) : (
          <ApplicationMessagesActivity
            app={singleViewApp}
            commentsList={commentsList}
            onAddComment={handleAddComment}
            isPostingComment={isPostingComment}
            currentUser={currentUser}
            onRefresh={onRefresh}
          />
        )}
        </div>
      )}

      </div>

      {/* Edit Application Page */}
      {editModalApp && (
        <div className="w-full min-w-0">
          <div className="bg-white rounded-2xl w-full p-4 sm:p-6 shadow-sm border border-slate-200 border-t-4 border-t-[#D99A1C] space-y-6 [overflow-wrap:anywhere]">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Edit Application</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Applicant: <strong className="text-slate-900">{editModalApp.studentName}</strong> ({editModalApp.camsId || 'Application file'})
                </p>
              </div>
              <ActionButton
                onClick={() => setEditModalApp(null)}
                className="self-start inline-flex items-center gap-2 text-slate-700 hover:bg-slate-100 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleSaveEditApplication} className="grid grid-cols-1 items-stretch gap-6 text-left lg:grid-cols-2">
              <section className="min-w-0 h-full space-y-5 rounded-xl border border-slate-200 p-4 sm:p-5">
                
              {/* Destination Country (FIRST) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Destination Country <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={editCountry}
                  onChange={(e) => {
                    setEditCountry(e.target.value);
                    setEditUniversity('');
                    setEditCourse('');
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer"
                >
                  <option value="">-- Choose Country First --</option>
                  {availableCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SearchableSelect>
              </div>

              {/* Destination University (filtered by Country) */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    Destination University <span className="text-rose-500">*</span>
                  </label>
                </div>
                <SearchableSelect searchLabel="Search universities..."
                  value={editUniversity}
                  disabled={!editCountry}
                  onChange={(e) => {
                    setEditUniversity(e.target.value);
                    setEditCourse('');
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">
                    {!editCountry 
                      ? '-- Select Country First --' 
                      : editFilteredUniversities.length === 0 
                        ? `-- No Universities in ${editCountry} --` 
                        : '-- Select University --'}
                  </option>
                  {editFilteredUniversities.map(u => {
                    const value = typeof u === 'object' ? u._id : u;
                    const label = typeof u === 'object' ? u.name : u;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </SearchableSelect>
                {editCountry && (
                  <p className="text-[11px] font-bold text-[#D99A1C]">
                    {editFilteredUniversities.length} institution{editFilteredUniversities.length !== 1 ? 's' : ''} in {editCountry}
                  </p>
                )}
                {editCountry && editFilteredUniversities.length === 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-1">
                    ⚠️ No partner institutions found in {editCountry}. Please select another country.
                  </p>
                )}
              </div>
              </div>

              {/* Academic Program (filtered by University) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Academic Program <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect searchLabel="Search courses..."
                  value={editCourse}
                  disabled={!editUniversity}
                  onChange={(e) => setEditCourse(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">
                    {!editUniversity ? '-- Please Select a University First --' : '-- Choose Course --'}
                  </option>
                  {editFilteredCourses.map(c => {
                    const value = typeof c === 'object' ? c._id : c;
                    const label = typeof c === 'object' ? c.title : c;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </SearchableSelect>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Intake Season */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Intake Season *
                </label>
                <SearchableSelect
                  value={editIntake}
                  onChange={(e) => setEditIntake(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer"
                >
                  <option value="">Select intake</option>
                  {editIntake && !intakes.some(i => (typeof i === 'object' ? i.title : i) === editIntake) && <option value={editIntake}>{editIntake}</option>}
                  {intakes.map(i => {
                    const value = typeof i === 'object' ? i.title : i;
                    return <option key={value} value={value}>{value}</option>;
                  })}
                </SearchableSelect>
              </div>

              {/* Level of Study */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Level of Study *
                </label>
                <SearchableSelect
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer"
                >
                  <option value="Undergraduate (UG)">Undergraduate (UG)</option>
                  <option value="Postgraduate (PG)">Postgraduate (PG)</option>
                  <option value="PhD">PhD</option>
                </SearchableSelect>
              </div>
              </div>

              </section>
              <section className="min-w-0 h-full space-y-5 rounded-xl border border-slate-200 p-4 sm:p-5">
                
              {/* Student Details */}
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selected student</p>
                  <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                    <div className="min-w-0"><span className="text-slate-400 font-bold">Email:</span> <span className="break-words font-semibold text-slate-800">{editStudentEmail || editModalApp?.studentEmail || 'Not provided'}</span></div>
                    <div className="min-w-0"><span className="text-slate-400 font-bold">Passport:</span> <span className="break-words font-semibold text-slate-800">{editModalApp?.passportNo || editModalApp?.student?.passportNo || 'Not provided'}</span></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Student Name</label>
                  <input
                    type="text"
                    value={editStudentName}
                    onChange={(e) => setEditStudentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Phone</label>
                  <ValidatedInput validationKind="phone"
                    type="text"
                    value={editStudentPhone}
                    onChange={(e) => setEditStudentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Internal Application Notes</label>
                <textarea
                  rows="6"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes regarding academic profile, conditions, or admissions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                />
              </div>

              </section>
              <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-5 border-t border-slate-200">
                <ActionButton
                  type="button"
                  onClick={() => setEditModalApp(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:scale-[1.01] text-white font-extrabold text-xs shadow-md transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  {isSavingEdit && (
                    <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </ActionButton>
              </div>
            </ActionForm>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalApp && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Update Application Status</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Student: <strong className="text-slate-900">{statusModalApp.studentName}</strong> ({statusModalApp.camsId})</p>
              </div>
              <ActionButton
                onClick={() => setStatusModalApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleStatusUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Stage / Status</label>
                <SearchableSelect
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] cursor-pointer"
                >
                  {STATUS_STEPS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </SearchableSelect>
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
                <ActionButton
                  type="button"
                  onClick={() => setStatusModalApp(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </ActionButton>
                <ActionButton
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
                </ActionButton>
              </div>
            </ActionForm>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Staff Modal */}
      {assignModalApp && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Assign Staff Member</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Student: <strong className="text-slate-900">{assignModalApp.studentName}</strong> ({assignModalApp.camsId})</p>
              </div>
              <ActionButton
                onClick={() => setAssignModalApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Handling Staff Member</label>
                <SearchableSelect
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
                </SearchableSelect>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <ActionButton
                  type="button"
                  onClick={() => setAssignModalApp(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </ActionButton>
                <ActionButton
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
                </ActionButton>
              </div>
            </ActionForm>
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
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-center select-none animate-fade-in overflow-y-auto">
          <div className="relative bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl p-4 sm:p-6 w-full max-w-3xl shadow-2xl flex flex-col my-auto max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-[#D99A1C] uppercase tracking-wider block">Application Document Preview</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">{previewModalDoc.title}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{previewModalDoc.fileName}</p>
              </div>
              <ActionButton
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                ✕
              </ActionButton>
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
                  <ActionButton
                    type="button"
                    onClick={() => handleDownloadAppDocument(previewModalDoc.rawUrl || previewModalDoc.previewUrl, previewModalDoc.fileName)}
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
    </div>
  );
}
