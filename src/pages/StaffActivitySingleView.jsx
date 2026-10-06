import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';

// Helper to format date nicely
const formatDateHeader = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today - ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday - ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTimeOnly = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
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

export default function StaffActivitySingleView({ staffId, onBack }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  const fetchStaffDetails = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/activity-logs/staff/${staffId}`);
      if (res.data?.success) {
        setData(res.data);
      } else {
        toast.showToast('Could not load staff activity details', 'error');
      }
    } catch (err) {
      console.error('Fetch staff activity timeline error:', err);
      toast.showToast('Failed to connect to activity logs endpoint', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      fetchStaffDetails();
    }
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-[#D99A1C]/20 border-t-[#D99A1C] rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          Loading Staff Activity Timeline...
        </p>
      </div>
    );
  }

  if (!data || !data.staff) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 mt-12 shadow-sm">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          !
        </div>
        <h3 className="text-base font-bold text-slate-800">Staff Records Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          No activity logs could be found for this staff member identifier.
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Activity Logs
        </button>
      </div>
    );
  }

  const { staff, stats, sessions = [], timeline = [] } = data;

  // Filter timeline items
  const filteredTimeline = timeline.filter(item => {
    // Category filter
    if (categoryFilter !== 'All') {
      if (categoryFilter === 'Auth' && item.category !== 'Auth') return false;
      if (categoryFilter === 'Application' && item.category !== 'Application') return false;
      if (categoryFilter === 'Other' && ['Auth', 'Application'].includes(item.category)) return false;
    }

    // Date filter
    if (dateFilter !== 'All') {
      const itemDate = new Date(item.timestamp);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        if (itemDate < startOfDay) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (itemDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        if (itemDate < monthAgo) return false;
      }
    }
    return true;
  });

  // Group filtered timeline items by Day Date String
  const timelineGroups = [];
  let currentGroup = null;

  filteredTimeline.forEach(item => {
    const dayKey = new Date(item.timestamp).toDateString();
    if (!currentGroup || currentGroup.dayKey !== dayKey) {
      currentGroup = {
        dayKey,
        header: formatDateHeader(item.timestamp),
        items: []
      };
      timelineGroups.push(currentGroup);
    }
    currentGroup.items.push(item);
  });

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Activity Logs</span>
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff Single View</span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{staff.name}</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(staff.role)}`}>
                {staff.role}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaffDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold shadow-xs transition-all"
            title="Refresh Timeline Data"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Staff Hero Profile & Metrics Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left: User Identity Info */}
          <div className="lg:col-span-1 flex items-start gap-4 pr-6 lg:border-r lg:border-slate-100">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-amber-400 flex items-center justify-center font-black text-xl shadow-md border-2 border-slate-100">
                {staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST'}
              </div>
              {/* Online Indicator */}
              <span 
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                  staff.isOnlineNow ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                title={staff.isOnlineNow ? 'Online Now' : 'Offline'}
              >
                {staff.isOnlineNow && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 truncate">{staff.name}</h2>
                {staff.isOnlineNow ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online Now
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{staff.email}</p>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {staff.phone || 'No phone'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {staff.country || 'India'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Key Performance & Portal Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Portal Time</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-600">{stats.totalTimeFormatted || '0m'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Across all sessions</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sessions</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-900">{stats.totalSessions || 0}</span>
                <span className="text-[11px] text-slate-400 font-semibold">logins</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Portal access count</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Session Time</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-indigo-600">{stats.avgSessionFormatted || '0m'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Per portal visit</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Active</span>
              <div className="mt-1">
                <span className="text-xs font-black text-slate-800 block truncate">
                  {stats.lastLogin ? formatTimeOnly(stats.lastLogin) : 'Never'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                  {stats.lastLogin ? getRelativeTime(stats.lastLogin) : 'No activity yet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Options Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 mr-2">Filter:</span>
          {[
            { id: 'All', label: 'All Activities' },
            { id: 'Auth', label: 'Logins & Logouts' },
            { id: 'Application', label: 'Application Operations' },
            { id: 'Other', label: 'Other Activities' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-bold text-slate-400">Timeframe:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="All">All Time</option>
            <option value="today">Today Only</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Chronological Activity Timeline Container */}
      <div className="space-y-8">
        {timelineGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Activity Events Recorded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no matching activity events for this staff member under the selected filter criteria.
            </p>
          </div>
        ) : (
          timelineGroups.map((group, groupIdx) => (
            <div key={group.dayKey || groupIdx} className="space-y-4">
              {/* Day Header Badge */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-extrabold tracking-wide shadow-xs flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{group.header}</span>
                </div>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Day Timeline Events List */}
              <div className="relative pl-6 sm:pl-8 ml-3 sm:ml-4 border-l-2 border-slate-200 space-y-6">
                {group.items.map((event) => {
                  const isLogin = event.action === 'LOGIN';
                  const isLogout = event.action === 'LOGOUT';
                  const isActiveNow = event.isActiveSession;

                  return (
                    <div key={event.id} className="relative group">
                      {/* Timeline Node Icon on the vertical line */}
                      <div className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-xs transition-all ${
                        isLogin
                          ? 'bg-emerald-500 border-white text-white'
                          : isLogout
                          ? 'bg-rose-500 border-white text-white'
                          : event.category === 'Application'
                          ? 'bg-blue-600 border-white text-white'
                          : 'bg-amber-500 border-white text-white'
                      }`}>
                        {isLogin ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                        ) : isLogout ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        ) : event.category === 'Application' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </div>

                      {/* Event Detail Card */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{event.title}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isLogin
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isLogout
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {event.action}
                            </span>
                            {isActiveNow && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                                Session In Progress
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <span className="font-mono text-slate-700 font-bold">{formatTimeOnly(event.timestamp)}</span>
                            <span>•</span>
                            <span>{getRelativeTime(event.timestamp)}</span>
                          </div>
                        </div>

                        {/* Event Content & Details */}
                        <div className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                          <p>{event.details || 'Operational action performed inside admin portal.'}</p>
                          
                          {/* Duration Tag if Logout */}
                          {isLogout && event.duration && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-bold border border-amber-200">
                              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Total Session Time Spent: {event.duration}</span>
                            </div>
                          )}

                          {/* Device & Technical Metadata */}
                          <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 text-[10px] font-medium text-slate-400 border-t border-slate-50">
                            {event.device && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {event.device}
                              </span>
                            )}
                            {event.ipAddress && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                IP: {event.ipAddress}
                              </span>
                            )}
                            {event.category && (
                              <span className="text-slate-400 font-semibold">
                                Category: {event.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
