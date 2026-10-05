import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StaffActivitySingleView from './StaffActivitySingleView';

// Helper to format date and time nicely
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatTimeOnly = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const getRoleBadgeColor = (role = '') => {
  switch (role) {
    case 'SuperAdmin':
    case 'Director':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'COO':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Country Head':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Finance':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'OperationsHead':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'CRE':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'BDM':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export default function StaffActivityLogs() {
  const toast = useToast();
  const { currentUser, hasPermission } = useAuth();

  // Navigation / Single View State
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [activeSubView, setActiveSubView] = useState('summary'); // 'summary' | 'sessions'

  // Data States
  const [staffSummary, setStaffSummary] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [stats, setStats] = useState({
    onlineNow: 0,
    totalSessionsToday: 0,
    totalPortalMinutesToday: 0,
    totalPortalTimeFormatted: '0m',
    activeStaffToday: 0,
    totalStaffRegistered: 0
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Online' | 'Offline'
  const [timeframe, setTimeframe] = useState('All');

  // Pagination for Session Logs
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalSessionsCount, setTotalSessionsCount] = useState(0);

  const fetchOverviewData = async () => {
    setIsRefreshing(true);
    try {
      // Parallel requests for stats, staff summary, and session logs
      const [statsRes, summaryRes, logsRes] = await Promise.all([
        API.get('/activity-logs/stats').catch(e => ({ error: e })),
        API.get('/activity-logs/staff-summary').catch(e => ({ error: e })),
        API.get('/activity-logs', {
          params: {
            search: searchTerm,
            role: roleFilter,
            status: statusFilter === 'Online' ? 'Active' : statusFilter === 'Offline' ? 'Completed' : undefined,
            timeframe: timeframe !== 'All' ? timeframe : undefined,
            page: currentPage,
            limit: itemsPerPage
          }
        }).catch(e => ({ error: e }))
      ]);

      if (statsRes.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats);
      }

      if (summaryRes.data?.success && Array.isArray(summaryRes.data.data)) {
        setStaffSummary(summaryRes.data.data);
      }

      if (logsRes.data?.success && Array.isArray(logsRes.data.data)) {
        setSessionLogs(logsRes.data.data);
        setTotalSessionsCount(logsRes.data.total || logsRes.data.data.length);
      }
    } catch (err) {
      console.error('Error fetching staff activity logs:', err);
      toast.showToast('Failed to sync staff activity data', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [searchTerm, roleFilter, statusFilter, timeframe, currentPage, itemsPerPage]);

  // Periodic background refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOverviewData();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filtered staff summary list
  const filteredStaffSummary = staffSummary.filter(staff => {
    const matchesSearch =
      (staff.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.phone || '').includes(searchTerm);

    const matchesRole = roleFilter === 'All' || staff.role === roleFilter;

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Online' && staff.isOnline) ||
      (statusFilter === 'Offline' && !staff.isOnline);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Unique roles for dropdown filter
  const availableRoles = Array.from(
    new Set([
      'Director',
      'COO',
      'Country Head',
      'Finance',
      'OperationsHead',
      'CRE',
      'BDM',
      'Executive',
      ...staffSummary.map(s => s.role).filter(Boolean)
    ])
  );

  // If a single staff member is selected, show the Single View Timeline page!
  if (selectedStaffId) {
    return (
      <StaffActivitySingleView
        staffId={selectedStaffId}
        onBack={() => setSelectedStaffId(null)}
      />
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header and Live Sync Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Audit & Operations
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-3">
            <span>Staff Activity Log</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400">
              Live Monitor
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track staff logins, session logouts, portal time spent, and inspect full chronological operational timelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOverviewData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Logs'}</span>
          </button>
        </div>
      </div>

      {/* Top Key Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Staff Online Now */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Staff Online Now</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.onlineNow || 0}</span>
              <span className="text-xs font-bold text-emerald-600">Active</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Connected in last 10m</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl relative">
            <span className="w-3 h-3 rounded-full bg-emerald-500 absolute top-2 right-2 animate-ping"></span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Portal Time Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Portal Time Today</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-600">{stats.totalPortalTimeFormatted || '0m'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total staff hours today</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Card 3: Sessions Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sessions Today</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-600">{stats.totalSessionsToday || 0}</span>
              <span className="text-xs font-semibold text-slate-400">logins</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">
              Across {stats.activeStaffToday || 0} staff members
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>

        {/* Card 4: Registered Staff Monitored */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monitored Staff</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.totalStaffRegistered || staffSummary.length}</span>
              <span className="text-xs font-semibold text-slate-400">staff</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Active roster accounts</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs and Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* View Mode Toggle: Staff Summary vs All Session Logs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveSubView('summary')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubView === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Staff Summary Overview ({filteredStaffSummary.length})</span>
            </button>

            <button
              onClick={() => setActiveSubView('sessions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubView === 'sessions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>All Session Logs ({totalSessionsCount})</span>
            </button>
          </div>

          {/* Quick Info text */}
          <div className="text-xs text-slate-400 font-semibold hidden md:block">
            Showing records with active login/logout duration metrics
          </div>
        </div>

        {/* Filter Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search staff name, email, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="All">All Staff Roles</option>
              {availableRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="All">All Online Statuses</option>
              <option value="Online">🟢 Online Now Only</option>
              <option value="Offline">Offline Staff</option>
            </select>
          </div>

          {/* Timeframe Filter */}
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="All">All Timeframes</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Active SubView */}
      {activeSubView === 'summary' ? (
        /* ================= SUBVIEW 1: STAFF SUMMARY LIST ================= */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Country</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Last Login Time</th>
                  <th className="py-3 px-4">Last Logout Time</th>
                  <th className="py-3 px-4">Time Spent (Today)</th>
                  <th className="py-3 px-4">Total Time Spent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaffSummary.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold">
                      No staff activity records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStaffSummary.map((staff) => (
                    <tr
                      key={staff.userId || staff.email}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedStaffId(staff.userId || staff.email)}
                    >
                      {/* Staff Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs">
                              {staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST'}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                                staff.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            ></span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-amber-600 transition-colors">
                              {staff.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-normal">
                              {staff.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Country */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(staff.role)}`}>
                            {staff.role}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {staff.country || 'India'}
                          </span>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-4">
                        {staff.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online Now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Last Login Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                        {formatDateTime(staff.lastLogin)}
                      </td>

                      {/* Last Logout Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                        {staff.isOnline ? (
                          <span className="text-emerald-600 font-bold">Active in Session</span>
                        ) : (
                          formatDateTime(staff.lastLogout)
                        )}
                      </td>

                      {/* Time Spent Today */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${staff.todayMinutes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {staff.todayTimeFormatted || '0m'}
                          </span>
                        </div>
                      </td>

                      {/* Total Time Spent */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-black text-slate-900 block">
                            {staff.totalTimeFormatted || '0m'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {staff.totalSessions || 0} sessions
                          </span>
                        </div>
                      </td>

                      {/* Action: View Timeline Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaffId(staff.userId || staff.email);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          <span>Timeline</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= SUBVIEW 2: GRANULAR SESSION LOGS ================= */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Login Time</th>
                  <th className="py-3 px-4">Logout Time</th>
                  <th className="py-3 px-4">Time Spent</th>
                  <th className="py-3 px-4">Device & IP</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sessionLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold">
                      No session logs found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  sessionLogs.map((sess) => (
                    <tr
                      key={sess._id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedStaffId(sess.user?._id || sess.user || sess.userEmail)}
                    >
                      {/* Staff Info */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block">{sess.userName}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{sess.userEmail}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(sess.userRole)}`}>
                          {sess.userRole}
                        </span>
                      </td>

                      {/* Login Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                        {formatDateTime(sess.loginTime)}
                      </td>

                      {/* Logout Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                        {sess.isActive ? (
                          <span className="text-emerald-600 font-bold">Active Now</span>
                        ) : (
                          formatDateTime(sess.logoutTime)
                        )}
                      </td>

                      {/* Time Spent */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          {sess.durationFormatted || '0m'}
                        </span>
                      </td>

                      {/* Device & IP */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div>
                          <span className="font-medium text-slate-700 block">{sess.device || 'Desktop'}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">IP: {sess.ipAddress || '127.0.0.1'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {sess.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaffId(sess.user?._id || sess.user || sess.userEmail);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                        >
                          View Timeline
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
            <span>
              Showing {sessionLogs.length} of {totalSessionsCount} session logs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold"
              >
                Previous
              </button>
              <span className="px-2 text-slate-700 font-bold">Page {currentPage}</span>
              <button
                disabled={currentPage * itemsPerPage >= totalSessionsCount}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
