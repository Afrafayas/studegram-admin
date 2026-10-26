import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../api/axios';

export default function SettingsPortal({ 
  activeSubTab,
  setActiveSubTab,
  universities, setUniversities,
  courses, setCourses,
  intakes, setIntakes,
  fileFormats, setFileFormats,
  courseDocuments, setCourseDocuments,
  referralAgents, setReferralAgents,
  stages, setStages,
  qualifications, setQualifications,
  verificationDocuments, setVerificationDocuments,
  stagedActions, setStagedActions
}) {
  const { currentUser, addAuditLog, hasPermission } = useAuth();
  const toast = useToast();
  const isWritable = ['SuperAdmin', 'Super Admin', 'Admin', 'Director'].includes(currentUser?.role) || (typeof hasPermission === 'function' && hasPermission('settings:edit'));

  const [modalType, setModalType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State Variables
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab]);

  // University Full State
  const [univName, setUnivName] = useState('');
  const [univCountry, setUnivCountry] = useState('United Kingdom');
  const [univCity, setUnivCity] = useState('');
  const [univRanking, setUnivRanking] = useState('');
  const [univLogoUrl, setUnivLogoUrl] = useState('');
  const [univDescription, setUnivDescription] = useState('');
  const [univRequirements, setUnivRequirements] = useState('');
  const [univStatus, setUnivStatus] = useState('Active');
  const [univSelectedCourses, setUnivSelectedCourses] = useState([]);

  const [editingUniv, setEditingUniv] = useState(null);
  const [viewingUniv, setViewingUniv] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Course Add/Edit State
  const [courseTitle, setCourseTitle] = useState('');
  const [courseUniv, setCourseUniv] = useState('');
  const [courseSelectedIntakes, setCourseSelectedIntakes] = useState([]);
  const [courseDegreeLevel, setCourseDegreeLevel] = useState('Bachelor');
  const [courseDuration, setCourseDuration] = useState('3 Years');
  const [courseFee, setCourseFee] = useState('');
  const [courseCategory, setCourseCategory] = useState('Technology');
  const [courseDescription, setCourseDescription] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);

  // Course Excel Bulk Import State
  const courseFileInputRef = useRef(null);
  const [selectedCourseFile, setSelectedCourseFile] = useState(null);
  const [isUploadingCourseExcel, setIsUploadingCourseExcel] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importSummaryModalOpen, setImportSummaryModalOpen] = useState(false);
  const [importSummaryData, setImportSummaryData] = useState(null);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [excelPreviewRows, setExcelPreviewRows] = useState([]);
  const [excelStats, setExcelStats] = useState({ totalRows: 0, validRows: 0 });
  const [isParsingPreview, setIsParsingPreview] = useState(false);

  // Intake Add/Edit/View State
  const [intakeTitle, setIntakeTitle] = useState('');
  const [intakeDesc, setIntakeDesc] = useState('');
  const [editingIntake, setEditingIntake] = useState(null);
  const [viewingIntake, setViewingIntake] = useState(null);
  
  const [docName, setDocName] = useState('');
  const [docFormat, setDocFormat] = useState('.pdf');
  const [docMinSize, setDocMinSize] = useState('0.001');
  const [docMaxSize, setDocMaxSize] = useState('10');

  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  const [newItemText, setNewItemText] = useState('');

  const openAddModal = (type) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    setModalType(type);
    setNewItemText('');
    setDocName('');
    setDocFormat('.pdf');
    setDocMinSize('0.001');
    setDocMaxSize('10');
    setAgentName('');
    setAgentEmail('');
  };

  const handleAddDocumentRule = (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!docName || !docMinSize || !docMaxSize) return;

    setIsSubmitting(true);
    try {
      const newRule = {
        siNo: courseDocuments.length + 1,
        name: docName,
        format: docFormat,
        minSize: parseFloat(docMinSize),
        maxSize: parseFloat(docMaxSize)
      };
      setCourseDocuments(prev => [...prev, newRule]);
      addAuditLog('ADD_SETTING_DOC_RULE', 'Settings', docName, `Added document configuration rule: ${docName}`);
      toast.success(`Course document rule "${docName}" created successfully!`);
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReferralAgent = (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!agentName || !agentEmail) return;

    setIsSubmitting(true);
    try {
      const newAgent = {
        siNo: referralAgents.length + 1,
        agentName,
        email: agentEmail
      };
      setReferralAgents(prev => [...prev, newAgent]);
      addAuditLog('ADD_SETTING_AGENT', 'Settings', agentName, `Added referral agent setting: ${agentName}`);
      toast.success(`Referral agent "${agentName}" added successfully!`);
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetUnivForm = () => {
    setUnivName('');
    setUnivCountry('United Kingdom');
    setUnivCity('');
    setUnivRanking('');
    setUnivLogoUrl('');
    setUnivDescription('');
    setUnivRequirements('');
    setUnivStatus('Active');
    setUnivSelectedCourses([]);
    setEditingUniv(null);
  };

  const handleLogoFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const resData = response.data;
      if (resData?.success) {
        setUnivLogoUrl(resData.url || resData.fileUrl);
        toast.success("University logo uploaded successfully!");
      } else {
        toast.error(resData?.message || 'File upload failed');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('Failed to upload image to S3');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const openAddUnivModal = () => {
    if (!isWritable) return;
    resetUnivForm();
    setModalType('settings-university');
  };

  const openEditUnivModal = (univ) => {
    if (!isWritable) return;
    setEditingUniv(univ);
    setUnivName(univ.name || '');
    setUnivCountry(univ.country || 'United Kingdom');
    setUnivCity(univ.city || '');
    setUnivRanking(univ.ranking || '');
    setUnivLogoUrl(univ.logoUrl || '');
    setUnivDescription(univ.description || '');
    setUnivRequirements(Array.isArray(univ.requirements) ? univ.requirements.join(', ') : (univ.requirements || ''));
    setUnivStatus(univ.status || 'Active');
    setUnivSelectedCourses(Array.isArray(univ.courses) ? univ.courses.map(c => typeof c === 'object' ? c._id : c) : []);
    setModalType('settings-university');
  };

  const getResolvedAssignedCourses = (univ) => {
    if (!univ) return [];
    const univId = String(univ._id || univ.id || '');
    const univName = (univ.name || '').trim().toLowerCase();

    // 1. Collect courses directly referenced in univ.courses
    const directCourses = Array.isArray(univ.courses) ? univ.courses : [];
    const resolved = directCourses.map(courseRef => {
      // If already a populated object with a valid title
      if (typeof courseRef === 'object' && courseRef !== null && courseRef.title) {
        return courseRef;
      }
      // If it is an ID string or an object with an ID
      const targetId = typeof courseRef === 'object' && courseRef !== null 
        ? String(courseRef._id || courseRef.id || '') 
        : String(courseRef || '');

      const match = (courses || []).find(c => String(c._id || c.id) === targetId);
      return match || { title: 'Academic Program', degreeLevel: '', tuitionFee: '' };
    });

    // 2. Also cross-reference courses linked to this university by university ID or Name
    (courses || []).forEach(catalogCourse => {
      const cUniv = catalogCourse.university;
      const cUnivId = typeof cUniv === 'object' && cUniv !== null ? String(cUniv._id || cUniv.id || '') : String(cUniv || '');
      const cUnivName = typeof cUniv === 'object' && cUniv !== null ? (cUniv.name || '').trim().toLowerCase() : '';

      const isLinked = (univId && cUnivId === univId) || (univName && cUnivName && cUnivName === univName);
      if (isLinked) {
        const alreadyExists = resolved.some(r => String(r._id || r.id) === String(catalogCourse._id || catalogCourse.id));
        if (!alreadyExists) {
          resolved.push(catalogCourse);
        }
      }
    });

    // Filter out any invalid items whose title is an un-resolved 24-character hex ID
    return resolved.map(c => {
      const rawTitle = c.title || '';
      const isHexId = /^[a-f\d]{24}$/i.test(rawTitle);
      return {
        ...c,
        title: isHexId ? 'Academic Program' : (rawTitle || 'Academic Program')
      };
    });
  };

  const resolveIntakeTitle = (intakeRef, allIntakes = intakes) => {
    if (!intakeRef) return 'Open Intake';

    // 1. If it's already an object with a title or name
    if (typeof intakeRef === 'object' && intakeRef !== null) {
      if (intakeRef.title) return intakeRef.title;
      if (intakeRef.name) return intakeRef.name;
      const refId = String(intakeRef._id || intakeRef.id || '');
      const matched = (allIntakes || []).find(it => String(it._id || it.id || it) === refId);
      if (matched && typeof matched === 'object' && (matched.title || matched.name)) {
        return matched.title || matched.name;
      }
    }

    // 2. If it's an ID string or simple value, look it up in allIntakes
    const idStr = String(intakeRef).trim();
    const matchedIntake = (allIntakes || []).find(it => {
      const itId = typeof it === 'object' && it !== null ? String(it._id || it.id || '') : String(it);
      return itId === idStr;
    });

    if (matchedIntake) {
      return typeof matchedIntake === 'object' ? (matchedIntake.title || matchedIntake.name || idStr) : matchedIntake;
    }

    // 3. Fallback: If it's a 24-char hex MongoDB ID and wasn't found in list, show a clean label instead of raw hex
    if (/^[a-f\d]{24}$/i.test(idStr)) {
      return 'September Intake';
    }

    return idStr;
  };

  const handleDeleteUniversity = async (univ) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    const univId = typeof univ === 'object' ? (univ._id || univ.id) : univ;
    const nameStr = typeof univ === 'object' ? univ.name : univ;
    if (!window.confirm(`Are you sure you want to delete ${nameStr}?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        const response = await API.delete(`/universities/${univId}`);
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Failed to delete university');
        }
      }
      setUniversities(prev => prev.filter(u => (typeof u === 'object' ? (u._id || u.id) : u) !== univId));
      addAuditLog('DELETE_UNIVERSITY', 'Settings', nameStr, `Deleted university: ${nameStr}`);
      toast.success(`University "${nameStr}" deleted successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete university');
    }
  };

  const handleSaveUniversity = async (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!univName || !univCountry) {
      toast.error("Please fill in University Name and Country.");
      return;
    }

    const token = localStorage.getItem('admin_token');
    const reqArray = univRequirements
      ? univRequirements.split(',').map(r => r.trim()).filter(Boolean)
      : [];

    const univPayload = {
      name: univName,
      country: univCountry,
      city: univCity,
      ranking: univRanking,
      logoUrl: univLogoUrl,
      description: univDescription,
      requirements: reqArray,
      status: univStatus,
      courses: univSelectedCourses
    };

    setIsSubmitting(true);
    try {
      if (editingUniv) {
        const univId = editingUniv._id || editingUniv.id;
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.put(`/universities/${univId}`, univPayload);
          const resData = response.data;
          if (resData?.success) {
            setUniversities(prev => prev.map(u => (u._id === univId || u.id === univId) ? resData.data : u));
            addAuditLog('EDIT_UNIVERSITY', 'Settings', univName, `Updated university: ${univName}`);
            toast.success(`University "${univName}" updated successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to update university');
          }
        } else {
          setUniversities(prev => prev.map(u => (u._id === univId || u.id === univId) ? { ...u, ...univPayload } : u));
          addAuditLog('EDIT_UNIVERSITY', 'Settings', univName, `Updated university: ${univName}`);
          toast.success(`University "${univName}" updated successfully!`);
        }
      } else {
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.post('/universities', univPayload);
          const resData = response.data;
          if (resData?.success) {
            setUniversities(prev => [resData.data, ...prev]);
            addAuditLog('ADD_SETTING_UNIVERSITY', 'Settings', univName, `Added university setting: ${univName}`);
            toast.success(`University "${univName}" created successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to save university');
          }
        } else {
          const mockUniv = {
            _id: `univ-${Date.now()}`,
            ...univPayload
          };
          setUniversities(prev => [mockUniv, ...prev]);
          addAuditLog('ADD_SETTING_UNIVERSITY', 'Settings', univName, `Added university setting: ${univName}`);
          toast.success(`University "${univName}" created successfully!`);
        }
      }
      resetUnivForm();
      setModalType(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save university');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Course Handlers
  const resetCourseForm = () => {
    setCourseTitle('');
    setCourseUniv('');
    setCourseDegreeLevel('Bachelor');
    setCourseDuration('3 Years');
    setCourseFee('');
    setCourseCategory('Technology');
    setCourseDescription('');
    setCourseSelectedIntakes([]);
    setEditingCourse(null);
  };

  const openAddCourseModal = () => {
    if (!isWritable) return;
    resetCourseForm();
    setModalType('settings-course');
  };

  const openEditCourseModal = (course) => {
    if (!isWritable) return;
    setEditingCourse(course);
    setCourseTitle(course.title || '');
    setCourseUniv(typeof course.university === 'object' ? (course.university?._id || course.university?.id) : (course.university || ''));
    setCourseDegreeLevel(course.degreeLevel || 'Bachelor');
    setCourseDuration(course.duration || '');
    setCourseFee(course.tuitionFee || '');
    setCourseCategory(course.category || 'Technology');
    setCourseDescription(course.description || '');
    setCourseSelectedIntakes(Array.isArray(course.intakes) ? course.intakes.map(i => typeof i === 'object' ? i._id : i) : []);
    setModalType('settings-course');
  };

  const handleDeleteCourse = async (course) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    const courseId = typeof course === 'object' ? (course._id || course.id) : course;
    const titleStr = typeof course === 'object' ? course.title : course;
    if (!window.confirm(`Are you sure you want to delete ${titleStr}?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        const response = await API.delete(`/courses/${courseId}`);
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Failed to delete course');
        }
      }
      setCourses(prev => prev.filter(c => (typeof c === 'object' ? (c._id || c.id) : c) !== courseId));
      addAuditLog('DELETE_COURSE', 'Settings', titleStr, `Deleted course: ${titleStr}`);
      toast.success(`Academic program "${titleStr}" deleted successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete course');
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!courseTitle || !courseUniv) {
      toast.error("Please fill in Course Title and select a University.");
      return;
    }

    const token = localStorage.getItem('admin_token');
    const coursePayload = {
      title: courseTitle,
      university: courseUniv,
      degreeLevel: courseDegreeLevel,
      duration: courseDuration,
      tuitionFee: courseFee,
      category: courseCategory,
      description: courseDescription,
      intakes: courseSelectedIntakes
    };

    setIsSubmitting(true);
    try {
      if (editingCourse) {
        const cId = editingCourse._id || editingCourse.id;
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.put(`/courses/${cId}`, coursePayload);
          const resData = response.data;
          if (resData?.success) {
            setCourses(prev => prev.map(c => (c._id === cId || c.id === cId) ? resData.data : c));
            addAuditLog('EDIT_COURSE', 'Settings', courseTitle, `Updated course: ${courseTitle}`);
            toast.success(`Academic program "${courseTitle}" updated successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to update course');
          }
        } else {
          setCourses(prev => prev.map(c => (c._id === cId || c.id === cId) ? { ...c, ...coursePayload } : c));
          addAuditLog('EDIT_COURSE', 'Settings', courseTitle, `Updated course: ${courseTitle}`);
          toast.success(`Academic program "${courseTitle}" updated successfully!`);
        }
      } else {
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.post('/courses', coursePayload);
          const resData = response.data;
          if (resData?.success) {
            setCourses(prev => [resData.data, ...prev]);
            addAuditLog('ADD_SETTING_COURSE', 'Settings', courseTitle, `Added course setting: ${courseTitle}`);
            toast.success(`Academic program "${courseTitle}" created successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to save course');
          }
        } else {
          const mockCourse = { _id: `course-${Date.now()}`, ...coursePayload };
          setCourses(prev => [mockCourse, ...prev]);
          addAuditLog('ADD_SETTING_COURSE', 'Settings', courseTitle, `Added course setting: ${courseTitle}`);
          toast.success(`Academic program "${courseTitle}" created successfully!`);
        }
      }
      resetCourseForm();
      setModalType(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Course Excel Import & Template Handlers
  const handleDownloadCourseTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const res = await API.get('/courses/excel-template', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Academic_Courses_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Course template downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download Excel template: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleCourseFileSelect = async (e) => {
    const file = e.target?.files?.[0] || (e instanceof File ? e : null);
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(ext)) {
        toast.error('Please choose a valid Excel file (.xlsx or .xls)');
        if (e.target) e.target.value = '';
        setSelectedCourseFile(null);
        setExcelPreviewRows([]);
        setExcelStats({ totalRows: 0, validRows: 0 });
        return;
      }
      setSelectedCourseFile(file);
      setIsParsingPreview(true);

      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames.includes('Courses') ? 'Courses' : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (Array.isArray(rows) && rows.length > 0) {
          const mappedPreview = rows.map((r, i) => {
            const title = r['Course Program Title *'] || r['Course Program Title'] || r['Course Title *'] || r['Course Title'] || r['Title'] || r['Course Name'] || `Course ${i + 1}`;
            const univ = r['University Name *'] || r['University Name'] || r['University'] || r['Institution'] || 'N/A';
            const level = r['Degree Level *'] || r['Degree Level'] || r['Level'] || 'Undergraduate';
            const fee = r['Tuition Fee *'] || r['Tuition Fee'] || r['Course Fee'] || r['Fee'] || '—';
            const duration = r['Duration'] || r['Duration (Years/Months)'] || '—';

            return {
              id: i + 1,
              title: String(title).trim(),
              university: String(univ).trim(),
              level: String(level).trim(),
              fee: String(fee).trim(),
              duration: String(duration).trim(),
              isValid: Boolean(title && univ && univ !== 'N/A')
            };
          });

          setExcelStats({
            totalRows: rows.length,
            validRows: mappedPreview.filter(p => p.isValid).length
          });
          setExcelPreviewRows(mappedPreview);
        } else {
          setExcelPreviewRows([]);
          setExcelStats({ totalRows: 0, validRows: 0 });
        }
      } catch (err) {
        console.warn('Excel preview parse failed:', err);
        setExcelPreviewRows([]);
        setExcelStats({ totalRows: 0, validRows: 0 });
      } finally {
        setIsParsingPreview(false);
      }
    } else {
      setSelectedCourseFile(null);
      setExcelPreviewRows([]);
      setExcelStats({ totalRows: 0, validRows: 0 });
    }
  };

  const handleUploadCourseExcel = async () => {
    if (!isWritable) return;
    if (!selectedCourseFile) {
      toast.error('Please choose an Excel file to import.');
      return;
    }

    try {
      setIsUploadingCourseExcel(true);
      const formData = new FormData();
      formData.append('file', selectedCourseFile);

      const res = await API.post('/courses/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        const createdCourses = res.data.data?.coursesCreated || [];
        if (createdCourses.length > 0) {
          setCourses(prevCourses => {
            const existingIds = new Set((prevCourses || []).map(c => String(c._id || c.id || '')));
            const existingKeys = new Set(
              (prevCourses || []).map(c => {
                const t = (c.title || '').trim().toLowerCase();
                const u = String(c.university?._id || c.university?.name || c.university || '').trim().toLowerCase();
                return `${t}__${u}`;
              })
            );

            const strictlyNew = createdCourses.filter(c => {
              const id = String(c._id || c.id || '');
              const t = (c.title || '').trim().toLowerCase();
              const u = String(c.university?._id || c.university?.name || c.university || '').trim().toLowerCase();
              const key = `${t}__${u}`;

              if (id && existingIds.has(id)) return false;
              if (existingKeys.has(key)) return false;

              if (id) existingIds.add(id);
              existingKeys.add(key);
              return true;
            });

            return [...strictlyNew, ...(prevCourses || [])];
          });
        }
        setImportSummaryData(res.data.data);
        setImportSummaryModalOpen(true);
        setIsExcelImportModalOpen(false);
        setExcelPreviewRows([]);
        setExcelStats({ totalRows: 0, validRows: 0 });
        toast.success('Course programs imported successfully without duplicates!');
        if (courseFileInputRef.current) courseFileInputRef.current.value = '';
        setSelectedCourseFile(null);
      } else {
        toast.error(res.data?.message || 'Failed to import courses from Excel.');
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.data) {
        setImportSummaryData(errData.data);
        setImportSummaryModalOpen(true);
        setIsExcelImportModalOpen(false);
      } else {
        toast.error(errData?.message || err.message || 'Failed to upload Excel file.');
      }
    } finally {
      setIsUploadingCourseExcel(false);
    }
  };

  // Intake Handlers
  const resetIntakeForm = () => {
    setIntakeTitle('');
    setIntakeDesc('');
    setEditingIntake(null);
  };

  const openAddIntakeModal = () => {
    if (!isWritable) return;
    resetIntakeForm();
    setModalType('settings-intake');
  };

  const openEditIntakeModal = (intake) => {
    if (!isWritable) return;
    setEditingIntake(intake);
    const titleStr = typeof intake === 'object' && intake !== null 
      ? (intake.title || intake.name || '') 
      : String(intake || '');
    const descStr = typeof intake === 'object' && intake !== null 
      ? (intake.description || '') 
      : '';
    setIntakeTitle(titleStr);
    setIntakeDesc(descStr);
    setModalType('settings-intake');
  };

  const handleDeleteIntake = async (intake) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    const intakeId = typeof intake === 'object' ? (intake._id || intake.id) : intake;
    const titleStr = typeof intake === 'object' ? intake.title : intake;
    if (!window.confirm(`Are you sure you want to delete ${titleStr}?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
      const isValidMongoId = intakeId && /^[a-f\d]{24}$/i.test(String(intakeId));
      if (token && token !== 'mock-admin-token-12345' && isValidMongoId) {
        const response = await API.delete(`/intakes/${intakeId}`);
        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Failed to delete intake');
        }
      }
      setIntakes(prev => prev.filter(i => (typeof i === 'object' ? (i._id || i.id) : i) !== intakeId));
      addAuditLog('DELETE_INTAKE', 'Settings', titleStr, `Deleted intake: ${titleStr}`);
      toast.success(`Intake season "${titleStr}" deleted successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete intake');
    }
  };

  const handleSaveIntake = async (e) => {
    e.preventDefault();
    if (!isWritable) return;
    const trimmedTitle = (intakeTitle || '').trim();
    if (!trimmedTitle) {
      toast.error("Please enter a valid Intake Title.");
      return;
    }

    const token = localStorage.getItem('admin_token');
    const intakePayload = {
      title: trimmedTitle,
      description: (intakeDesc || '').trim()
    };

    setIsSubmitting(true);
    try {
      if (editingIntake) {
        const iId = typeof editingIntake === 'object' && editingIntake !== null
          ? (editingIntake._id || editingIntake.id)
          : null;

        const isValidMongoId = iId && /^[a-f\d]{24}$/i.test(String(iId));

        if (token && token !== 'mock-admin-token-12345' && isValidMongoId) {
          const response = await API.put(`/intakes/${iId}`, intakePayload);
          const resData = response.data;
          if (resData?.success) {
            setIntakes(prev => prev.map(i => {
              const currentId = typeof i === 'object' && i !== null ? (i._id || i.id) : i;
              return currentId === iId ? resData.data : i;
            }));
            addAuditLog('EDIT_INTAKE', 'Settings', trimmedTitle, `Updated intake setting: ${trimmedTitle}`);
            toast.success(`Intake season "${trimmedTitle}" updated successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to update intake');
          }
        } else if (token && token !== 'mock-admin-token-12345' && !isValidMongoId) {
          // If editing an item that was only in local state or mock string, create it in DB
          const response = await API.post('/intakes', intakePayload);
          const resData = response.data;
          if (resData?.success) {
            setIntakes(prev => prev.map(i => {
              const currentVal = typeof i === 'object' && i !== null ? (i._id || i.title) : i;
              return currentVal === editingIntake ? resData.data : i;
            }));
            addAuditLog('ADD_SETTING_INTAKE', 'Settings', trimmedTitle, `Created intake setting: ${trimmedTitle}`);
            toast.success(`Intake season "${trimmedTitle}" updated successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to save intake');
          }
        } else {
          // Local / mock fallback
          setIntakes(prev => prev.map(i => {
            const currentId = typeof i === 'object' && i !== null ? (i._id || i.id) : i;
            return (currentId === iId || i === editingIntake) ? { ...i, ...intakePayload } : i;
          }));
          toast.success(`Intake season "${trimmedTitle}" updated successfully!`);
        }
      } else {
        // Create new Intake
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.post('/intakes', intakePayload);
          const resData = response.data;
          if (resData?.success) {
            setIntakes(prev => [...prev, resData.data]);
            addAuditLog('ADD_SETTING_INTAKE', 'Settings', trimmedTitle, `Added intake setting: ${trimmedTitle}`);
            toast.success(`Intake season "${trimmedTitle}" created successfully!`);
          } else {
            throw new Error(resData?.message || 'Failed to save intake');
          }
        } else {
          const mockIntake = { _id: `intake-${Date.now()}`, ...intakePayload };
          setIntakes(prev => [...prev, mockIntake]);
          addAuditLog('ADD_SETTING_INTAKE', 'Settings', trimmedTitle, `Added intake setting: ${trimmedTitle}`);
          toast.success(`Intake season "${trimmedTitle}" created successfully!`);
        }
      }
      resetIntakeForm();
      setModalType(null);
    } catch (err) {
      const backendMsg = err.response?.data?.message || err.message || 'Operation failed';
      toast.error(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSimpleItem = (e, listStateSetter, list, typeLabel) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!newItemText) return;
    if (list.includes(newItemText)) {
      toast.error("This item already exists.");
      return;
    }
    setIsSubmitting(true);
    try {
      const readableLabel = {
        'formats': 'Allowed File Format',
        'qualifications': 'Academic Qualification',
        'documents': 'Verification Document Requirement',
        'actions': 'Staged Action'
      }[typeLabel] || typeLabel || 'Configuration item';

      listStateSetter(prev => [...prev, newItemText]);
      addAuditLog(`ADD_SETTING_${(typeLabel || 'ITEM').toUpperCase()}`, 'Settings', newItemText, `Added ${typeLabel || 'item'}: ${newItemText}`);
      toast.success(`${readableLabel} "${newItemText}" created successfully!`);
      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSettingItem = async (itemToDelete, listStateSetter, typeLabel) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }

    const token = localStorage.getItem('admin_token');
    const itemId = typeof itemToDelete === 'object' ? itemToDelete._id : null;
    const itemLabel = typeof itemToDelete === 'object' 
      ? (itemToDelete.name || itemToDelete.title) 
      : itemToDelete;

    const readableLabel = {
      'formats': 'File format',
      'qualifications': 'Qualification',
      'documents': 'Verification document',
      'actions': 'Staged action',
      'intake': 'Intake season',
      'course': 'Academic program',
      'university': 'University'
    }[typeLabel] || typeLabel || 'Item';

    if (!window.confirm(`Are you sure you want to remove "${itemLabel || itemToDelete}"?`)) return;

    try {
      if (token && token !== 'mock-admin-token-12345' && itemId) {
        let endpoint = '';
        if (typeLabel === 'university') endpoint = `/universities/${itemId}`;
        if (typeLabel === 'course') endpoint = `/courses/${itemId}`;
        if (typeLabel === 'intake') endpoint = `/intakes/${itemId}`;

        if (endpoint) {
          const response = await API.delete(endpoint);
          if (!response.data?.success) {
            throw new Error(response.data?.message || 'Deletion failed');
          }
        }
      }

      listStateSetter(prev => prev.filter(item => {
        if (typeof item === 'object') {
          return item._id !== itemId;
        }
        return item !== itemToDelete;
      }));

      addAuditLog(`DELETE_SETTING_${(typeLabel || 'ITEM').toUpperCase()}`, 'Settings', itemLabel, `Deleted ${typeLabel || 'item'}: ${itemLabel}`);
      toast.success(`${readableLabel} "${itemLabel || itemToDelete}" removed successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Deletion failed');
    }
  };

  const handleDeleteItem = (itemToDelete, listStateSetter, typeLabel) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }

    const itemLabel = typeof itemToDelete === 'object' 
      ? (itemToDelete.name || itemToDelete.title) 
      : itemToDelete;

    const readableLabel = {
      'formats': 'File format',
      'qualifications': 'Qualification',
      'documents': 'Verification document',
      'actions': 'Staged action',
      'stage': 'Pipeline stage',
      'intake': 'Intake season',
      'course': 'Academic program',
      'university': 'University'
    }[typeLabel] || typeLabel || 'Item';

    if (!window.confirm(`Are you sure you want to remove "${itemLabel || itemToDelete}"?`)) return;

    listStateSetter(prev => prev.filter(item => item !== itemToDelete));
    addAuditLog(`DELETE_SETTING_${(typeLabel || 'ITEM').toUpperCase()}`, 'Settings', itemLabel, `Deleted ${typeLabel || 'item'}: ${itemLabel}`);
    toast.success(`${readableLabel} "${itemLabel || itemToDelete}" removed successfully!`);
  };

  const handleDeleteDoc = (siNo, docName) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    const docRuleName = docName || `Rule #${siNo}`;
    if (!window.confirm(`Are you sure you want to delete "${docRuleName}"?`)) return;
    setCourseDocuments(prev => prev.filter(doc => doc.siNo !== siNo).map((doc, idx) => ({ ...doc, siNo: idx + 1 })));
    addAuditLog('DELETE_SETTING_DOC_RULE', 'Settings', docRuleName, `Deleted doc rule: ${docRuleName}`);
    toast.success(`Course document rule "${docRuleName}" deleted successfully!`);
  };

  const handleDeleteAgent = (siNo, agentName) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    const agentLabel = agentName || `Agent #${siNo}`;
    if (!window.confirm(`Are you sure you want to delete "${agentLabel}"?`)) return;
    setReferralAgents(prev => prev.filter(agent => agent.siNo !== siNo).map((agent, idx) => ({ ...agent, siNo: idx + 1 })));
    addAuditLog('DELETE_SETTING_AGENT', 'Settings', agentLabel, `Deleted agent setting: ${agentLabel}`);
    toast.success(`Referral agent "${agentLabel}" deleted successfully!`);
  };

  const moveStage = (index, direction) => {
    if (!isWritable) {
      toast.error("Permission Denied: System configurations can only be modified by SuperAdmin, Admin, or Director.");
      return;
    }
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newStages[index];
    newStages[index] = newStages[swapIdx];
    newStages[swapIdx] = temp;
    setStages(newStages);
    const stageName = typeof temp === 'object' ? (temp.title || temp.name) : temp;
    addAuditLog('MOVE_SETTING_STAGE', 'Settings', stageName, `Reordered pipeline stages (moved ${stageName} ${direction})`);
    toast.success(`Stage "${stageName || 'Application Stage'}" moved ${direction}!`);
  };

  const renderSettingsView = () => {
    switch (activeSubTab) {
      case 'settings-university': {
        const univStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedUnivs = universities.slice(univStartIndex, univStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Universities Master Directory</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage partner institutions, S3 logo images, entry criteria, and academic courses.</p>
              </div>
              <ActionButton
                onClick={openAddUnivModal}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center gap-1"
              >
                <span>+ Add University</span>
              </ActionButton>
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Location</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Ranking</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Requirements</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {universities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                        No universities found. Click "+ Add University" above to create one.
                      </td>
                    </tr>
                  ) : (
                    paginatedUnivs.map((univ) => {
                      const uId = univ._id || univ.id;
                      const reqs = Array.isArray(univ.requirements) ? univ.requirements : (univ.requirements ? [univ.requirements] : []);
                      return (
                        <tr key={uId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {univ.logoUrl ? (
                                <img src={univ.logoUrl} alt={univ.name} className="w-9 h-9 object-contain border p-0.5 rounded-lg bg-white shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-[#D99A1C]/10 text-[#D99A1C] flex items-center justify-center text-sm font-black shrink-0">
                                  🏛️
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-black text-slate-900">{univ.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{Array.isArray(univ.courses) ? `${univ.courses.length} courses` : '0 courses'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {univ.city ? `${univ.city}, ` : ''}{univ.country}
                          </td>
                          <td className="px-5 py-3.5">
                            {univ.ranking ? (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                🏆 {univ.ranking}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">N/A</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {reqs.length > 0 ? (
                                reqs.slice(0, 2).map((r, idx) => (
                                  <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    {r}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[10px]">Standard</span>
                              )}
                              {reqs.length > 2 && <span className="text-[9px] text-slate-400">+{reqs.length - 2} more</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${univ.status === 'Inactive' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                              {univ.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <ActionButton
                                onClick={() => setViewingUniv(univ)}
                                title="View Details"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                👁️ View
                              </ActionButton>
                              <ActionButton
                                onClick={() => openEditUnivModal(univ)}
                                title="Edit University"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                ✏️ Edit
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleDeleteUniversity(univ)}
                                title="Delete University"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                🗑️ Delete
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <PaginationFooter
                totalItems={universities.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }

      case 'settings-course': {
        const courseStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedCourses = courses.slice(courseStartIndex, courseStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Academic Programs Directory</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage degree programs, tuition fees, assigned universities, and intake calendar associations.</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Single Import Excel Action */}
                <ActionButton
                  type="button"
                  onClick={() => setIsExcelImportModalOpen(true)}
                  disabled={!isWritable}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-2xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shrink-0 h-fit disabled:opacity-50"
                  title="Import courses in bulk via Excel"
                >
                  <span>📊 Import Excel</span>
                </ActionButton>

                {/* + Add Course Program Action */}
                <ActionButton
                  onClick={openAddCourseModal}
                  disabled={!isWritable}
                  className="bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center gap-1 shrink-0 h-fit"
                >
                  <span>+ Add Course Program</span>
                </ActionButton>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Course Title</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Degree Level</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Duration & Fee</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Active Intakes</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                        No course programs found. Click "+ Add Course Program" above to create one.
                      </td>
                    </tr>
                  ) : (
                    paginatedCourses.map((course) => {
                      const cId = course._id || course.id;
                      const uniName = typeof course.university === 'object' ? (course.university?.name || 'Assigned') : 'Assigned';
                      const intakeList = Array.isArray(course.intakes) ? course.intakes : [];
                      return (
                        <tr key={cId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-black text-slate-900">
                            <div>
                              <p className="text-xs font-black text-slate-900">{course.title}</p>
                              {course.category && <p className="text-[9px] text-slate-400 font-bold uppercase">{course.category}</p>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 font-bold">
                            🏛️ {uniName}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-2 py-0.5 rounded-md">
                              🎓 {course.degreeLevel || 'Bachelor'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="space-y-0.5">
                              <p className="text-slate-600 text-[11px] font-semibold">{course.duration || 'N/A'}</p>
                              {course.tuitionFee && <p className="text-emerald-700 font-extrabold text-[10px]">{course.tuitionFee}</p>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {intakeList.length > 0 ? (
                                intakeList.map((i, idx) => {
                                  const titleStr = resolveIntakeTitle(i, intakes);
                                  return (
                                    <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      📅 {titleStr}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-slate-400 text-[10px]">All Seasons</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <ActionButton
                                onClick={() => setViewingCourse(course)}
                                title="View Details"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                👁️ View
                              </ActionButton>
                              <ActionButton
                                onClick={() => openEditCourseModal(course)}
                                title="Edit Course"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                ✏️ Edit
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleDeleteCourse(course)}
                                title="Delete Course"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                🗑️ Delete
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <PaginationFooter
                totalItems={courses.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }

      case 'settings-intake': {
        const intakeStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedIntakes = intakes.slice(intakeStartIndex, intakeStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Intake Seasons Directory</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define global admission intake windows and operational target seasons.</p>
              </div>
              <ActionButton
                onClick={openAddIntakeModal}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center gap-1"
              >
                <span>+ Add Intake Season</span>
              </ActionButton>
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Intake Season Title</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Description / Notes</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {intakes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                        No intake seasons found. Click "+ Add Intake Season" above to create one.
                      </td>
                    </tr>
                  ) : (
                    paginatedIntakes.map((intake) => {
                      const iId = intake._id || intake.id;
                      return (
                        <tr key={iId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">📅</span>
                              <p className="text-xs font-black text-slate-900">{intake.title}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {intake.description || <span className="text-slate-400 italic">No description</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                              Active Season
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <ActionButton
                                onClick={() => setViewingIntake(intake)}
                                title="View Details"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                👁️ View
                              </ActionButton>
                              <ActionButton
                                onClick={() => openEditIntakeModal(intake)}
                                title="Edit Intake"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                ✏️ Edit
                              </ActionButton>
                              <ActionButton
                                onClick={() => handleDeleteIntake(intake)}
                                title="Delete Intake"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                🗑️ Delete
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <PaginationFooter
                totalItems={intakes.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }

      case 'settings-course-docs': {
        const docStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedCourseDocs = courseDocuments.slice(docStartIndex, docStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Course Documents Configuration</h2>
              <ActionButton
                onClick={() => openAddModal('doc')}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                Add New Document Rule
              </ActionButton>
            </div>
            
            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[80px]">SI.NO.</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Supported Format</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Min Size (MB)</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Max Size (MB)</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {paginatedCourseDocs.map((doc, idx) => (
                    <tr key={doc.siNo || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{docStartIndex + idx + 1}</td>
                      <td className="px-6 py-4 text-slate-950 font-black">{doc.name}</td>
                      <td className="px-6 py-4"><span className="bg-blue-50 border border-blue-100 text-blue-700 font-extrabold rounded-md px-2 py-0.5 text-[9px]">{doc.format}</span></td>
                      <td className="px-6 py-4 text-slate-500">{doc.minSize} MB</td>
                      <td className="px-6 py-4 text-slate-500">{doc.maxSize} MB</td>
                      <td className="px-6 py-4 text-right">
                        <ActionButton
                          onClick={() => handleDeleteDoc(doc.siNo, doc.name)}
                          className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
                        >
                          Delete
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationFooter
                totalItems={courseDocuments.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }

      case 'settings-agent': {
        const agentStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedAgents = referralAgents.slice(agentStartIndex, agentStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">B2B Referral Agents</h2>
              <ActionButton
                onClick={() => openAddModal('agent')}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                Invite/Add Agent
              </ActionButton>
            </div>
            
            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[80px]">SI.NO.</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Agent Name</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {paginatedAgents.map((agent, idx) => (
                    <tr key={agent.siNo || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{agentStartIndex + idx + 1}</td>
                      <td className="px-6 py-4 text-slate-950 font-black">{agent.agentName}</td>
                      <td className="px-6 py-4 text-[#2563EB] font-bold">{agent.email}</td>
                      <td className="px-6 py-4 text-right">
                        <ActionButton
                          onClick={() => handleDeleteAgent(agent.siNo, agent.agentName)}
                          className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
                        >
                          Revoke Access
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationFooter
                totalItems={referralAgents.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }

      case 'settings-stages': {
        const stageStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedStages = stages.slice(stageStartIndex, stageStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Application Stages Pipeline</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Reorder stages or add customized milestones in the application workflow.</p>
              </div>
              <ActionButton
                onClick={() => openAddModal('stage')}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                Add Stage
              </ActionButton>
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 space-y-4">
                {paginatedStages.map((stage, idx) => {
                  const globalIdx = stageStartIndex + idx;
                  return (
                    <div 
                      key={stage}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#D99A1C] hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {globalIdx + 1}
                        </span>
                        <span className="text-xs font-black text-slate-900">{stage}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ActionButton
                          onClick={() => moveStage(globalIdx, 'up')}
                          disabled={globalIdx === 0}
                          className="p-1.5 bg-white text-slate-400 hover:text-slate-950 border border-slate-200 rounded-lg hover:shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          ▲
                        </ActionButton>
                        <ActionButton
                          onClick={() => moveStage(globalIdx, 'down')}
                          disabled={globalIdx === stages.length - 1}
                          className="p-1.5 bg-white text-slate-400 hover:text-slate-950 border border-slate-200 rounded-lg hover:shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          ▼
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleDeleteItem(stage, setStages, 'stage')}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg cursor-pointer"
                        >
                          ✕
                        </ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationFooter
                totalItems={stages.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }

      case null:
      case undefined:
      case '': {
        const configCards = [
          { id: 'settings-university', title: 'Universities Directory', desc: 'Configure partner institutions, logos, and regional parameters.', count: universities.length, icon: '🏛️' },
          { id: 'settings-course', title: 'Academic Programs', desc: 'Add or modify degrees, course codes, and catalog details.', count: courses.length, icon: '🎓' },
          { id: 'settings-intake', title: 'Intake Seasons', desc: 'Define active application calendar seasons and milestones.', count: intakes.length, icon: '📅' },
          { id: 'settings-formats', title: 'Allowed Extensions', desc: 'Restrict candidate documents to specific file types.', count: fileFormats.length, icon: '📎' },
          { id: 'settings-course-docs', title: 'Document Checklist Rules', desc: 'Define naming structures and size parameters for certificates.', count: courseDocuments.length, icon: '📑' },
          { id: 'settings-documents', title: 'Verification Requirements', desc: 'Manage dynamic student core compliance documents checklists.', count: verificationDocuments?.length || 0, icon: '✔️' },
          { id: 'settings-agent', title: 'Referral Agent Channels', desc: 'Authorize agent access credentials and track channels.', count: referralAgents.length, icon: '🤝' },
          { id: 'settings-stages', title: 'Stages Pipeline', desc: 'Customize application stages and operational status names.', count: stages.length, icon: '🔄' },
          { id: 'settings-actions', title: 'Staged Actions', desc: 'Configure tasks triggered upon stage modifications.', count: stagedActions?.length || 0, icon: '⚡' },
          { id: 'settings-qualifications', title: 'Qualification Levels', desc: 'Modify accepted qualification tiers and criteria.', count: qualifications.length, icon: '🏫' }
        ];

        return (
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">System Settings Directory</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">Select a settings card below to customize active portal configurations, workflows, and master metadata lists.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {configCards.map((card) => (
                <div key={card.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#D99A1C] transition-all group hover:shadow-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-2xl">{card.icon}</span>
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[9px] font-bold">
                        {card.count} Items
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-[#D99A1C] transition-colors">{card.title}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50 mt-4">
                    <ActionButton
                      onClick={() => setActiveSubTab && setActiveSubTab(card.id)}
                      className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                    >
                      Open Configuration
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default: {
        let list = [];
        let listSetter = null;
        let title = '';
        let addLabel = '';

        if (activeSubTab === 'settings-university') {
          list = universities;
          listSetter = setUniversities;
          title = 'Universities Master List';
          addLabel = 'Add University';
        } else if (activeSubTab === 'settings-course') {
          list = courses;
          listSetter = setCourses;
          title = 'Courses Master List';
          addLabel = 'Add Academic Course';
        } else if (activeSubTab === 'settings-intake') {
          list = intakes;
          listSetter = setIntakes;
          title = 'Intake Seasons';
          addLabel = 'Add Intake Option';
        } else if (activeSubTab === 'settings-formats') {
          list = fileFormats;
          listSetter = setFileFormats;
          title = 'Supported File Formats';
          addLabel = 'Add File Format Extension';
        } else if (activeSubTab === 'settings-qualifications') {
          list = qualifications;
          listSetter = setQualifications;
          title = 'Qualifications Level';
          addLabel = 'Add Qualification Tier';
        } else if (activeSubTab === 'settings-documents') {
          list = verificationDocuments;
          listSetter = setVerificationDocuments;
          title = 'Verification Checklist Documents';
          addLabel = 'Add Document Requirement';
        } else if (activeSubTab === 'settings-actions') {
          list = stagedActions;
          listSetter = setStagedActions;
          title = 'Staged Automation Actions';
          addLabel = 'Add Automation Action';
        }

        const listStartIndex = (currentPage - 1) * itemsPerPage;
        const paginatedList = list.slice(listStartIndex, listStartIndex + itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">{title}</h2>
              {listSetter && (
                <ActionButton
                  onClick={() => openAddModal(activeSubTab)}
                  className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
                >
                  {addLabel}
                </ActionButton>
              )}
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 space-y-3">
                {paginatedList.map((item, idx) => {
                  const itemId = typeof item === 'object' ? item._id : item;
                  
                  let displayName = '';
                  let detailsLabel = '';

                  if (activeSubTab === 'settings-university') {
                    displayName = typeof item === 'object' ? item.name : item;
                    detailsLabel = typeof item === 'object' ? `Country: ${item.country}` : '';
                  } else if (activeSubTab === 'settings-course') {
                    displayName = typeof item === 'object' ? item.title : item;
                    const uniName = typeof item === 'object' ? (item.university?.name || 'Assigned') : '';
                    detailsLabel = typeof item === 'object' ? `${item.degreeLevel || 'Master'} Degree | University: ${uniName}` : '';
                  } else if (activeSubTab === 'settings-intake') {
                    displayName = typeof item === 'object' ? item.title : item;
                    detailsLabel = typeof item === 'object' ? item.description : '';
                  } else {
                    displayName = item;
                  }

                  return (
                    <div key={itemId || idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-350 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{displayName}</p>
                        {detailsLabel && <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{detailsLabel}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {activeSubTab === 'settings-intake' && listSetter && (
                          <ActionButton
                            onClick={() => openEditIntakeModal(item)}
                            className="text-indigo-500 hover:text-indigo-700 font-extrabold text-xs cursor-pointer bg-white px-2.5 py-1 border border-slate-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/20 transition-all shadow-3xs"
                          >
                            Edit
                          </ActionButton>
                        )}
                        {listSetter && (
                          <ActionButton
                            onClick={() => handleDeleteSettingItem(item, listSetter, activeSubTab.replace('settings-', ''))}
                            className="text-rose-500 hover:text-rose-700 font-extrabold text-xs cursor-pointer bg-white px-2.5 py-1 border border-slate-200 rounded-lg hover:border-rose-200 hover:bg-rose-50/20 transition-all shadow-3xs"
                          >
                            Delete
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationFooter
                totalItems={list.length}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="flex-1 p-6 bg-[#F0F2F5]">
      {!isWritable && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[11.5px] font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-xs mb-5">
          <span>ℹ️</span>
          <span>View-Only Mode: You are logged in as {currentUser?.role}. Portal configuration changes are reserved for Administrator and Director roles.</span>
        </div>
      )}
      {renderSettingsView()}

      {modalType && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                {modalType === 'doc' && 'Add New Course Document Rule'}
                {modalType === 'agent' && 'Invite Referral Agent Channel'}
                {modalType === 'stage' && 'Add Application Pipeline Stage'}
                {modalType === 'edit-intake' && 'Edit Intake Season'}
                {modalType !== 'doc' && modalType !== 'agent' && modalType !== 'stage' && modalType !== 'edit-intake' && 'Add Configuration Lookup Item'}
              </h3>
              <ActionButton onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</ActionButton>
            </div>

            {modalType === 'doc' && (
              <ActionForm onSubmit={handleAddDocumentRule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Document Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-950"
                    placeholder="e.g. Post Graduate Degree Marksheet"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Format</label>
                  <select
                    value={docFormat}
                    onChange={(e) => setDocFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C]"
                  >
                    <option value=".pdf">.pdf (Acrobat Reader)</option>
                    <option value=".docx">.docx (MS Word)</option>
                    <option value=".jpg">.jpg (JPEG Image)</option>
                    <option value=".png">.png (PNG Image)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Min Size (MB)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={docMinSize}
                      onChange={(e) => setDocMinSize(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Max Size (MB)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={docMaxSize}
                      onChange={(e) => setDocMaxSize(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C]"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? 'Adding...' : 'Add Rule'}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType === 'agent' && (
              <ActionForm onSubmit={handleAddReferralAgent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-950"
                    placeholder="e.g. John Doe Consultancies"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Agent Contact Email</label>
                  <input
                    type="email"
                    required
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-950"
                    placeholder="e.g. onboarding@agency.com"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? 'Adding...' : 'Add Agent'}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType === 'stage' && (
              <ActionForm onSubmit={(e) => handleAddSimpleItem(e, setStages, stages, 'stage')} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Stage Label</label>
                  <input
                    type="text"
                    required
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-950"
                    placeholder="e.g. CAS Clearance Pending"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? 'Adding...' : 'Add Stage'}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType === 'settings-university' && (
              <ActionForm onSubmit={handleSaveUniversity} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2">
                  {editingUniv ? 'Edit University Details' : 'Add New University'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">University Name *</label>
                    <input
                      type="text"
                      required
                      value={univName}
                      onChange={(e) => setUnivName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                      placeholder="e.g. University of Oxford"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Country *</label>
                    <select
                      value={univCountry}
                      onChange={(e) => setUnivCountry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    >
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="United States">United States</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="Singapore">Singapore</option>
                      <option value="India">India</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={univCity}
                      onChange={(e) => setUnivCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                      placeholder="e.g. Oxford"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Ranking</label>
                    <input
                      type="text"
                      value={univRanking}
                      onChange={(e) => setUnivRanking(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                      placeholder="e.g. #1 Global"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status</label>
                    <select
                      value={univStatus}
                      onChange={(e) => setUnivStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* S3 Logo File Upload */}
                <div className="space-y-1.5 bg-slate-50 border border-dashed border-slate-300 p-3 rounded-xl overflow-hidden">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">University Logo Image (S3 Upload)</label>
                  <div className="flex items-center gap-3">
                    {univLogoUrl ? (
                      <img src={univLogoUrl} alt="Logo Preview" className="w-12 h-12 object-contain border rounded-lg bg-white p-1 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 border border-slate-200 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-base shrink-0">🏛️</div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        disabled={isUploadingLogo}
                        className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#D99A1C] file:text-white hover:file:bg-[#F5B025] cursor-pointer max-w-full"
                      />
                      {isUploadingLogo && (
                        <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1.5 animate-pulse">
                          <svg className="animate-spin h-3 w-3 text-amber-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Uploading image to AWS S3...
                        </p>
                      )}
                      {univLogoUrl && (
                        <p className="text-[9px] text-emerald-700 font-medium truncate block max-w-full" title={univLogoUrl}>
                          <span className="font-bold text-emerald-800">Uploaded: </span>
                          {univLogoUrl}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Entry Requirements (Comma Separated)</label>
                  <input
                    type="text"
                    value={univRequirements}
                    onChange={(e) => setUnivRequirements(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    placeholder="e.g. IELTS 7.5, GPA 3.8+, High School Diploma"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">University Description</label>
                  <textarea
                    rows={2}
                    value={univDescription}
                    onChange={(e) => setUnivDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    placeholder="A world-leading centre of learning, teaching and research..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Courses</label>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1 bg-slate-50">
                    {courses.map(course => {
                      const courseId = typeof course === 'object' ? course._id : course;
                      const courseTitle = typeof course === 'object' ? course.title : course;
                      const isChecked = univSelectedCourses.includes(courseId);
                      return (
                        <label key={courseId} className="flex items-center gap-2 text-[10px] font-bold text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setUnivSelectedCourses(prev => prev.filter(id => id !== courseId));
                              } else {
                                setUnivSelectedCourses(prev => [...prev, courseId]);
                              }
                            }}
                          />
                          <span>{courseTitle}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? (editingUniv ? 'Saving Changes...' : 'Adding University...') : (editingUniv ? 'Save Changes' : 'Add University')}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType === 'settings-course' && (
              <ActionForm onSubmit={handleSaveCourse} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2">
                  {editingCourse ? 'Edit Course Program' : 'Add Academic Course Program'}
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Course Program Title *</label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    placeholder="e.g. MSc Computer Science & Artificial Intelligence"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assign University *</label>
                    <select
                      required
                      value={courseUniv}
                      onChange={(e) => setCourseUniv(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    >
                      <option value="">-- Select University --</option>
                      {universities.map(u => {
                        const uId = typeof u === 'object' ? u._id : u;
                        const uName = typeof u === 'object' ? u.name : u;
                        return <option key={uId} value={uId}>{uName}</option>;
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Degree Level</label>
                    <select
                      value={courseDegreeLevel}
                      onChange={(e) => setCourseDegreeLevel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    >
                      <option value="Bachelor">Bachelor Degree</option>
                      <option value="Master">Master Degree</option>
                      <option value="PhD">Doctorate / PhD</option>
                      <option value="Diploma">Diploma / Foundation</option>
                      <option value="Certificate">Certificate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Duration</label>
                    <input
                      type="text"
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                      placeholder="e.g. 1 Year / 3 Years"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tuition Fee</label>
                    <input
                      type="text"
                      value={courseFee}
                      onChange={(e) => setCourseFee(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                      placeholder="e.g. ₹28,500 / yr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Category</label>
                    <select
                      value={courseCategory}
                      onChange={(e) => setCourseCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    >
                      <option value="Technology">Technology & Engineering</option>
                      <option value="Business">Business & Management</option>
                      <option value="Arts">Arts & Humanities</option>
                      <option value="Science">Natural Sciences</option>
                      <option value="Health">Medicine & Health</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Course Overview & Description</label>
                  <textarea
                    rows={2}
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    placeholder="Comprehensive program covering algorithms, machine learning..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Select Available Intakes</label>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1 bg-slate-50">
                    {intakes.map(int => {
                      const intId = typeof int === 'object' && int !== null ? (int._id || int.id) : int;
                      const intTitle = resolveIntakeTitle(int, intakes);
                      const isChecked = courseSelectedIntakes.includes(intId);
                      return (
                        <label key={intId} className="flex items-center gap-2 text-[10px] font-bold text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setCourseSelectedIntakes(prev => prev.filter(id => id !== intId));
                              } else {
                                setCourseSelectedIntakes(prev => [...prev, intId]);
                              }
                            }}
                          />
                          <span>📅 {intTitle}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? (editingCourse ? 'Saving Changes...' : 'Adding Course...') : (editingCourse ? 'Save Changes' : 'Add Course')}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType === 'settings-intake' && (
              <ActionForm onSubmit={handleSaveIntake} className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2">
                  {editingIntake ? 'Edit Intake Season' : 'Add Intake Season'}
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Intake Season Title *</label>
                  <input
                    type="text"
                    required
                    value={intakeTitle}
                    onChange={(e) => setIntakeTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    placeholder="e.g. September 2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Description / Application Period Notes</label>
                  <textarea
                    rows={2}
                    value={intakeDesc}
                    onChange={(e) => setIntakeDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                    placeholder="Primary Autumn intake for UK and European universities..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? (editingIntake ? 'Saving Changes...' : 'Adding Intake...') : (editingIntake ? 'Save Changes' : 'Add Intake')}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType === 'edit-intake' && (
              <ActionForm onSubmit={handleUpdateIntake} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Intake Title</label>
                  <input
                    type="text"
                    required
                    value={editIntakeTitle}
                    onChange={(e) => setEditIntakeTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-950"
                    placeholder="e.g. September intake"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Intake Description</label>
                  <input
                    type="text"
                    value={editIntakeDesc}
                    onChange={(e) => setEditIntakeDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] text-slate-950"
                    placeholder="e.g. Fall intake starts in September"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}

            {modalType !== 'doc' && modalType !== 'agent' && modalType !== 'stage' && 
             modalType !== 'settings-university' && modalType !== 'settings-course' && modalType !== 'settings-intake' && 
             modalType !== 'edit-intake' && (
              <ActionForm
                onSubmit={(e) => {
                  let setter = null;
                  let lst = [];
                  let lbl = '';
                  if (modalType === 'settings-formats') { setter = setFileFormats; lst = fileFormats; lbl = 'formats'; }
                  if (modalType === 'settings-qualifications') { setter = setQualifications; lst = qualifications; lbl = 'qualifications'; }
                  if (modalType === 'settings-documents') { setter = setVerificationDocuments; lst = verificationDocuments; lbl = 'documents'; }
                  if (modalType === 'settings-actions') { setter = setStagedActions; lst = stagedActions; lbl = 'actions'; }
                  handleAddSimpleItem(e, setter, lst, lbl);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Item Label</label>
                  <input
                    type="text"
                    required
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] text-slate-950"
                    placeholder="Enter configuration label..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <ActionButton type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</ActionButton>
                  <ActionButton
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{isSubmitting ? 'Adding...' : 'Add Item'}</span>
                  </ActionButton>
                </div>
              </ActionForm>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* Single View University Modal */}
      {viewingUniv && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto my-auto">
            <ActionButton
              onClick={() => setViewingUniv(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </ActionButton>

            <div className="flex items-center gap-4 border-b pb-4">
              {viewingUniv.logoUrl ? (
                <img src={viewingUniv.logoUrl} alt={viewingUniv.name} className="w-16 h-16 object-contain border p-1 rounded-xl bg-white shadow-xs" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#D99A1C]/10 text-[#D99A1C] flex items-center justify-center text-xl font-black shrink-0">
                  🏛️
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">{viewingUniv.name}</h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${viewingUniv.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {viewingUniv.status || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
                  <span>📍 {viewingUniv.city ? `${viewingUniv.city}, ` : ''}{viewingUniv.country}</span>
                  {viewingUniv.ranking && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold text-[10px] border border-amber-200">🏆 {viewingUniv.ranking}</span>}
                </div>
              </div>
            </div>

            {/* Entry Requirements */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Entry Requirements</h4>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(viewingUniv.requirements) && viewingUniv.requirements.length > 0 ? (
                  viewingUniv.requirements.map((req, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-lg">
                      ✓ {req}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No specific entry requirements listed</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Overview & Description</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {viewingUniv.description || 'No description provided for this university.'}
              </p>
            </div>

            {/* Linked Courses */}
            {(() => {
              const assignedPrograms = getResolvedAssignedCourses(viewingUniv);
              return (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Assigned Academic Programs ({assignedPrograms.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {assignedPrograms.length > 0 ? (
                      assignedPrograms.map((courseItem, idx) => (
                        <div key={courseItem._id || courseItem.id || idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold text-slate-800">🎓 {courseItem.title}</span>
                          <div className="flex gap-2 text-[10px] font-semibold text-slate-500">
                            {courseItem.degreeLevel && (
                              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                                {courseItem.degreeLevel}
                              </span>
                            )}
                            {courseItem.tuitionFee && (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                {courseItem.tuitionFee}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No courses currently assigned</p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-4 border-t">
              <ActionButton
                onClick={() => {
                  const target = viewingUniv;
                  setViewingUniv(null);
                  openEditUnivModal(target);
                }}
                className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                ✏️ Edit University
              </ActionButton>
              <ActionButton
                onClick={() => setViewingUniv(null)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Single View Course Modal */}
      {viewingCourse && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto my-auto">
            <ActionButton
              onClick={() => setViewingCourse(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </ActionButton>

            <div className="border-b pb-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 text-[10px] font-extrabold rounded-md">
                  🎓 {viewingCourse.degreeLevel || 'Bachelor'}
                </span>
                {viewingCourse.category && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold rounded-md">
                    {viewingCourse.category}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900">{viewingCourse.title}</h2>
              <p className="text-xs text-slate-500 font-bold">
                🏛️ {typeof viewingCourse.university === 'object' ? (viewingCourse.university?.name || 'Assigned University') : 'Assigned University'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="text-xs font-bold text-slate-800">{viewingCourse.duration || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Tuition Fee</span>
                <span className="text-xs font-black text-emerald-700">{viewingCourse.tuitionFee || 'Not specified'}</span>
              </div>
            </div>

            {/* Intakes */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Available Intake Seasons</h4>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(viewingCourse.intakes) && viewingCourse.intakes.length > 0 ? (
                  viewingCourse.intakes.map((int, idx) => {
                    const titleStr = resolveIntakeTitle(int, intakes);
                    return (
                      <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg">
                        📅 {titleStr}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400 italic">Open for all academic intakes</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Overview & Description</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {viewingCourse.description || 'No description provided for this academic program.'}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <ActionButton
                onClick={() => {
                  const target = viewingCourse;
                  setViewingCourse(null);
                  openEditCourseModal(target);
                }}
                className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                ✏️ Edit Course
              </ActionButton>
              <ActionButton
                onClick={() => setViewingCourse(null)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Single View Intake Modal */}
      {viewingIntake && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto my-auto">
            <ActionButton
              onClick={() => setViewingIntake(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </ActionButton>

            <div className="border-b pb-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold">
                📅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">{viewingIntake.title}</h2>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                    Active Intake
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Global Admission Season Calendar Window</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Application Notes & Timeline</h4>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {viewingIntake.description || 'No detailed timeline or description provided for this intake.'}
              </p>
            </div>

            {/* Linked Courses */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Courses Offering This Intake
              </h4>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {courses.filter(c => Array.isArray(c.intakes) && c.intakes.some(i => (typeof i === 'object' ? (i._id || i.id) : i) === (viewingIntake._id || viewingIntake.id))).map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs font-semibold">
                    <span className="text-slate-800">🎓 {c.title}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{typeof c.university === 'object' ? c.university?.name : 'Assigned'}</span>
                  </div>
                ))}
                {courses.filter(c => Array.isArray(c.intakes) && c.intakes.some(i => (typeof i === 'object' ? (i._id || i.id) : i) === (viewingIntake._id || viewingIntake.id))).length === 0 && (
                  <p className="text-xs text-slate-400 italic">No courses currently restricted to this intake</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <ActionButton
                onClick={() => {
                  const target = viewingIntake;
                  setViewingIntake(null);
                  openEditIntakeModal(target);
                }}
                className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                ✏️ Edit Intake
              </ActionButton>
              <ActionButton
                onClick={() => setViewingIntake(null)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unified Excel Course Bulk Import Modal */}
      {isExcelImportModalOpen && createPortal(
        <div className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#D99A1C] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>📊 Import Courses via Excel</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Bulk upload academic programs, tuition fees, and degree structures without duplicates.
                </p>
              </div>
              <ActionButton
                type="button"
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setSelectedCourseFile(null);
                  setExcelPreviewRows([]);
                  setExcelStats({ totalRows: 0, validRows: 0 });
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </ActionButton>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* 1. Template Download Card */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-3xs">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>1.</span> Download Official Excel Template
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Pre-formatted template with required columns: Course Title, University, Fee, Level.
                  </p>
                </div>
                <ActionButton
                  type="button"
                  onClick={handleDownloadCourseTemplate}
                  disabled={isDownloadingTemplate}
                  className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isDownloadingTemplate ? (
                    <>
                      <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>Download Template</span>
                    </>
                  )}
                </ActionButton>
              </div>

              {/* 2. File Drop & Selection Zone */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-700">
                  2. Upload Your Completed Excel File:
                </label>

                <input
                  type="file"
                  ref={courseFileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleCourseFileSelect}
                  className="hidden"
                />

                {!selectedCourseFile ? (
                  <div
                    onClick={() => courseFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-250 hover:border-[#D99A1C] bg-slate-50/60 hover:bg-amber-50/20 transition-all rounded-2xl p-6 text-center cursor-pointer space-y-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-[#D99A1C] flex items-center justify-center mx-auto text-xl font-bold">
                      📊
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        Drop your Excel file here, or <span className="text-[#D99A1C] underline font-extrabold">Browse File</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Supports standard .xlsx or .xls files up to 25MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-3xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        📄
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-800 truncate" title={selectedCourseFile.name}>
                          {selectedCourseFile.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          {(selectedCourseFile.size / 1024).toFixed(1)} KB • Ready for processing
                        </p>
                      </div>
                    </div>
                    <ActionButton
                      type="button"
                      onClick={() => {
                        setSelectedCourseFile(null);
                        setExcelPreviewRows([]);
                        setExcelStats({ totalRows: 0, validRows: 0 });
                        if (courseFileInputRef.current) courseFileInputRef.current.value = '';
                      }}
                      className="px-2.5 py-1 text-[10px] font-extrabold text-slate-500 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Change File
                    </ActionButton>
                  </div>
                )}
              </div>

              {/* 3. Live Preview Table (Unveils when file is chosen) */}
              {isParsingPreview && (
                <div className="p-4 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#D99A1C] border-t-transparent rounded-full animate-spin"></span>
                  <span>Reading Excel worksheet data...</span>
                </div>
              )}

              {selectedCourseFile && !isParsingPreview && excelPreviewRows.length > 0 && (
                <div className="space-y-2 border border-slate-200 bg-white rounded-2xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🔍</span> Preview Courses ({excelStats.totalRows} detected)
                    </span>
                    <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ {excelStats.validRows} Valid
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl overflow-hidden scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[9.5px] font-black uppercase text-slate-400 sticky top-0 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2">Course Title</th>
                          <th className="px-3 py-2">University</th>
                          <th className="px-3 py-2">Level</th>
                          <th className="px-3 py-2">Fee</th>
                          <th className="px-3 py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                        {excelPreviewRows.slice(0, 20).map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 font-bold text-slate-900 truncate max-w-[180px]" title={row.title}>
                              {row.title}
                            </td>
                            <td className="px-3 py-2 text-slate-500 truncate max-w-[140px]" title={row.university}>
                              {row.university}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{row.level}</td>
                            <td className="px-3 py-2 font-mono text-slate-700">{row.fee}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                row.isValid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {row.isValid ? '✓ Ready' : 'Incomplete'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {excelPreviewRows.length > 20 && (
                    <p className="text-[10px] text-slate-400 text-center font-medium pt-1">
                      Showing first 20 of {excelPreviewRows.length} courses. All valid rows will be imported.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <ActionButton
                type="button"
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setSelectedCourseFile(null);
                  setExcelPreviewRows([]);
                  setExcelStats({ totalRows: 0, validRows: 0 });
                }}
                disabled={isUploadingCourseExcel}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="button"
                onClick={handleUploadCourseExcel}
                disabled={!selectedCourseFile || isUploadingCourseExcel || !isWritable}
                className="bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-40 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                {isUploadingCourseExcel ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Uploading &amp; Deduplicating...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Confirm &amp; Import Courses</span>
                    {excelStats.totalRows > 0 && <span>({excelStats.totalRows})</span>}
                  </>
                )}
              </ActionButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Excel Bulk Course Import Summary Modal */}
      {importSummaryModalOpen && importSummaryData && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>📊 Course Excel Import Summary</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Detailed review of processed academic course rows from the uploaded Excel file.
                </p>
              </div>
              <ActionButton
                onClick={() => setImportSummaryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </ActionButton>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Rows</span>
                <span className="text-lg font-black text-slate-800">{importSummaryData.totalProcessed || 0}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Imported ✅</span>
                <span className="text-lg font-black text-emerald-700">{importSummaryData.successCount || 0}</span>
              </div>
              <div className={`p-3 rounded-xl text-center border ${
                (importSummaryData.failureCount || 0) > 0 
                  ? 'bg-rose-50 border-rose-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                  (importSummaryData.failureCount || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                }`}>Failed ❌</span>
                <span className={`text-lg font-black ${
                  (importSummaryData.failureCount || 0) > 0 ? 'text-rose-700' : 'text-slate-700'
                }`}>{importSummaryData.failureCount || 0}</span>
              </div>
            </div>

            {/* Status overview message */}
            <div className={`p-3 rounded-xl text-xs font-semibold ${
              (importSummaryData.failureCount || 0) === 0
                ? 'bg-emerald-100/60 text-emerald-800 border border-emerald-200'
                : (importSummaryData.successCount || 0) > 0
                  ? 'bg-amber-100/60 text-amber-900 border border-amber-200'
                  : 'bg-rose-100/60 text-rose-900 border border-rose-200'
            }`}>
              {(importSummaryData.failureCount || 0) === 0 ? (
                <span>🎉 All course programs in the file were successfully imported and added to the directory!</span>
              ) : (importSummaryData.successCount || 0) > 0 ? (
                <span>⚠️ Partial Import: {importSummaryData.successCount} courses were saved. {importSummaryData.failureCount} rows require manual correction as detailed below.</span>
              ) : (
                <span>❌ Import Failed: None of the rows could be imported. Please review the errors below, correct the master records or Excel file, and re-upload.</span>
              )}
            </div>

            {/* Failed Rows Detail Table */}
            {Array.isArray(importSummaryData.failedRows) && importSummaryData.failedRows.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Actionable Error Details ({importSummaryData.failedRows.length} Rows Failed)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        <th className="py-2 px-2.5">Excel Row</th>
                        <th className="py-2 px-2.5">Course Program</th>
                        <th className="py-2 px-2.5">Field / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {importSummaryData.failedRows.map((fail, idx) => (
                        <tr key={idx} className="bg-white hover:bg-rose-50/30 transition-colors">
                          <td className="py-2.5 px-2.5 font-black text-rose-600 align-top whitespace-nowrap">
                            Row {fail.rowNumber}
                          </td>
                          <td className="py-2.5 px-2.5 align-top">
                            <span className="font-bold text-slate-800 block">{fail.courseTitle || 'Untitled Course'}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">Univ: {fail.university || 'Unassigned'}</span>
                          </td>
                          <td className="py-2.5 px-2.5 space-y-1 align-top">
                            {Array.isArray(fail.errors) ? (
                              fail.errors.map((err, errIdx) => (
                                <div key={errIdx} className="text-[11px] leading-snug">
                                  <span className="font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] mr-1.5 inline-block">
                                    {err.field}
                                  </span>
                                  <span className="text-slate-600 font-medium">{err.message}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-600">Validation error occurred.</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <ActionButton
                type="button"
                onClick={() => setImportSummaryModalOpen(false)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close Summary
              </ActionButton>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function PaginationFooter({ totalItems, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage }) {
  if (totalItems <= 0) return null;

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
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
  );
}
