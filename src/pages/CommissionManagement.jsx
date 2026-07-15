import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CommissionManagement() {
  const { currentUser, hasPermission, addAuditLog } = useAuth();
  
  // Initial commissions mock database
  const [commissions, setCommissions] = useState([
    { id: 'COM-001', studentName: 'Shanto Shaju', partnerName: 'Salman', courseName: 'MSc International Hotel Management', fee: 14500, rate: 12, amount: 1740, status: 'Approved', country: 'India', date: '12 Jun 2026' },
    { id: 'COM-002', studentName: 'Aneesha Anil', partnerName: 'Aisha', courseName: 'MSc Human Resources Management', fee: 16000, rate: 10, amount: 1600, status: 'Pending Approval', country: 'India', date: '16 Jun 2026' },
    { id: 'COM-003', studentName: 'David Miller', partnerName: 'Global Study Group', courseName: 'BSc Computer Science', fee: 18500, rate: 15, amount: 2775, status: 'Paid', country: 'United Kingdom', date: '01 Jun 2026' },
    { id: 'COM-004', studentName: 'Li Wei', partnerName: 'Beijing Edu Consultancy', courseName: 'MBA Business Admin', fee: 22000, rate: 12, amount: 2640, status: 'Under Review', country: 'China', date: '05 Jun 2026' },
    { id: 'COM-005', studentName: 'Aditi Rao', partnerName: 'Salman', courseName: 'MSc Data Science', fee: 15500, rate: 12, amount: 1860, status: 'Pending Approval', country: 'India', date: '14 Jun 2026' }
  ]);

  const [filterStatus, setFilterStatus] = useState('All');
  
  // Scoped filtering: Country Head only sees their country's financials
  const displayCommissions = commissions.filter(c => {
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    if (currentUser.role === 'Country Head') {
      return matchesStatus && c.country === currentUser.country;
    }
    return matchesStatus;
  });

  const handleExport = () => {
    if (!hasPermission('commissions:export')) {
      alert("Permission Denied: You do not have permission to export financial reports.");
      return;
    }
    addAuditLog('EXPORT_FINANCIALS', 'Finance', 'COM-ALL', `Exported commission statement for ${displayCommissions.length} records.`);
    alert("Financial report exported successfully as CSV! (Logged to Audit Logs)");
  };

  const handleUpdateStatus = (id, newStatus) => {
    if (!hasPermission('commissions:manage')) {
      alert("Permission Denied: Only Finance Team, COO, or Director can manage commissions.");
      return;
    }
    
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    addAuditLog('UPDATE_COMMISSION_STATUS', 'Finance', id, `Updated commission status to ${newStatus}`);
    alert(`Commission ${id} status updated to ${newStatus}.`);
  };

  // Permission Guard
  const canViewCommissions = hasPermission('commissions:view') || currentUser.role === 'Country Head';
  if (!canViewCommissions) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-[#F0F2F5]">
        <div className="bg-white border border-rose-200 border-t-4 border-t-rose-500 p-8 rounded-2xl shadow-md max-w-md text-center">
          <span className="text-4xl">🚫</span>
          <h2 className="text-sm font-black text-rose-900 uppercase mt-4">Access Denied</h2>
          <p className="text-[11px] text-slate-500 mt-2 font-semibold">
            You do not have the required permissions to view Commission Management. This incident has been logged.
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalAmount = displayCommissions.reduce((acc, c) => acc + c.amount, 0);
  const paidAmount = displayCommissions.filter(c => c.status === 'Paid').reduce((acc, c) => acc + c.amount, 0);
  const pendingAmount = displayCommissions.filter(c => c.status === 'Pending Approval').reduce((acc, c) => acc + c.amount, 0);
  const reviewAmount = displayCommissions.filter(c => c.status === 'Under Review').reduce((acc, c) => acc + c.amount, 0);

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Commission Management</h1>
          <p className="text-xs text-slate-500 font-medium">
            Review partner calculations, approve agent payout pipelines, and view invoice records {currentUser.role === 'Country Head' && `for ${currentUser.country}`}.
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission('commissions:export') && (
            <button
              onClick={handleExport}
              className="bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-indigo-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Scoped Payouts</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">£{totalAmount.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">GBP</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-emerald-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Paid</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">£{paidAmount.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Cleared</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-amber-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pending Approval</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">£{pendingAmount.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-amber-500 uppercase">In Review</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-rose-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Under Dispute</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">£{reviewAmount.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-rose-500 uppercase">Held</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Calculated Partner Commissions</h2>
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-[10px] font-bold">
            {['All', 'Paid', 'Pending Approval', 'Under Review'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === status ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {displayCommissions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student File</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Agent / Partner</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Course Tuition</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Comm Rate</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Payable</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {displayCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-950">{comm.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-slate-900 font-extrabold">{comm.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-xs">{comm.courseName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-950 font-bold">{comm.partnerName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">{comm.country}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">£{comm.fee.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-400">{comm.rate}%</td>
                    <td className="px-6 py-4 text-slate-900 font-extrabold">£{comm.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        comm.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        comm.status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {comm.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasPermission('commissions:manage') ? (
                        <div className="flex justify-end gap-1.5">
                          {comm.status !== 'Paid' && (
                            <button
                              onClick={() => handleUpdateStatus(comm.id, 'Paid')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-md transition-all cursor-pointer shadow-sm"
                            >
                              Approve Payout
                            </button>
                          )}
                          {comm.status === 'Pending Approval' && (
                            <button
                              onClick={() => handleUpdateStatus(comm.id, 'Under Review')}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] uppercase px-2 py-1 rounded-md transition-all cursor-pointer"
                            >
                              Dispute
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 font-bold">
              No commission records found matching scope filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
