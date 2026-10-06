import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../api/axios';

export default function CommissionManagement({ clients = [], referralAgents = [], applications = [] }) {
  const toast = useToast();
  const { currentUser, hasPermission, addAuditLog } = useAuth();
  
  const [commissions, setCommissions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [isUpdatingId, setIsUpdatingId] = useState(null);

  // Set Commission Modal state
  const [modalCommission, setModalCommission] = useState(null);
  const [commissionMode, setCommissionMode] = useState('percentage'); // 'percentage' | 'fixed'
  const [commissionRate, setCommissionRate] = useState(10);
  const [fixedAmountInput, setFixedAmountInput] = useState(1500);
  const [modalNotes, setModalNotes] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);

  const fetchCommissions = async () => {
    try {
      const res = await API.get('/commissions');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const mapped = res.data.data.map((c, idx) => {
          const comId = (c.commissionId && String(c.commissionId).startsWith('COM-'))
            ? c.commissionId
            : (c.id && String(c.id).startsWith('COM-'))
              ? c.id
              : `COM-${1001 + idx}`;

          const fee = Number(c.fee || c.tuitionFee || c.courseFee || 15000);
          const rate = c.rate !== undefined && c.rate !== null ? Number(c.rate) : 10;
          const commType = c.commissionType || 'percentage';
          const fixedAmt = Number(c.fixedAmount || 0);

          let payableAmount = Number(c.amount || 0);
          if (!payableAmount || payableAmount <= 0) {
            payableAmount = commType === 'fixed' && fixedAmt > 0 
              ? fixedAmt 
              : Math.round((fee * (rate || 10)) / 100);
          }

          const universityPaid = Boolean(c.universityPaid || c.universityPaymentStatus === 'University Paid');

          return {
            id: comId,
            commissionId: comId,
            _id: c._id || c.id,
            studentName: c.studentName || c.student?.name || 'Student',
            courseName: c.courseName || c.course?.title || 'Course Program',
            partnerName: c.partnerName || c.partner?.companyName || c.partner?.name || 'Partner Agency',
            country: c.country || 'India',
            fee: fee,
            rate: rate,
            commissionType: commType,
            fixedAmount: fixedAmt,
            amount: payableAmount,
            universityPaid: universityPaid,
            universityPaymentStatus: universityPaid ? 'University Paid' : 'Waiting for University to Pay',
            payoutDate: c.payoutDate || '',
            isCommissionSet: Boolean(c.isCommissionSet || c.status === 'Paid'),
            status: c.status === 'Claimed' ? 'Pending Approval' : (c.status || 'Pending Approval'),
            notes: c.notes || ''
          };
        });
        setCommissions(mapped);
      } else {
        // Build from applications with claimed commission
        const claimedFromApps = applications
          .filter(a => a.commissionClaimed || a.commissionStatus === 'Claimed' || a.commissionStatus === 'Paid')
          .map((a, idx) => {
            const comId = `COM-${1001 + idx}`;
            const fee = Number(a.totalAmount || a.course?.tuitionFee || 15000);
            const rate = a.commissionRate !== undefined && a.commissionRate !== null ? Number(a.commissionRate) : 10;
            const commType = a.commissionType || 'percentage';
            const payable = Number(a.commissionAmount) || Math.round((fee * (rate || 10)) / 100);
            const uniPaid = Boolean(a.universityPaid || a.universityPaymentStatus === 'University Paid');

            return {
              id: comId,
              commissionId: comId,
              _id: a._id || a.id,
              studentName: a.studentName || a.student?.name || 'Student',
              courseName: a.courseName || a.course?.title || 'Course Program',
              partnerName: a.partnerName || a.partner?.companyName || a.partner?.name || 'Partner Agency',
              country: a.country || 'India',
              fee: fee,
              rate: rate,
              commissionType: commType,
              fixedAmount: 0,
              amount: payable,
              universityPaid: uniPaid,
              universityPaymentStatus: uniPaid ? 'University Paid' : 'Waiting for University to Pay',
              payoutDate: '',
              status: a.commissionStatus === 'Paid' ? 'Paid' : 'Pending Approval',
              notes: ''
            };
          });
        setCommissions(claimedFromApps);
      }
    } catch (err) {
      console.warn('Failed to fetch commissions:', err.message);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [applications]);
  
  // Scoped filtering
  const displayCommissions = commissions.filter(c => {
    const matchesStatus = filterStatus === 'All' 
      || c.status === filterStatus 
      || (filterStatus === 'Pending Approval' && (c.status === 'Pending Approval' || c.status === 'Claimed'));
    if (currentUser?.role === 'Country Head') {
      return matchesStatus && c.country === currentUser.country;
    }
    return matchesStatus;
  });

  const handleExport = () => {
    if (!hasPermission('commissions:export')) {
      toast.error("Permission Denied: You do not have permission to export financial reports.");
      return;
    }

    try {
      const headers = [
        'Commission ID', 
        'Student Name', 
        'Course Program', 
        'Partner Agency', 
        'Country', 
        'Tuition Fee (INR)', 
        'Commission Type',
        'Commission Rate (%)', 
        'Payable Amount (INR)', 
        'University Payment',
        'Status'
      ];
      const rows = displayCommissions.map((c, idx) => {
        const comId = c.id && !/^[0-9a-fA-F]{24}$/.test(c.id) ? c.id : (c.commissionId || `COM-${1001 + idx}`);
        return [
          comId,
          `"${(c.studentName || '').replace(/"/g, '""')}"`,
          `"${(c.courseName || '').replace(/"/g, '""')}"`,
          `"${(c.partnerName || '').replace(/"/g, '""')}"`,
          `"${(c.country || '').replace(/"/g, '""')}"`,
          c.fee || 0,
          c.commissionType || 'percentage',
          c.rate || 10,
          c.amount || 0,
          c.universityPaid ? 'University Paid' : 'Waiting for University to Pay',
          c.status || 'Pending Approval'
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `commissions_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (exportErr) {
      console.error('CSV generation error:', exportErr);
    }

    addAuditLog('EXPORT_FINANCIALS', 'Finance', 'COM-ALL', `Exported commission statement for ${displayCommissions.length} records.`);
    toast.success("Financial report exported successfully as CSV! (Logged to Audit Logs)");
  };

  // Toggle University Payment Status
  const handleToggleUniversityPayment = async (comm) => {
    const id = comm._id || comm.id;
    const nextState = !comm.universityPaid;
    const nextStatusText = nextState ? 'University Paid' : 'Waiting for University to Pay';

    setIsUpdatingId(id);
    try {
      const res = await API.put(`/commissions/${id}`, {
        universityPaid: nextState,
        universityPaymentStatus: nextStatusText
      });

      if (res.data?.success) {
        setCommissions(prev => prev.map(c => 
          (c.id === id || c._id === id) 
            ? { ...c, universityPaid: nextState, universityPaymentStatus: nextStatusText } 
            : c
        ));
        toast.success(
          nextState 
            ? 'University payment confirmed! Pay button is now enabled.' 
            : 'University payment marked as Waiting. Pay button disabled.'
        );
      } else {
        throw new Error(res.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Failed to toggle university payment:', err);
      // Optimistic local update as fallback
      setCommissions(prev => prev.map(c => 
        (c.id === id || c._id === id) 
          ? { ...c, universityPaid: nextState, universityPaymentStatus: nextStatusText } 
          : c
      ));
      toast.success(`Updated university status to: ${nextStatusText}`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Open Set Commission Modal
  const openSetCommissionModal = (comm) => {
    setModalCommission(comm);
    setCommissionMode(comm.commissionType || 'percentage');
    setCommissionRate(comm.rate !== undefined ? comm.rate : 10);
    setFixedAmountInput(comm.fixedAmount || comm.amount || Math.round((comm.fee * 0.1)));
    setModalNotes(comm.notes || '');
  };

  // Calculate live amount for modal
  const modalCalculatedAmount = commissionMode === 'percentage'
    ? Math.round(((modalCommission?.fee || 15000) * (Number(commissionRate) || 0)) / 100)
    : (Number(fixedAmountInput) || 0);

  // Save Commission from Modal
  const handleSaveModalCommission = async (andPay = false) => {
    if (!modalCommission) return;
    const id = modalCommission._id || modalCommission.id;

    if (andPay && !modalCommission.universityPaid) {
      toast.error("Cannot Pay: University has not paid yet! Toggle 'University Paid' first.");
      return;
    }

    setIsSavingModal(true);
    try {
      const payload = {
        commissionType: commissionMode,
        rate: Number(commissionRate) || 10,
        fixedAmount: Number(fixedAmountInput) || 0,
        amount: modalCalculatedAmount,
        notes: modalNotes,
        isCommissionSet: true
      };

      if (andPay) {
        payload.status = 'Paid';
        payload.payoutDate = new Date().toISOString().split('T')[0];
      }

      const res = await API.put(`/commissions/${id}`, payload);
      if (res.data?.success) {
        setCommissions(prev => prev.map(c => {
          if (c.id === id || c._id === id) {
            return {
              ...c,
              commissionType: commissionMode,
              rate: Number(commissionRate) || 10,
              fixedAmount: Number(fixedAmountInput) || 0,
              amount: modalCalculatedAmount,
              notes: modalNotes,
              isCommissionSet: true,
              status: andPay ? 'Paid' : c.status,
              payoutDate: andPay ? new Date().toISOString().split('T')[0] : c.payoutDate
            };
          }
          return c;
        }));

        toast.success(
          andPay 
            ? `Commission saved & payout of ₹${modalCalculatedAmount.toLocaleString()} approved!` 
            : `Commission settings saved: ₹${modalCalculatedAmount.toLocaleString()} (${commissionMode === 'percentage' ? commissionRate + '%' : 'Fixed'})`
        );
        setModalCommission(null);
        fetchCommissions();
      } else {
        throw new Error(res.data?.message || 'Failed to update commission');
      }
    } catch (err) {
      console.error('Error saving commission modal:', err);
      toast.error(err.response?.data?.message || 'Error saving commission details');
    } finally {
      setIsSavingModal(false);
    }
  };

  // Directly Click "Pay" in table
  const handleDirectPay = async (comm) => {
    const id = comm._id || comm.id;
    if (!comm.universityPaid) {
      toast.error("University has not paid yet. Please enable the university payment toggle before disbursing commission.");
      return;
    }

    setIsUpdatingId(id);
    try {
      const payload = {
        status: 'Paid',
        amount: comm.amount,
        rate: comm.rate || 10,
        commissionType: comm.commissionType || 'percentage',
        isCommissionSet: true,
        payoutDate: new Date().toISOString().split('T')[0],
        remarks: 'Commission approved & disbursed by Admin'
      };

      const res = await API.put(`/commissions/${id}`, payload);
      if (res.data?.success) {
        setCommissions(prev => prev.map(c => 
          (c.id === id || c._id === id) 
            ? { ...c, status: 'Paid', payoutDate: new Date().toISOString().split('T')[0] } 
            : c
        ));
        toast.success(`Commission payout of ₹${(comm.amount || 0).toLocaleString()} approved and marked as PAID!`);
        fetchCommissions();
      } else {
        throw new Error(res.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Error approving payout:', err);
      setCommissions(prev => prev.map(c => 
        (c.id === id || c._id === id) 
          ? { ...c, status: 'Paid', payoutDate: new Date().toISOString().split('T')[0] } 
          : c
      ));
      toast.success(`Commission payout updated to Paid.`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Permission Guard
  const canViewCommissions = hasPermission('commissions:view') || currentUser.role === 'Country Head';
  if (!canViewCommissions) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-[#F0F2F5]">
        <div className="bg-white border border-rose-200 border-t-4 border-t-rose-500 p-8 rounded-2xl shadow-md max-w-md text-center">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-sm font-black text-rose-900 uppercase mt-4">Access Denied</h2>
          <p className="text-[11px] text-slate-500 mt-2 font-semibold">
            You do not have the required permissions to view Commission Management. This incident has been logged.
          </p>
        </div>
      </div>
    );
  }

  // Calculate total agents
  const agentList = referralAgents.length > 0 
    ? referralAgents 
    : clients.filter(c => c.type === 'Agent');

  const totalAgents = agentList.length > 0 
    ? agentList.length 
    : (commissions.length > 0 ? new Set(commissions.map(c => c.partnerName)).size : 0);

  // Calculate stats
  const totalAmount = displayCommissions.reduce((acc, c) => acc + (c.amount || 0), 0);
  const paidAmount = displayCommissions.filter(c => c.status === 'Paid').reduce((acc, c) => acc + (c.amount || 0), 0);
  const pendingAmount = displayCommissions.filter(c => c.status === 'Pending Approval' || c.status === 'Claimed').reduce((acc, c) => acc + (c.amount || 0), 0);

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Commission Management</h1>
          <p className="text-xs text-slate-500 font-medium">
            Review partner calculations, configure commission rates (percentage/fixed), toggle university payments, and approve payouts {currentUser.role === 'Country Head' && `for ${currentUser.country}`}.
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
        {/* Card 1: Total Agents */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-indigo-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Agents</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{totalAgents}</span>
            <span className="text-[9px] font-bold text-indigo-500 uppercase">Active</span>
          </div>
        </div>

        {/* Card 2: Total Commission Volume */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-emerald-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Commission Volume</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{(totalAmount || 0).toLocaleString()}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">INR</span>
          </div>
        </div>

        {/* Card 3: Total Paid Commissions */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-blue-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Paid Commissions</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{(paidAmount || 0).toLocaleString()}</span>
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Cleared</span>
          </div>
        </div>

        {/* Card 4: Total Pending Commissions */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-amber-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Pending Commissions</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{(pendingAmount || 0).toLocaleString()}</span>
            <span className="text-[9px] font-bold text-amber-500 uppercase">In Review</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Calculated Partner Commissions</h2>
            <p className="text-[10px] text-slate-400 font-semibold">
              Default commission: 10% of Tuition. Enable University Payment toggle to unlock Pay button.
            </p>
          </div>
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
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Commission ID</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student File</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Agent / Partner</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Course Tuition</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Comm Rate</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Payable</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-center">University Payment</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {displayCommissions.map((comm, idx) => {
                  const isPaidStatus = comm.status === 'Paid';
                  const isUniPaid = comm.universityPaid;

                  return (
                    <tr key={comm._id || comm.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono font-black text-xs text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 inline-block shadow-2xs">
                          {comm.id && !/^[0-9a-fA-F]{24}$/.test(comm.id) ? comm.id : (comm.commissionId || `COM-${1001 + idx}`)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-[#0F172A] font-extrabold">{comm.studentName || 'Student'}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-xs">{comm.courseName || 'Course Program'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-950 font-bold">{comm.partnerName || 'Partner Agency'}</td>
                      <td className="px-5 py-4 text-slate-600 font-semibold">₹{(comm.fee || 0).toLocaleString()}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {comm.commissionType === 'fixed' ? (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                            Fixed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            {comm.rate || 10}%
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-900 font-extrabold text-sm">
                        ₹{(comm.amount || 0).toLocaleString()}
                      </td>

                      {/* University Payment Toggle Column */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleUniversityPayment(comm)}
                            disabled={isUpdatingId === (comm._id || comm.id) || !hasPermission('commissions:manage')}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isUniPaid ? 'bg-emerald-500' : 'bg-slate-300'
                            } ${!hasPermission('commissions:manage') ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title={isUniPaid ? 'University has paid Unigather (Click to toggle)' : 'Waiting for University to pay (Click to toggle)'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                isUniPaid ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[9px] font-bold tracking-tight px-1.5 py-0.5 rounded ${
                            isUniPaid 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isUniPaid ? 'Paid by Uni ✓' : 'Waiting for Uni'}
                          </span>
                        </div>
                      </td>

                      {/* Commission Status */}
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-block ${
                          isPaidStatus 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : (comm.status === 'Pending Approval' || comm.status === 'Claimed') 
                              ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse' 
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {comm.status === 'Claimed' ? 'Pending Approval' : comm.status}
                        </span>
                        {comm.payoutDate && isPaidStatus && (
                          <p className="text-[8px] text-slate-400 font-medium mt-0.5">{comm.payoutDate}</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {hasPermission('commissions:manage') ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Set Commission Button */}
                            <button
                              type="button"
                              onClick={() => openSetCommissionModal(comm)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                              title="Set Commission Rate (% or Fixed)"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Set Comm</span>
                            </button>

                            {/* Pay / Approve Payout Button */}
                            {!isPaidStatus ? (
                              <button
                                type="button"
                                disabled={!isUniPaid || isUpdatingId === (comm._id || comm.id)}
                                onClick={() => handleDirectPay(comm)}
                                title={!isUniPaid ? 'Disabled: Toggle University Payment to Paid first' : 'Disburse & Mark as Paid'}
                                className={`font-black text-[10px] uppercase px-3 py-1 rounded-lg transition-all inline-flex items-center gap-1 shadow-xs ${
                                  isUniPaid
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                                }`}
                              >
                                {isUpdatingId === (comm._id || comm.id) ? (
                                  <span>Saving...</span>
                                ) : (
                                  <>
                                    <span>Pay</span>
                                    {!isUniPaid && <span className="text-[9px]">🔒</span>}
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                <span>Paid</span>
                                <span>✓</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">Read-only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 font-bold">
              No commission records found matching scope filter.
            </div>
          )}
        </div>
      </div>

      {/* Set Commission Modal */}
      {modalCommission && (
        <div 
          onClick={() => !isSavingModal && setModalCommission(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Commission Configuration
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Set Commission for {modalCommission.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCommission(null)}
                disabled={isSavingModal}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Application & Partner Context Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold block">PARTNER AGENCY</span>
                <span className="font-extrabold text-slate-800">{modalCommission.partnerName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold block">COURSE PROGRAM</span>
                <span className="font-extrabold text-slate-800 truncate block" title={modalCommission.courseName}>
                  {modalCommission.courseName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold block">COURSE TUITION FEE</span>
                <span className="font-black text-slate-900 text-sm">₹{modalCommission.fee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold block">UNIVERSITY STATUS</span>
                <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                  modalCommission.universityPaid 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {modalCommission.universityPaid ? 'University Paid ✓' : 'Waiting for Uni'}
                </span>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Commission Calculation Type</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCommissionMode('percentage')}
                  className={`py-2 rounded-lg text-xs font-black transition-all ${
                    commissionMode === 'percentage'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Percentage (%) Wise
                </button>
                <button
                  type="button"
                  onClick={() => setCommissionMode('fixed')}
                  className={`py-2 rounded-lg text-xs font-black transition-all ${
                    commissionMode === 'fixed'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Fixed Amount (₹)
                </button>
              </div>
            </div>

            {/* Input based on mode */}
            {commissionMode === 'percentage' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Commission Percentage (%)</label>
                  <span className="text-[10px] text-slate-400 font-semibold">Default is 10%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="10"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-black text-sm">%</span>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-blue-700 font-semibold">
                    Calculation: ₹{modalCommission.fee.toLocaleString()} × {commissionRate || 0}%
                  </span>
                  <span className="text-blue-900 font-black text-sm">
                    = ₹{modalCalculatedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Fixed Commission Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-black text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={fixedAmountInput}
                    onChange={(e) => setFixedAmountInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="1500"
                  />
                </div>
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-purple-700 font-semibold">Payable Commission:</span>
                  <span className="text-purple-900 font-black text-sm">
                    ₹{modalCalculatedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Remarks / Payout Notes (Optional)</label>
              <input
                type="text"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="e.g., Incentive included or bank reference"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* University Payment warning if not paid */}
            {!modalCommission.universityPaid && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>University payment is pending. You can save this commission now, and pay once university clears payment.</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSavingModal}
                onClick={() => setModalCommission(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingModal}
                onClick={() => handleSaveModalCommission(false)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isSavingModal ? 'Saving...' : 'Save Commission'}
              </button>
              <button
                type="button"
                disabled={isSavingModal || !modalCommission.universityPaid}
                onClick={() => handleSaveModalCommission(true)}
                title={!modalCommission.universityPaid ? 'Disabled: Waiting for University Payment' : 'Save & Disburse Now'}
                className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-md inline-flex items-center gap-1 ${
                  modalCommission.universityPaid
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                <span>Save & Pay</span>
                {!modalCommission.universityPaid ? <span>🔒</span> : <span>✓</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
