import React, { useState } from 'react';

export default function Students({ clients, setClients, applications }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  
  // Onboard Student Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPassport, setNewStudentPassport] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [newStudentReferredBy, setNewStudentReferredBy] = useState('Direct');

  // Extract students (type === 'Student')
  const students = clients.filter(c => c.type === 'Student');
  const partners = clients.filter(c => c.type === 'Agent');

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
                        
    const statusMatch = statusFilter === 'All' || s.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOnboardStudent = (e) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentPhone) {
      alert("Please fill out required fields.");
      return;
    }

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
      dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    setClients(prev => [newStudent, ...prev]);

    // Reset fields & close modal
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    setNewStudentPassport('');
    setNewStudentDob('');
    setNewStudentReferredBy('Direct');
    setIsModalOpen(false);

    alert(`Student ${newStudentName} successfully onboarded.`);
  };

  // Find linked applications for a specific student
  const getStudentApplications = (studentName) => {
    return applications.filter(app => app.studentName.toLowerCase() === studentName.toLowerCase());
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Students Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage Direct and B2B-referred students, view files status and passport records.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Onboard Student</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
          {['All', 'Active', 'Inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === status 
                  ? 'bg-white text-[#D99A1C] shadow-sm font-black' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
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
            placeholder="Search by name, passport, email, source..."
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Student Profiles</h2>
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
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredStudents.map((student, idx) => {
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
                        <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-[#D99A1C] to-[#F5B025]">
                            {student.name.split(' ').map(n=>n[0]).join('')}
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
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${
                            student.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable details panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="bg-slate-50/50 p-6 border-t border-b border-slate-100">
                            <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-xl p-5 shadow-sm space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                  Student Dossier Profile — {student.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Onboarded On: {student.dateAdded || 'N/A'}
                                </p>
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
                                          <th className="px-4 py-2.5 text-slate-400 font-extrabold uppercase tracking-wider text-right">Workflow Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {studentApps.map(app => (
                                          <tr key={app.camsId} className="hover:bg-slate-50/30">
                                            <td className="px-4 py-3 font-mono font-bold text-[#2563EB]">{app.camsId}</td>
                                            <td className="px-4 py-3 text-slate-900 font-bold">{app.universityName}</td>
                                            <td className="px-4 py-3 text-slate-500 font-semibold">{app.courseName}</td>
                                            <td className="px-4 py-3 text-slate-500">{app.intake}</td>
                                            <td className="px-4 py-3 text-slate-400">{app.dateAdded}</td>
                                            <td className="px-4 py-3 text-right">
                                              <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${
                                                app.secondaryStatus === 'Offer Issued'
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
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Onboard Student Profile</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Register direct or referral student client profile</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold"
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
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs rounded-xl transition-all shadow-md"
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
