import AdminStaffDetails from '../components/AdminStaffDetails';
import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../api/axios';

export default function Staff({ staffList, setStaffList, applications }) {
  const toast = useToast();
  const { currentUser, hasPermission, addAuditLog } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [selectedStaffId, setSelectedStaffId] = useState(() => new URLSearchParams(window.location.search).get('adminStaffId'));
  useEffect(() => {
    const onPopState = () => setSelectedStaffId(new URLSearchParams(window.location.search).get('adminStaffId'));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigateToStaff = (staffId) => {
    const url = new URL(window.location.href);
    if (staffId) url.searchParams.set('adminStaffId', String(staffId));
    else url.searchParams.delete('adminStaffId');
    window.history.pushState({ ...window.history.state }, '', url);
    setSelectedStaffId(staffId ? String(staffId) : null);
    document.getElementById('admin-main-content')?.scrollTo({ top: 0 });
  };

  // Pagination State Variables
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, countryFilter]);

  const [dbAdminRoles, setDbAdminRoles] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/roles')
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.data)) {
          const filtered = data.data.filter(r => r.portalType === 'Admin');
          if (filtered.length > 0) {
            setDbAdminRoles(filtered);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Onboard Staff Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Executive');
  const [newStaffAccess, setNewStaffAccess] = useState('Read & Write');
  const [newStaffStatus, setNewStaffStatus] = useState('Active');
  const [newStaffCountries, setNewStaffCountries] = useState(['India']);
  const [passwordMode, setPasswordMode] = useState('auto'); // 'auto' | 'manual'
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Edit Staff Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffRole, setEditStaffRole] = useState('Executive');
  const [editStaffAccess, setEditStaffAccess] = useState('Read & Write');
  const [editStaffStatus, setEditStaffStatus] = useState('Active');
  const [editStaffCountries, setEditStaffCountries] = useState(['India']);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const getStaffCountries = (s) => {
    if (Array.isArray(s?.countries) && s.countries.length > 0) return s.countries;
    if (s?.country) return [s.country];
    return ['India'];
  };

  const safeStaffList = Array.isArray(staffList) ? staffList : [];

  // Dynamic list of assigned countries derived from staff database & master list
  const defaultCountries = ['India', 'United Kingdom', 'Canada', 'Australia', 'United States'];
  const availableCountries = Array.from(
    new Set([
      ...defaultCountries,
      ...safeStaffList.flatMap(s => getStaffCountries(s))
    ])
  );

  // Permission Guard
  if (!hasPermission('staff:view')) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-[#F0F2F5]">
        <div className="bg-white border border-rose-200 border-t-4 border-t-rose-500 p-8 rounded-2xl shadow-md max-w-md text-center">
          <span className="text-4xl">🚫</span>
          <h2 className="text-sm font-black text-rose-900 uppercase mt-4">Access Denied</h2>
          <p className="text-[11px] text-slate-500 mt-2 font-semibold">
            You do not have the required permissions to access Staff Management. This incident has been logged.
          </p>
        </div>
      </div>
    );
  }

  // Filter staff based on searching, status, and country
  const baseFiltered = safeStaffList.filter(s => {
    const name = s.name || '';
    const email = s.email || '';
    const role = s.role || '';
    const phone = s.phone || '';

    const searchMatch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);

    const statusMatch = statusFilter === 'All' || 
      (s.status || '').toLowerCase() === statusFilter.toLowerCase();
    const staffCountries = getStaffCountries(s);
    const countryMatch = countryFilter === 'All' || staffCountries.some(c => c.toLowerCase() === countryFilter.toLowerCase());

    return searchMatch && statusMatch && countryMatch;
  });

  // Apply scope filtering (Country Head / Regional staff scoping)
  const scopedStaff = safeStaffList.filter(s => {
    if (!currentUser?.role || ['Director', 'COO', 'Super Admin', 'SuperAdmin', 'Admin'].includes(currentUser.role)) return true;
    if (currentUser.role === 'Country Head') {
      return (s.country || 'India').toLowerCase() === (currentUser.country || 'India').toLowerCase();
    }
    return (s.country || 'India').toLowerCase() === (currentUser.country || 'India').toLowerCase();
  });

  const filteredStaff = baseFiltered.filter(staff => scopedStaff.includes(staff));
  const selectedStaff = scopedStaff.find(staff => String(staff._id || staff.id) === selectedStaffId);

  // Pagination Math & Array Slicing
  const totalItems = filteredStaff.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage);

  // Open Edit Modal with selected staff data
  const handleOpenEditModal = (staff) => {
    setEditingStaff(staff);
    setEditStaffName(staff.name || '');
    setEditStaffEmail(staff.email || '');
    setEditStaffPhone(staff.phone || '');
    setEditStaffRole(staff.role || 'Executive');
    setEditStaffAccess(
      staff.accessLevel?.includes('Full Access')
        ? 'Full Access'
        : staff.accessLevel?.includes('Read Only')
        ? 'Read Only'
        : 'Read & Write'
    );
    setEditStaffStatus(staff.status || 'Active');
    setEditStaffCountries(getStaffCountries(staff));
    setIsEditingPassword(false);
    setEditPassword('');
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  // Save Edit Staff
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editStaffName || !editStaffEmail) {
      toast.error('Name and email are required.');
      return;
    }

    setIsEditSubmitting(true);
    const staffTargetId = editingStaff._id || editingStaff.id;

    const payload = {
      name: editStaffName.trim(),
      email: editStaffEmail.trim().toLowerCase(),
      phone: editStaffPhone,
      role: editStaffRole,
      status: editStaffStatus,
      countries: editStaffCountries.length > 0 ? editStaffCountries : ['India'],
      country: editStaffCountries[0] || 'India',
      accessLevel: `${editStaffRole} (${editStaffAccess})`
    };

    if (isEditingPassword && editPassword && editPassword.trim()) {
      if (editPassword.trim().length < 4) {
        toast.error('New password must be at least 4 characters.');
        setIsEditSubmitting(false);
        return;
      }
      payload.password = editPassword.trim();
    }

    try {
      const res = await API.put(`/users/${staffTargetId}`, payload);
      const updatedUser = res.data?.data || payload;

      setStaffList(prev => prev.map(s => {
        const matches = (s._id && s._id === staffTargetId) || (s.id && s.id === staffTargetId);
        if (matches) {
          return {
            ...s,
            ...updatedUser,
            id: s.id,
            _id: s._id || s.id,
            name: editStaffName,
            email: editStaffEmail,
            phone: editStaffPhone,
            role: editStaffRole,
            status: editStaffStatus,
            country: payload.country,
            countries: payload.countries,
            accessLevel: `${editStaffRole} (${editStaffAccess})`
          };
        }
        return s;
      }));

      addAuditLog?.('UPDATE_STAFF', 'Staff', staffTargetId, `Updated staff profile for ${editStaffName}`);
      toast.success(`Staff member '${editStaffName}' updated successfully!`);
      if (isEditingPassword && editPassword) {
        toast.success(`New credentials successfully updated and emailed to ${editStaffEmail}!`);
      }
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff member details.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async (staff) => {
    const staffTargetId = staff._id || staff.id;
    setIsDeleting(true);

    try {
      await API.delete(`/users/${staffTargetId}`);
      setStaffList(prev => prev.filter(s => (s._id !== staffTargetId && s.id !== staffTargetId)));
      addAuditLog?.('DELETE_STAFF', 'Staff', staffTargetId, `Deleted staff member ${staff.name}`);
      toast.success(`Staff member '${staff.name}' deleted successfully.`);
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff member.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Onboard New Staff Member
  const handleOnboardStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail || !newStaffPhone) {
      toast.error("Please fill out all required fields.");
      return;
    }
    setIsSubmitting(true);

    if (passwordMode === 'manual' && !manualPassword) {
      toast.error("Please enter an initial password or switch to Auto-generate.");
      setIsSubmitting(false);
      return;
    }

    const assignedCountries = currentUser?.role === 'Country Head' ? [currentUser.country] : (newStaffCountries.length > 0 ? newStaffCountries : ['India']);
    const assignedCountry = assignedCountries[0];

    const passToSend = passwordMode === 'auto' ? generateRandomPassword() : manualPassword;

    const newStaff = {
      id: Date.now(),
      _id: null,
      name: newStaffName,
      role: newStaffRole,
      email: newStaffEmail,
      phone: newStaffPhone,
      status: newStaffStatus,
      accessLevel: `${newStaffRole} (${newStaffAccess})`,
      country: assignedCountry,
      countries: assignedCountries,
      passwordType: passwordMode === 'auto' ? 'Auto-generated & Emailed' : 'Manual Initial Password',
      dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    // Trigger network API call to register/onboard staff on backend server
    try {
      let res;
      const buildStaffPayload = (statusVal) => ({
        name: newStaffName,
        email: newStaffEmail,
        phone: newStaffPhone,
        role: newStaffRole,
        country: assignedCountry,
        countries: assignedCountries,
        status: statusVal,
        accessLevel: `${newStaffRole} (${newStaffAccess})`,
        password: passToSend
      });

      try {
        res = await API.post('/users', buildStaffPayload(newStaffStatus));
      } catch (postErr) {
        if (postErr.response?.status === 404 || postErr.response?.status === 403) {
          res = await API.post('/auth/register', buildStaffPayload(newStaffStatus));
        } else {
          throw postErr;
        }
      }

      if (res?.data?.data) {
        newStaff.id = res.data.data._id || newStaff.id;
        newStaff._id = res.data.data._id || newStaff.id;
      }

      setStaffList(prev => [...prev, newStaff]);
      addAuditLog?.('ONBOARD_STAFF', 'Staff', newStaff.id, `Onboarded ${newStaffName} as ${newStaffRole} (Country: ${assignedCountry}, Password Mode: ${passwordMode})`);

      // Reset form & close modal
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffRole('Executive');
      setNewStaffAccess('Read & Write');
      setNewStaffStatus('Active');
      setNewStaffCountries(['India']);
      setManualPassword('');
      setPasswordMode('auto');
      setIsModalOpen(false);

      toast.success(`Staff member ${newStaffName} onboarded successfully! Welcome email with login credentials sent to ${newStaffEmail}.`);
    } catch (err) {
      console.error('API staff registration error:', err);
      toast.error(err.response?.data?.message || 'Failed to onboard staff member. Please check fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Persisted identifiers take precedence; names only support legacy records without IDs.
  const matchesStaff = (assignment, staff) => {
    if (!assignment || !staff) return false;
    const staffId = String(staff._id || staff.id || '');
    const assignedId = typeof assignment === 'object' ? assignment.id || assignment._id : assignment;
    if (assignedId && /^[a-f0-9]{24}$/i.test(String(assignedId))) return String(assignedId) === staffId;
    if (assignedId && typeof assignment === 'object') return String(assignedId) === staffId;
    const email = typeof assignment === 'object' ? assignment.email : '';
    if (email) return email.trim().toLowerCase() === (staff.email || '').trim().toLowerCase();
    const name = typeof assignment === 'object' ? assignment.name : assignment;
    return typeof name === 'string' && !!staff.name && name.trim().toLowerCase() === staff.name.trim().toLowerCase();
  };
  const getAssignedApplications = staff => (applications || []).filter(app => matchesStaff(app.pickedBy, staff));
  const getSubmittedApplications = staff => (applications || []).filter(app => matchesStaff(app.submittedByStaff, staff));

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {selectedStaffId ? <AdminStaffDetails staff={selectedStaff} countries={selectedStaff ? (selectedStaff.countries?.length ? selectedStaff.countries : selectedStaff.country ? [selectedStaff.country] : []) : []} assignedApplications={getAssignedApplications(selectedStaff)} submittedApplications={getSubmittedApplications(selectedStaff)} onBack={() => navigateToStaff(null)} onEdit={handleOpenEditModal} /> : <>
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Staff Management Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage backend admin operations staff, edit profiles, assign active client files and configure permissions by region.</p>
        </div>
        <ActionButton
          onClick={() => setIsModalOpen(true)}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Add Staff Member</span>
        </ActionButton>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            {['All', 'Active', 'Inactive', 'Suspended'].map((status) => (
              <ActionButton
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === status
                    ? 'bg-white text-[#D99A1C] shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {status}
              </ActionButton>
            ))}
          </div>

          {/* Country Filter Dropdown (Dynamic) */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] font-extrabold cursor-pointer"
          >
            <option value="All">All Assigned Countries</option>
            {availableCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

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
            placeholder="Search by name, role, email, phone..."
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Operations Team</h2>
          <span className="text-[10px] font-bold text-slate-400">
            Showing {totalItems > 0 ? startIndex + 1 : 0} - {endIndex} of {totalItems} Members
          </span>
        </div>
        <div className="overflow-x-auto">
          {filteredStaff.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[60px]">SI.NO.</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Assigned Country</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Access Clearance</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Assigned Files</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {paginatedStaff.map((staff, idx) => {
                  const assignedApps = getAssignedApplications(staff);

                  return (
                    <React.Fragment key={staff._id || staff.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-400">{startIndex + idx + 1}</td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-[#D99A1C] to-[#F5B025]">
                            {staff.name ? staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <div>
                            <p className="text-slate-950 font-black">{staff.name}</p>
                            <p className="text-[10px] text-slate-450 font-extrabold text-[#D99A1C] uppercase tracking-wide">{staff.role}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {getStaffCountries(staff).map(c => (
                              <span key={c} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                                📍 {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-bold">{staff.email}</td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">{staff.phone || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                            staff.accessLevel?.includes('Full Access')
                              ? 'bg-purple-50 text-purple-700 border-purple-100'
                              : staff.accessLevel?.includes('Read & Write')
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : 'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                            {staff.accessLevel || staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-indigo-600">{assignedApps.length} Files</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${(staff.status || '').toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : (staff.status || '').toLowerCase() === 'suspended'
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                            {staff.status || 'Active'}
                          </span>
                        </td>

                        {/* Actions Column (Edit & Delete) */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionButton
                              type="button"
                              onClick={() => navigateToStaff(staff._id || staff.id)}
                              className="p-1.5 text-slate-500 hover:text-[#D99A1C] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="View Staff Details"
                              aria-label={`View details for ${staff.name || 'staff member'}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" strokeWidth="2" /></svg>
                            </ActionButton>
                            <ActionButton
                              type="button"
                              onClick={() => handleOpenEditModal(staff)}
                              className="p-1.5 text-slate-500 hover:text-[#D99A1C] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Staff Member"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </ActionButton>

                            {deleteConfirmId === (staff._id || staff.id) ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-1">
                                <ActionButton
                                  type="button"
                                  onClick={() => handleDeleteStaff(staff)}
                                  disabled={isDeleting}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded transition-all cursor-pointer"
                                >
                                  {isDeleting ? '...' : 'Confirm'}
                                </ActionButton>
                                <ActionButton
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 text-slate-500 text-[10px] hover:text-slate-700 cursor-pointer"
                                >
                                  Cancel
                                </ActionButton>
                              </div>
                            ) : (
                              <ActionButton
                                type="button"
                                onClick={() => setDeleteConfirmId(staff._id || staff.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Staff Member"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </ActionButton>
                            )}
                          </div>
                        </td>
                      </tr>

                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 font-semibold text-xs">
              No staff members found matching the specified search and filter criteria.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
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

      </>}

      {/* Onboard Staff Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Onboard Admin Staff</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Onboard a new operational team member and send credentials email</p>
              </div>
              <ActionButton
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleOnboardStaff} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  placeholder="e.g. Sreelakshmi S"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Designation / Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  >
                    {dbAdminRoles.length > 0 ? (
                      dbAdminRoles.map(r => (
                        <option key={r._id || r.name} value={r.name}>{r.displayName || r.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="SuperAdmin">SuperAdmin</option>
                        <option value="Director">Director</option>
                        <option value="COO">Operations Head / COO</option>
                        <option value="CRE">CRE</option>
                        <option value="Finance">Finance Team</option>
                        <option value="Country Head">Country Head</option>
                        <option value="BDM">BDM</option>
                        <option value="Executive">Executive</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Access Clearance</label>
                  <select
                    value={newStaffAccess}
                    onChange={(e) => setNewStaffAccess(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  >
                    <option value="Full Access">Full Access</option>
                    <option value="Read & Write">Read & Write (Operations)</option>
                    <option value="Read Only">Read Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Contact Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  placeholder="e.g. staff@unigather.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                    placeholder="e.g. +91 9999988888"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Countries (Select Multiple) <span className="text-rose-500">*</span></label>
                  <div className="flex flex-wrap gap-2 bg-slate-50 p-3 border border-slate-200 rounded-xl">
                    {availableCountries.map(country => {
                      const isSelected = newStaffCountries.includes(country);
                      return (
                        <ActionButton
                          key={country}
                          type="button"
                          disabled={currentUser?.role === 'Country Head'}
                          onClick={() => {
                            if (isSelected) {
                              if (newStaffCountries.length > 1) {
                                setNewStaffCountries(newStaffCountries.filter(c => c !== country));
                              }
                            } else {
                              setNewStaffCountries([...newStaffCountries, country]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#D99A1C] text-white border-[#D99A1C] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{country}
                        </ActionButton>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Initial Account Status</label>
                <select
                  value={newStaffStatus}
                  onChange={(e) => setNewStaffStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              {/* Password Setup Section */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Password Setup & Dispatch</label>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">Credential Email</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <ActionButton
                    type="button"
                    onClick={() => setPasswordMode('auto')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${passwordMode === 'auto'
                        ? 'bg-white border-[#D99A1C] text-[#D99A1C] shadow-xs font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                    ⚡ Auto-Generate & Email
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => setPasswordMode('manual')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${passwordMode === 'manual'
                        ? 'bg-white border-[#D99A1C] text-[#D99A1C] shadow-xs font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                    🔑 Set Manual Password
                  </ActionButton>
                </div>

                {passwordMode === 'auto' ? (
                  <p className="text-[10px] text-slate-500 font-medium leading-normal bg-white p-2.5 rounded-lg border border-slate-200">
                    ✉️ System will generate a secure temporary password and send a formal welcome email with login credentials to <strong className="text-slate-800">{newStaffEmail || 'the staff email'}</strong>.
                  </p>
                ) : (
                  <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={manualPassword}
                          onChange={(e) => setManualPassword(e.target.value)}
                          placeholder="Enter initial password..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#D99A1C]"
                        />
                        <ActionButton
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </ActionButton>
                      </div>
                      <ActionButton
                        type="button"
                        onClick={() => setManualPassword(generateRandomPassword())}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg transition-all whitespace-nowrap cursor-pointer"
                      >
                        🎲 Auto Fill
                      </ActionButton>
                    </div>
                  </div>
                )}
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
                  className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
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

      {/* Edit Staff Modal */}
      {isEditModalOpen && editingStaff && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Edit Staff Member</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Update account details, role permissions, or reset login password</p>
              </div>
              <ActionButton
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Designation / Role</label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  >
                    {dbAdminRoles.length > 0 ? (
                      dbAdminRoles.map(r => (
                        <option key={r._id || r.name} value={r.name}>{r.displayName || r.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="SuperAdmin">SuperAdmin</option>
                        <option value="Director">Director</option>
                        <option value="COO">Operations Head / COO</option>
                        <option value="CRE">CRE</option>
                        <option value="Finance">Finance Team</option>
                        <option value="Country Head">Country Head</option>
                        <option value="BDM">BDM</option>
                        <option value="Executive">Executive</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Access Clearance</label>
                  <select
                    value={editStaffAccess}
                    onChange={(e) => setEditStaffAccess(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  >
                    <option value="Full Access">Full Access</option>
                    <option value="Read & Write">Read & Write (Operations)</option>
                    <option value="Read Only">Read Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Contact Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="tel"
                    value={editStaffPhone}
                    onChange={(e) => setEditStaffPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Account Status</label>
                  <select
                    value={editStaffStatus}
                    onChange={(e) => setEditStaffStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Countries (Select Multiple)</label>
                <div className="flex flex-wrap gap-2 bg-slate-50 p-3 border border-slate-200 rounded-xl">
                  {availableCountries.map(country => {
                    const isSelected = editStaffCountries.includes(country);
                    return (
                      <ActionButton
                        key={country}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (editStaffCountries.length > 1) {
                              setEditStaffCountries(editStaffCountries.filter(c => c !== country));
                            }
                          } else {
                            setEditStaffCountries([...editStaffCountries, country]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#D99A1C] text-white border-[#D99A1C] shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{country}
                      </ActionButton>
                    );
                  })}
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditingPassword}
                      onChange={(e) => {
                        setIsEditingPassword(e.target.checked);
                        if (!e.target.checked) setEditPassword('');
                      }}
                      className="rounded text-[#D99A1C] focus:ring-[#D99A1C]"
                    />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Change Account Password</span>
                  </label>
                  {isEditingPassword && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">Will Email Staff</span>
                  )}
                </div>

                {isEditingPassword && (
                  <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200 animate-in fade-in-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Enter new secure password (min 4 chars)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#D99A1C]"
                        />
                        <ActionButton
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-2 top-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                        >
                          {showEditPassword ? "Hide" : "Show"}
                        </ActionButton>
                      </div>
                      <ActionButton
                        type="button"
                        onClick={() => setEditPassword(generateRandomPassword())}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg transition-all whitespace-nowrap cursor-pointer"
                      >
                        🎲 Auto Fill
                      </ActionButton>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      An update email with the new password will be sent automatically to <strong className="text-slate-800">{editStaffEmail}</strong> upon saving.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <ActionButton
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  {isEditSubmitting && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isEditSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </ActionButton>
              </div>
            </ActionForm>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
