import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ApplicationChatDrawer from '../components/ApplicationChatDrawer';
import API from '../api/axios';

const STATUS_STEPS = [
  'Submitted',
  'Under Review',
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

export default function Applications({ applications, referralAgents, onAddClick, onRefresh }) {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [selectedChatApp, setSelectedChatApp] = useState(null);

  // Status update modal state
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Submitted');
  const [remarks, setRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      const appId = statusModalApp.id || statusModalApp._id || statusModalApp.camsId;
      const res = await API.put(`/applications/${appId}`, {
        status: selectedStatus,
        remarks: remarks || `Status updated to ${selectedStatus}`
      });

      if (res.data?.success) {
        alert(`✓ Application status updated to "${selectedStatus}" successfully!`);
        setStatusModalApp(null);
        if (onRefresh) onRefresh();
      } else {
        alert(res.data?.message || 'Failed to update application status.');
      }
    } catch (err) {
      console.error('Update status error:', err);
      alert(err.response?.data?.message || err.message || 'Error updating status.');
    } finally {
      setIsUpdating(false);
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

    return searchMatch && statusMatch && partnerMatch;
  });

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
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

      {/* Advanced Filters */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'Submitted', 'Under Review', 'Conditional Offer Issued', 'CAS / I-20 Issued', 'Visa Approved', 'Enrolled / Closed'].map((status) => (
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredApps.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider pl-6">ID / CAMS ID</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student Profile</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University & Course</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Referred Partner</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status Stage</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Date Filed</th>
                  <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredApps.map((app) => {
                  const displayStatus = app.secondaryStatus || app.status || 'Submitted';
                  const isClosed = displayStatus.includes('Closed');
                  return (
                    <tr key={app.camsId || app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-extrabold text-[#D99A1C] pl-6 truncate max-w-[120px]">
                        {app.camsId.startsWith('CAMS') ? app.camsId : `CAMS${app.camsId.substring(app.camsId.length - 6).toUpperCase()}`}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-950 font-black">{app.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{app.passportNo || 'Pending Passport'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-950 font-black">{app.universityName}</p>
                        <p className="text-[10px] text-indigo-500 font-bold">{app.courseName} ({app.intake})</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-black">
                        {app.assignedBdm || 'Direct'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-extrabold ${
                          isClosed || displayStatus === 'Enrolled / Closed' || displayStatus === 'Visa Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black' 
                            : displayStatus.includes('Offer') || displayStatus.includes('CAS')
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : displayStatus.includes('Rejected')
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {app.dateAdded}
                      </td>
                      <td className="px-6 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openStatusModal(app)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Update Status</span>
                          </button>
                          <button
                            onClick={() => setSelectedChatApp(app)}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all shadow-3xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Chat / Logs</span>
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
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">No student application entries matched your search criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
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
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#D99A1C] hover:bg-[#F5B025] rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Save & Publish Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Chat & Logs Drawer */}
      {selectedChatApp && (
        <ApplicationChatDrawer
          app={selectedChatApp}
          onClose={() => setSelectedChatApp(null)}
        />
      )}
    </div>
  );
}
