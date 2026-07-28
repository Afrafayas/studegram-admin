import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const { currentUser, addAuditLog } = useAuth();
  const isWritable = currentUser?.role === 'Director';

  const [modalType, setModalType] = useState(null);

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
      alert("Permission Denied: System configurations can only be modified by the Director.");
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

    const newRule = {
      siNo: courseDocuments.length + 1,
      name: docName,
      format: docFormat,
      minSize: parseFloat(docMinSize),
      maxSize: parseFloat(docMaxSize)
    };
    setCourseDocuments(prev => [...prev, newRule]);
    addAuditLog('ADD_SETTING_DOC_RULE', 'Settings', docName, `Added document configuration rule: ${docName}`);
    setModalType(null);
  };

  const handleAddReferralAgent = (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!agentName || !agentEmail) return;

    const newAgent = {
      siNo: referralAgents.length + 1,
      agentName,
      email: agentEmail
    };
    setReferralAgents(prev => [...prev, newAgent]);
    addAuditLog('ADD_SETTING_AGENT', 'Settings', agentName, `Added referral agent setting: ${agentName}`);
    setModalType(null);
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
      } else {
        alert(resData?.message || 'File upload failed');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      alert('Failed to upload image to S3');
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

  const handleDeleteUniversity = async (univ) => {
    if (!isWritable) return;
    const univId = typeof univ === 'object' ? (univ._id || univ.id) : univ;
    const nameStr = typeof univ === 'object' ? univ.name : univ;
    if (!window.confirm(`Are you sure you want to delete ${nameStr}?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        await fetch(`/api/universities/${univId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setUniversities(prev => prev.filter(u => (typeof u === 'object' ? (u._id || u.id) : u) !== univId));
      addAuditLog('DELETE_UNIVERSITY', 'Settings', nameStr, `Deleted university: ${nameStr}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveUniversity = async (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!univName || !univCountry) {
      alert("Please fill in University Name and Country.");
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

    try {
      if (editingUniv) {
        const univId = editingUniv._id || editingUniv.id;
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.put(`/universities/${univId}`, univPayload);
          const resData = response.data;
          if (resData?.success) {
            setUniversities(prev => prev.map(u => (u._id === univId || u.id === univId) ? resData.data : u));
            addAuditLog('EDIT_UNIVERSITY', 'Settings', univName, `Updated university: ${univName}`);
          } else {
            throw new Error(resData?.message || 'Failed to update university');
          }
        } else {
          setUniversities(prev => prev.map(u => (u._id === univId || u.id === univId) ? { ...u, ...univPayload } : u));
        }
      } else {
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.post('/universities', univPayload);
          const resData = response.data;
          if (resData?.success) {
            setUniversities(prev => [resData.data, ...prev]);
            addAuditLog('ADD_SETTING_UNIVERSITY', 'Settings', univName, `Added university setting: ${univName}`);
          } else {
            throw new Error(resData?.message || 'Failed to save university');
          }
        } else {
          const mockUniv = {
            _id: `univ-${Date.now()}`,
            ...univPayload
          };
          setUniversities(prev => [mockUniv, ...prev]);
        }
      }
      resetUnivForm();
      setModalType(null);
    } catch (err) {
      alert(err.message);
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
    if (!isWritable) return;
    const courseId = typeof course === 'object' ? (course._id || course.id) : course;
    const titleStr = typeof course === 'object' ? course.title : course;
    if (!window.confirm(`Are you sure you want to delete ${titleStr}?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        await fetch(`/api/courses/${courseId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setCourses(prev => prev.filter(c => (typeof c === 'object' ? (c._id || c.id) : c) !== courseId));
      addAuditLog('DELETE_COURSE', 'Settings', titleStr, `Deleted course: ${titleStr}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!courseTitle || !courseUniv) {
      alert("Please fill in Course Title and select a University.");
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

    try {
      if (editingCourse) {
        const cId = editingCourse._id || editingCourse.id;
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.put(`/courses/${cId}`, coursePayload);
          const resData = response.data;
          if (resData?.success) {
            setCourses(prev => prev.map(c => (c._id === cId || c.id === cId) ? resData.data : c));
            addAuditLog('EDIT_COURSE', 'Settings', courseTitle, `Updated course: ${courseTitle}`);
          } else {
            throw new Error(resData?.message || 'Failed to update course');
          }
        } else {
          setCourses(prev => prev.map(c => (c._id === cId || c.id === cId) ? { ...c, ...coursePayload } : c));
        }
      } else {
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.post('/courses', coursePayload);
          const resData = response.data;
          if (resData?.success) {
            setCourses(prev => [resData.data, ...prev]);
            addAuditLog('ADD_SETTING_COURSE', 'Settings', courseTitle, `Added course setting: ${courseTitle}`);
          } else {
            throw new Error(resData?.message || 'Failed to save course');
          }
        } else {
          const mockCourse = { _id: `course-${Date.now()}`, ...coursePayload };
          setCourses(prev => [mockCourse, ...prev]);
        }
      }
      resetCourseForm();
      setModalType(null);
    } catch (err) {
      alert(err.message);
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
    setIntakeTitle(intake.title || '');
    setIntakeDesc(intake.description || '');
    setModalType('settings-intake');
  };

  const handleDeleteIntake = async (intake) => {
    if (!isWritable) return;
    const intakeId = typeof intake === 'object' ? (intake._id || intake.id) : intake;
    const titleStr = typeof intake === 'object' ? intake.title : intake;
    if (!window.confirm(`Are you sure you want to delete ${titleStr}?`)) return;

    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        await fetch(`/api/intakes/${intakeId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setIntakes(prev => prev.filter(i => (typeof i === 'object' ? (i._id || i.id) : i) !== intakeId));
      addAuditLog('DELETE_INTAKE', 'Settings', titleStr, `Deleted intake: ${titleStr}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveIntake = async (e) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!intakeTitle) {
      alert("Please enter Intake Title.");
      return;
    }

    const token = localStorage.getItem('admin_token');
    const intakePayload = {
      title: intakeTitle,
      description: intakeDesc
    };

    try {
      if (editingIntake) {
        const iId = editingIntake._id || editingIntake.id;
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.put(`/intakes/${iId}`, intakePayload);
          const resData = response.data;
          if (resData?.success) {
            setIntakes(prev => prev.map(i => (i._id === iId || i.id === iId) ? resData.data : i));
            addAuditLog('EDIT_INTAKE', 'Settings', intakeTitle, `Updated intake setting: ${intakeTitle}`);
          } else {
            throw new Error(resData?.message || 'Failed to update intake');
          }
        } else {
          setIntakes(prev => prev.map(i => (i._id === iId || i.id === iId) ? { ...i, ...intakePayload } : i));
        }
      } else {
        if (token && token !== 'mock-admin-token-12345') {
          const response = await API.post('/intakes', intakePayload);
          const resData = response.data;
          if (resData?.success) {
            setIntakes(prev => [...prev, resData.data]);
            addAuditLog('ADD_SETTING_INTAKE', 'Settings', intakeTitle, `Added intake setting: ${intakeTitle}`);
          } else {
            throw new Error(resData?.message || 'Failed to save intake');
          }
        } else {
          const mockIntake = { _id: `intake-${Date.now()}`, ...intakePayload };
          setIntakes(prev => [...prev, mockIntake]);
        }
      }
      resetIntakeForm();
      setModalType(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSimpleItem = (e, listStateSetter, list, typeLabel) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!newItemText) return;
    if (list.includes(newItemText)) {
      alert("This item already exists.");
      return;
    }
    listStateSetter(prev => [...prev, newItemText]);
    addAuditLog(`ADD_SETTING_${(typeLabel || 'ITEM').toUpperCase()}`, 'Settings', newItemText, `Added ${typeLabel || 'item'}: ${newItemText}`);
    setModalType(null);
  };

  const handleDeleteSettingItem = async (itemToDelete, listStateSetter, typeLabel) => {
    if (!isWritable) {
      alert("Permission Denied: System configurations can only be modified by the Director.");
      return;
    }

    const token = localStorage.getItem('admin_token');
    const itemId = typeof itemToDelete === 'object' ? itemToDelete._id : null;
    const itemLabel = typeof itemToDelete === 'object' 
      ? (itemToDelete.name || itemToDelete.title) 
      : itemToDelete;

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
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteItem = (itemToDelete, listStateSetter, typeLabel) => {
    if (!isWritable) {
      alert("Permission Denied: System configurations can only be modified by the Director.");
      return;
    }
    listStateSetter(prev => prev.filter(item => item !== itemToDelete));
    addAuditLog(`DELETE_SETTING_${(typeLabel || 'ITEM').toUpperCase()}`, 'Settings', itemToDelete, `Deleted ${typeLabel || 'item'}: ${itemToDelete}`);
  };

  const handleDeleteDoc = (siNo, docName) => {
    if (!isWritable) {
      alert("Permission Denied: System configurations can only be modified by the Director.");
      return;
    }
    setCourseDocuments(prev => prev.filter(doc => doc.siNo !== siNo).map((doc, idx) => ({ ...doc, siNo: idx + 1 })));
    addAuditLog('DELETE_SETTING_DOC_RULE', 'Settings', docName || siNo, `Deleted doc rule: ${docName || siNo}`);
  };

  const handleDeleteAgent = (siNo, agentName) => {
    if (!isWritable) {
      alert("Permission Denied: System configurations can only be modified by the Director.");
      return;
    }
    setReferralAgents(prev => prev.filter(agent => agent.siNo !== siNo).map((agent, idx) => ({ ...agent, siNo: idx + 1 })));
    addAuditLog('DELETE_SETTING_AGENT', 'Settings', agentName || siNo, `Deleted agent setting: ${agentName || siNo}`);
  };

  const moveStage = (index, direction) => {
    if (!isWritable) {
      alert("Permission Denied: System configurations can only be modified by the Director.");
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
    addAuditLog('MOVE_SETTING_STAGE', 'Settings', temp, `Reordered pipeline stages (moved ${temp} ${direction})`);
  };

  const renderSettingsView = () => {
    switch (activeSubTab) {
      case 'settings-university':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Universities Master Directory</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage partner institutions, S3 logo images, entry criteria, and academic courses.</p>
              </div>
              <button
                onClick={openAddUnivModal}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center gap-1"
              >
                <span>+ Add University</span>
              </button>
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
                    universities.map((univ) => {
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
                              <button
                                onClick={() => setViewingUniv(univ)}
                                title="View Details"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => openEditUnivModal(univ)}
                                title="Edit University"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUniversity(univ)}
                                title="Delete University"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-course':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Academic Programs Directory</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage degree programs, tuition fees, assigned universities, and intake calendar associations.</p>
              </div>
              <button
                onClick={openAddCourseModal}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center gap-1"
              >
                <span>+ Add Course Program</span>
              </button>
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
                    courses.map((course) => {
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
                                  const titleStr = typeof i === 'object' ? i.title : i;
                                  return (
                                    <span key={idx} className="bg-slate-100 text-slate-700 border text-[9px] font-bold px-1.5 py-0.5 rounded">
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
                              <button
                                onClick={() => setViewingCourse(course)}
                                title="View Details"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => openEditCourseModal(course)}
                                title="Edit Course"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(course)}
                                title="Delete Course"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-intake':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Intake Seasons Directory</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define global admission intake windows and operational target seasons.</p>
              </div>
              <button
                onClick={openAddIntakeModal}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer flex items-center gap-1"
              >
                <span>+ Add Intake Season</span>
              </button>
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
                    intakes.map((intake) => {
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
                              <button
                                onClick={() => setViewingIntake(intake)}
                                title="View Details"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => openEditIntakeModal(intake)}
                                title="Edit Intake"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteIntake(intake)}
                                title="Delete Intake"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-course-docs':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Course Documents Configuration</h2>
              <button
                onClick={() => openAddModal('doc')}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                Add New Document Rule
              </button>
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
                  {courseDocuments.map((doc) => (
                    <tr key={doc.siNo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{doc.siNo}</td>
                      <td className="px-6 py-4 text-slate-950 font-black">{doc.name}</td>
                      <td className="px-6 py-4"><span className="bg-blue-50 border border-blue-100 text-blue-700 font-extrabold rounded-md px-2 py-0.5 text-[9px]">{doc.format}</span></td>
                      <td className="px-6 py-4 text-slate-500">{doc.minSize} MB</td>
                      <td className="px-6 py-4 text-slate-500">{doc.maxSize} MB</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteDoc(doc.siNo, doc.name)}
                          className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-agent':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">B2B Referral Agents</h2>
              <button
                onClick={() => openAddModal('agent')}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                Invite/Add Agent
              </button>
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
                  {referralAgents.map((agent) => (
                    <tr key={agent.siNo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{agent.siNo}</td>
                      <td className="px-6 py-4 text-slate-950 font-black">{agent.agentName}</td>
                      <td className="px-6 py-4 text-[#2563EB] font-bold">{agent.email}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteAgent(agent.siNo, agent.agentName)}
                          className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-stages':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Application Stages Pipeline</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Reorder stages or add customized milestones in the application workflow.</p>
              </div>
              <button
                onClick={() => openAddModal('stage')}
                className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
              >
                Add Stage
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs space-y-4">
              {stages.map((stage, idx) => (
                <div 
                  key={stage}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#D99A1C] hover:bg-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-slate-900">{stage}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => moveStage(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 bg-white text-slate-400 hover:text-slate-950 border border-slate-200 rounded-lg hover:shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => moveStage(idx, 'down')}
                      disabled={idx === stages.length - 1}
                      className="p-1.5 bg-white text-slate-400 hover:text-slate-950 border border-slate-200 rounded-lg hover:shadow-2xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      ▼
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(stage, setStages, 'stage')}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case null:
      case undefined:
      case '':
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
                    <button
                      onClick={() => setActiveSubTab && setActiveSubTab(card.id)}
                      className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-extrabold py-2 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                    >
                      Open Configuration
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        let list = [];
        let listSetter = null;
        let title = '';
        let addLabel = '';
        let inputPlaceholder = '';

        if (activeSubTab === 'settings-university') {
          list = universities;
          listSetter = setUniversities;
          title = 'Universities Master List';
          addLabel = 'Add University';
          inputPlaceholder = 'e.g. University of Exeter';
        } else if (activeSubTab === 'settings-course') {
          list = courses;
          listSetter = setCourses;
          title = 'Courses Master List';
          addLabel = 'Add Academic Course';
          inputPlaceholder = 'e.g. MBA General Management';
        } else if (activeSubTab === 'settings-intake') {
          list = intakes;
          listSetter = setIntakes;
          title = 'Intake Seasons';
          addLabel = 'Add Intake Option';
          inputPlaceholder = 'e.g. May/June 2027';
        } else if (activeSubTab === 'settings-formats') {
          list = fileFormats;
          listSetter = setFileFormats;
          title = 'Supported File Formats';
          addLabel = 'Add File Format Extension';
          inputPlaceholder = 'e.g. .png';
        } else if (activeSubTab === 'settings-qualifications') {
          list = qualifications;
          listSetter = setQualifications;
          title = 'Qualifications Level';
          addLabel = 'Add Qualification Tier';
          inputPlaceholder = 'e.g. Diploma';
        } else if (activeSubTab === 'settings-documents') {
          list = verificationDocuments;
          listSetter = setVerificationDocuments;
          title = 'Verification Checklist Documents';
          addLabel = 'Add Document Requirement';
          inputPlaceholder = 'e.g. Statement of Purpose (SOP)';
        } else if (activeSubTab === 'settings-actions') {
          list = stagedActions;
          listSetter = setStagedActions;
          title = 'Staged Automation Actions';
          addLabel = 'Add Automation Action';
          inputPlaceholder = 'e.g. Send SMS Welcome Template';
        }

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">{title}</h2>
              {listSetter && (
                <button
                  onClick={() => openAddModal(activeSubTab)}
                  className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
                >
                  {addLabel}
                </button>
              )}
            </div>

            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs space-y-3">
              {list.map((item, idx) => {
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
                        <button
                          onClick={() => openEditIntakeModal(item)}
                          className="text-indigo-500 hover:text-indigo-700 font-extrabold text-xs cursor-pointer bg-white px-2.5 py-1 border border-slate-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/20 transition-all shadow-3xs"
                        >
                          Edit
                        </button>
                      )}
                      {listSetter && (
                        <button
                          onClick={() => handleDeleteSettingItem(item, listSetter, activeSubTab.replace('settings-', ''))}
                          className="text-rose-500 hover:text-rose-700 font-extrabold text-xs cursor-pointer bg-white px-2.5 py-1 border border-slate-200 rounded-lg hover:border-rose-200 hover:bg-rose-50/20 transition-all shadow-3xs"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-6 bg-[#F0F2F5]">
      {!isWritable && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[11.5px] font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-xs mb-5">
          <span>ℹ️</span>
          <span>View-Only Mode: You are logged in as {currentUser?.role}. Portal configuration changes are reserved for the Director role.</span>
        </div>
      )}
      {renderSettingsView()}

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                {modalType === 'doc' && 'Add New Course Document Rule'}
                {modalType === 'agent' && 'Invite Referral Agent Channel'}
                {modalType === 'stage' && 'Add Application Pipeline Stage'}
                {modalType === 'edit-intake' && 'Edit Intake Season'}
                {modalType !== 'doc' && modalType !== 'agent' && modalType !== 'stage' && modalType !== 'edit-intake' && 'Add Configuration Lookup Item'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {modalType === 'doc' && (
              <form onSubmit={handleAddDocumentRule} className="space-y-4">
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">Add Rule</button>
                </div>
              </form>
            )}

            {modalType === 'agent' && (
              <form onSubmit={handleAddReferralAgent} className="space-y-4">
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">Add Agent</button>
                </div>
              </form>
            )}

            {modalType === 'stage' && (
              <form onSubmit={(e) => handleAddSimpleItem(e, setStages, stages, 'stage')} className="space-y-4">
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">Add Stage</button>
                </div>
              </form>
            )}

            {modalType === 'settings-university' && (
              <form onSubmit={handleSaveUniversity} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
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
                <div className="space-y-1.5 bg-slate-50 border border-dashed border-slate-300 p-3 rounded-xl">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">University Logo Image (S3 Upload)</label>
                  <div className="flex items-center gap-3">
                    {univLogoUrl ? (
                      <img src={univLogoUrl} alt="Logo Preview" className="w-12 h-12 object-contain border rounded-lg bg-white p-1 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 border rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">No Logo</div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        disabled={isUploadingLogo}
                        className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#D99A1C] file:text-white hover:file:bg-[#F5B025] cursor-pointer"
                      />
                      {isUploadingLogo && <p className="text-[10px] text-amber-600 font-bold animate-pulse">Uploading image to AWS S3...</p>}
                      {univLogoUrl && <p className="text-[9px] text-emerald-600 font-bold truncate">Uploaded: {univLogoUrl}</p>}
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">
                    {editingUniv ? 'Save Changes' : 'Add University'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'settings-course' && (
              <form onSubmit={handleSaveCourse} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
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
                      placeholder="e.g. £28,500 / yr"
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
                      const intId = typeof int === 'object' ? int._id : int;
                      const intTitle = typeof int === 'object' ? int.title : int;
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">
                    {editingCourse ? 'Save Changes' : 'Add Course'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'settings-intake' && (
              <form onSubmit={handleSaveIntake} className="space-y-4">
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">
                    {editingIntake ? 'Save Changes' : 'Add Intake'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'edit-intake' && (
              <form onSubmit={handleUpdateIntake} className="space-y-4">
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">Save Changes</button>
                </div>
              </form>
            )}

            {modalType !== 'doc' && modalType !== 'agent' && modalType !== 'stage' && 
             modalType !== 'settings-university' && modalType !== 'settings-course' && modalType !== 'settings-intake' && 
             modalType !== 'edit-intake' && (
              <form 
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
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl shadow-md">Add Item</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Single View University Modal */}
      {viewingUniv && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingUniv(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

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
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Assigned Academic Programs ({Array.isArray(viewingUniv.courses) ? viewingUniv.courses.length : 0})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {Array.isArray(viewingUniv.courses) && viewingUniv.courses.length > 0 ? (
                  viewingUniv.courses.map((course, idx) => {
                    const titleStr = typeof course === 'object' ? course.title : course;
                    const degreeStr = typeof course === 'object' ? course.degreeLevel : '';
                    const feeStr = typeof course === 'object' ? course.tuitionFee : '';
                    return (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border text-xs">
                        <span className="font-bold text-slate-800">🎓 {titleStr}</span>
                        <div className="flex gap-2 text-[10px] font-semibold text-slate-500">
                          {degreeStr && <span className="bg-slate-200 px-2 py-0.5 rounded">{degreeStr}</span>}
                          {feeStr && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">{feeStr}</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">No courses currently assigned</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                onClick={() => {
                  const target = viewingUniv;
                  setViewingUniv(null);
                  openEditUnivModal(target);
                }}
                className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                ✏️ Edit University
              </button>
              <button
                onClick={() => setViewingUniv(null)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Single View Course Modal */}
      {viewingCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingCourse(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

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
                    const titleStr = typeof int === 'object' ? int.title : int;
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
              <button
                onClick={() => {
                  const target = viewingCourse;
                  setViewingCourse(null);
                  openEditCourseModal(target);
                }}
                className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                ✏️ Edit Course
              </button>
              <button
                onClick={() => setViewingCourse(null)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single View Intake Modal */}
      {viewingIntake && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingIntake(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

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
              <button
                onClick={() => {
                  const target = viewingIntake;
                  setViewingIntake(null);
                  openEditIntakeModal(target);
                }}
                className="px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer"
              >
                ✏️ Edit Intake
              </button>
              <button
                onClick={() => setViewingIntake(null)}
                className="px-5 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
