import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Staff({ staffList, setStaffList, applications }) {
  const toast = useToast();
  const { currentUser, hasPermission, addAuditLog } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  // ----------------------------------------------------
  // STEP 1: Pagination State Variables
  // ----------------------------------------------------
  const [currentPage, setCurrentPage] = useState(1); // Default is Page 1
  const [itemsPerPage, setItemsPerPage] = useState(5); // Default is 5 items per page

  // ----------------------------------------------------
  // STEP 2: Reset to Page 1 when Search or Filters change
  // ----------------------------------------------------
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, countryFilter]);

  // Onboard Staff Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Executive');
  const [newStaffAccess, setNewStaffAccess] = useState('Read & Write');
  const [newStaffStatus, setNewStaffStatus] = useState('Active');
  const [newStaffCountry, setNewStaffCountry] = useState('India');
  const [passwordMode, setPasswordMode] = useState('auto'); // 'auto' | 'manual'
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManualPassword(res);
  };

  // Dynamic list of assigned countries derived from staff database & master list
  const defaultCountries = ['India', 'United Kingdom', 'Canada', 'Australia', 'United States'];
  const availableCountries = Array.from(
    new Set([
      ...defaultCountries,
      ...staffList.map(s => s.country).filter(Boolean)
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
  const baseFiltered = staffList.filter(s => {
    const name = s.name || '';
    const email = s.email || '';
    const role = s.role || '';
    const phone = s.phone || '';
    const country = s.country || 'India';

    const searchMatch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);

    const statusMatch = statusFilter === 'All' || s.status === statusFilter;
    const countryMatch = countryFilter === 'All' || country === countryFilter;

    return searchMatch && statusMatch && countryMatch;
  });

  // Apply scope filtering (Country Head only sees regional staff)
  const filteredStaff = baseFiltered.filter(s => {
    if (currentUser.role === 'Director' || currentUser.role === 'COO') return true;
    if (currentUser.role === 'Country Head') {
      return (s.country || 'India') === currentUser.country;
    }
    return false;
  });

  // ----------------------------------------------------
  // STEP 3: Pagination Math & Array Slicing
  // ----------------------------------------------------
  const totalItems = filteredStaff.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOnboardStaff = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail || !newStaffPhone) {
      toast.error("Please fill out all required fields.");
      return;
    }

    if (passwordMode === 'manual' && !manualPassword) {
      toast.error("Please enter an initial password or switch to Auto-generate.");
      return;
    }

    // Role Hierarchy Validation
    const userRoleHierarchy = { 'Director': 1, 'COO': 2, 'Finance': 3, 'Country Head': 4, 'BDM': 5, 'Executive': 6 };
    const currentUserLevel = userRoleHierarchy[currentUser.role] || 6;
    const targetStaffLevel = userRoleHierarchy[newStaffRole] || 6;

    if (targetStaffLevel <= currentUserLevel) {
      toast.error(`Permission Denied: You cannot onboard a user with equal or higher clearance level (${newStaffRole}) than your role (${currentUser.role}).`);
      return;
    }

    const assignedCountry = currentUser.role === 'Country Head' ? currentUser.country : newStaffCountry;

    const newStaff = {
      id: Date.now(),
      name: newStaffName,
      role: newStaffRole,
      email: newStaffEmail,
      phone: newStaffPhone,
      status: newStaffStatus,
      accessLevel: `${newStaffRole} (${newStaffAccess})`,
      country: assignedCountry,
      passwordType: passwordMode === 'auto' ? 'Auto-generated & Emailed' : 'Manual Initial Password',
      dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    setStaffList(prev => [...prev, newStaff]);
    addAuditLog('ONBOARD_STAFF', 'Staff', newStaff.id, `Onboarded ${newStaffName} as ${newStaffRole} (Country: ${assignedCountry}, Password Mode: ${passwordMode})`);

    // Reset form & close modal
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffRole('Executive');
    setNewStaffAccess('Read & Write');
    setNewStaffStatus('Active');
    setNewStaffCountry('India');
    setManualPassword('');
    setPasswordMode('auto');
    setIsModalOpen(false);

    if (passwordMode === 'auto') {
      toast.success(`Staff member ${newStaffName} onboarded. Invitation email with auto-generated password sent to ${newStaffEmail}!`);
    } else {
      toast.success(`Staff member ${newStaffName} onboarded with custom initial password.`);
    }
  };

  // Find applications assigned to this staff member
  const getAssignedApplications = (staffName) => {
    return applications.filter(app => (app.assignedTo || app.assignedExecutive || '').toLowerCase() === staffName.toLowerCase());
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Staff Management Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage backend admin operations staff, assign active client files and configure permissions by region.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            {['All', 'Active', 'Inactive', 'Suspended'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === status
                    ? 'bg-white text-[#D99A1C] shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {status}
              </button>
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
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[50px]"></th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[60px]">SI.NO.</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Assigned Country</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Access Clearance</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Assigned Files</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {/* ---------------------------------------------------- */}
                {/* STEP 4: Render paginatedStaff instead of filteredStaff */}
                {/* ---------------------------------------------------- */}
                {paginatedStaff.map((staff, idx) => {
                  const isExpanded = expandedId === staff.id;
                  const assignedApps = getAssignedApplications(staff.name);

                  return (
                    <React.Fragment key={staff.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(staff.id)}>
                        <td className="pl-6 py-4 w-[40px]">
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-[#D99A1C]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        {/* Serial number adjusted globally across pages */}
                        <td className="px-6 py-4 font-bold text-slate-400">{startIndex + idx + 1}</td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-[#D99A1C] to-[#F5B025]">
                            {staff.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-slate-950 font-black">{staff.name}</p>
                            <p className="text-[10px] text-slate-450 font-extrabold text-[#D99A1C] uppercase tracking-wide">{staff.role}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                            📍 {staff.country || 'India'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-bold">{staff.email}</td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">{staff.phone}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${staff.accessLevel.includes('Full Access')
                              ? 'bg-purple-50 text-purple-700 border-purple-100'
                              : staff.accessLevel.includes('Read & Write')
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-slate-50 text-slate-700 border-slate-100'
                            }`}>
                            {staff.accessLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-indigo-600">{assignedApps.length} Files</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${staff.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : staff.status === 'Suspended'
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                            {staff.status}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Section for staff details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="9" className="bg-slate-50/50 p-6 border-t border-b border-slate-100">
                            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-xl p-5 shadow-sm space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                  Staff Profile Summary — {staff.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Joined On: {staff.dateAdded || 'N/A'}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-[11px] font-semibold text-slate-600">
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Designation / Role</span>
                                  <span className="text-slate-900 font-bold text-xs">{staff.role}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Assigned Country</span>
                                  <span className="text-slate-900 font-extrabold text-xs">📍 {staff.country || 'India'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">System Access Tier</span>
                                  <span className="text-slate-900 font-bold text-xs">{staff.accessLevel}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Primary Email Address</span>
                                  <span className="text-indigo-650 font-bold text-xs">{staff.email}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Password Security</span>
                                  <span className="text-emerald-600 font-bold text-xs">✉️ {staff.passwordType || 'Auto-generated & Emailed'}</span>
                                </div>
                              </div>

                              {/* Assigned applications grid */}
                              <div className="space-y-2 pt-2">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Assigned Application Files ({assignedApps.length})</h4>
                                {assignedApps.length > 0 ? (
                                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150">
                                          <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">CAMS ID</th>
                                          <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">Student Name</th>
                                          <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">University</th>
                                          <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider">Program / Course</th>
                                          <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider text-right">Secondary Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {assignedApps.map(app => (
                                          <tr key={app.camsId} className="hover:bg-slate-50/30">
                                            <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{app.camsId}</td>
                                            <td className="px-4 py-3 text-slate-900 font-bold">{app.studentName}</td>
                                            <td className="px-4 py-3 text-slate-550 font-bold">{app.universityName}</td>
                                            <td className="px-4 py-3 text-slate-500">{app.courseName}</td>
                                            <td className="px-4 py-3 text-right">
                                              <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${app.secondaryStatus === 'Offer Issued'
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                  : app.secondaryStatus === 'Pending'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                {app.secondaryStatus}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                                    <p className="text-[10px] text-slate-400 font-semibold italic">No university application files are currently assigned to this staff member.</p>
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
              <h3 className="text-xs font-black text-slate-900 uppercase">No Staff Members Found</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">No staff records matched your search filters.</p>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* STEP 5: Pagination UI Controls Footer                */}
        {/* ---------------------------------------------------- */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Rows per page selector */}
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

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Previous Page Button */}
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ◀ Prev
              </button>

              {/* Dynamic Page Number Buttons */}
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

              {/* Next Page Button */}
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

      {/* Onboard Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Onboard Admin Staff</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Onboard a new operational team member and assign scope</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardStaff} className="space-y-4">
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
                    {currentUser.role === 'Director' && <option value="COO">Operations Head / COO</option>}
                    {(currentUser.role === 'Director' || currentUser.role === 'COO') && (
                      <>
                        <option value="Finance">Finance Team</option>
                        <option value="Country Head">Country Head</option>
                      </>
                    )}
                    {(currentUser.role === 'Director' || currentUser.role === 'COO' || currentUser.role === 'Country Head') && (
                      <>
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
                  placeholder="e.g. staff@studegram.com"
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

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Country <span className="text-rose-500">*</span></label>
                  <select
                    value={newStaffCountry}
                    onChange={(e) => setNewStaffCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] text-slate-900 cursor-pointer"
                    disabled={currentUser.role === 'Country Head'}
                  >
                    {availableCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
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
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Password Setup</label>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">Security Control</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPasswordMode('auto')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${passwordMode === 'auto'
                        ? 'bg-white border-[#D99A1C] text-[#D99A1C] shadow-xs font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                    ⚡ Auto-Generate & Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode('manual')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${passwordMode === 'manual'
                        ? 'bg-white border-[#D99A1C] text-[#D99A1C] shadow-xs font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                  >
                    🔑 Set Manual Password
                  </button>
                </div>

                {passwordMode === 'auto' ? (
                  <p className="text-[10px] text-slate-500 font-medium leading-normal bg-white p-2.5 rounded-lg border border-slate-200">
                    ✉️ System will automatically generate a secure temporary password and send a welcome invite email to <strong className="text-slate-800">{newStaffEmail || 'the staff email'}</strong>. The user will reset their password on first login.
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
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg transition-all whitespace-nowrap cursor-pointer"
                      >
                        🎲 Auto Fill
                      </button>
                    </div>
                  </div>
                )}
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
                  className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirm Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
