import ListFilterTabs from '../components/ListFilterTabs';
import useServerList from '../hooks/useServerList';
import ListToolbar, { ListPager } from '../components/ListToolbar';
import ActionMenu from '../components/ActionMenu';
import SearchableSelect from '../components/SearchableSelect';
import { ActionButton } from '../components/ActionControls';
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

  // Navigation / Single View State (persists across page refresh)
  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('staffId') || localStorage.getItem('studegram_admin_selected_staff_id') || null;
  });
  const [activeSubView, setActiveSubView] = useState(() => {
    return localStorage.getItem('studegram_admin_staff_logs_subview') || 'summary';
  });

  useEffect(() => {
    localStorage.setItem('studegram_admin_staff_logs_subview', activeSubView);
  }, [activeSubView]);

  useEffect(() => {
    if (selectedStaffId) {
      localStorage.setItem('studegram_admin_selected_staff_id', String(selectedStaffId));
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('staffId') !== String(selectedStaffId)) {
          url.searchParams.set('staffId', String(selectedStaffId));
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    } else {
      localStorage.removeItem('studegram_admin_selected_staff_id');
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('staffId')) {
          url.searchParams.delete('staffId');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (e) {}
    }
  }, [selectedStaffId]);

  useEffect(() => {
    const handleClearStaffSingleView = () => {
      setSelectedStaffId(null);
      localStorage.removeItem('studegram_admin_selected_staff_id');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('staffId');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}
    };

    window.addEventListener('clear_single_view_staff', handleClearStaffSingleView);
    return () => {
      window.removeEventListener('clear_single_view_staff', handleClearStaffSingleView);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlStaffId = params.get('staffId');
      if (!urlStaffId) {
        setSelectedStaffId(null);
      } else if (urlStaffId !== selectedStaffId) {
        setSelectedStaffId(urlStaffId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedStaffId]);

  // Data States
  const [staffSummary, setStaffSummary] = useState([]);
  const [backgroundLogs, setSessionLogs] = useState([]);
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

  const isSummaryView = activeSubView === 'summary';
  const serverList = useServerList(isSummaryView ? '/activity-logs/staff-summary' : '/activity-logs', { search: searchTerm, filters: { role: roleFilter, status: isSummaryView ? statusFilter : statusFilter === 'Online' ? 'Active' : statusFilter === 'Offline' ? 'Completed' : 'All' }, params: { timeframe }, page: currentPage, limit: itemsPerPage, onPageChange: setCurrentPage, enabled: !selectedStaffId, reloadKey: JSON.stringify(staffSummary) });
  const sessionLogs = isSummaryView ? [] : serverList.data;
  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter, statusFilter, timeframe, activeSubView]);
  const getTimeframeLabel = (tf) => {
    switch (tf) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'Past 7 Days';
      case '15days': return 'Past 15 Days';
      case 'month': return 'Past 30 Days';
      default: return 'Today';
    }
  };

  const fetchOverviewData = async () => {
    setIsRefreshing(true);
    try {
      // Parallel requests for stats, staff summary, and session logs
      const [statsRes, summaryRes, logsRes] = await Promise.all([
        API.get('/activity-logs/stats').catch(e => ({ error: e })),
        API.get('/activity-logs/staff-summary', {
          params: {
            timeframe: timeframe !== 'All' ? timeframe : undefined
          }
        }).catch(e => ({ error: e })),
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
      console.error('Error fetching staff activity data:', err);
      toast.showToast('Failed to sync staff activity data', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [timeframe]);

  // Periodic background refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOverviewData();
    }, 30000);
    return () => clearInterval(timer);
  }, [timeframe]);

  // Filtered staff summary list
  const filteredStaffSummary = isSummaryView ? serverList.data : [];

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
    <div className="workspace-page flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
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
          <ActionButton
            onClick={fetchOverviewData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Logs'}</span>
          </ActionButton>
        </div>
      </div>

      {/* Scoping Tabs */}
      <ListFilterTabs value={activeSubView==='sessions'?'Sessions':statusFilter} onChange={value=>{setActiveSubView(value==='Sessions'?'sessions':'summary');setStatusFilter(value==='Sessions'?'All':value);setCurrentPage(1);}} query={{endpoint:'/activity-logs/staff-summary',search:searchTerm,filters:{role:roleFilter},params:{timeframe},reloadKey:JSON.stringify(staffSummary)}} options={[{value:'All',label:'All monitored staff',filters:{status:'All'}},{value:'Online',label:'Online',filters:{status:'Online'}},{value:'Offline',label:'Offline',filters:{status:'Offline'}},{value:'Sessions',label:'Session logs',endpoint:'/activity-logs',filters:{status:'All'}}]} />

      {/* Main Content Area based on Active SubView */}
      {activeSubView === 'summary' ? (
        /* ================= SUBVIEW 1: STAFF SUMMARY LIST ================= */
        <div className="workspace-list-frame bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
<ListToolbar search={searchTerm} onSearchChange={setSearchTerm} filters={[{key:'role',label:'roles',value:roleFilter,onChange:setRoleFilter,options:serverList.facets.role || availableRoles},{key:'status',label:'online status',value:statusFilter,onChange:setStatusFilter,options:['Online','Offline']},{key:'timeframe',label:'timeframes',value:timeframe,onChange:setTimeframe,options:[{value:'today',label:'Today'},{value:'yesterday',label:'Yesterday'},{value:'week',label:'Past 7 days'},{value:'15days',label:'Past 15 days'},{value:'month',label:'Past 30 days'}]}]} onReset={() => { setSearchTerm(''); setRoleFilter('All'); setStatusFilter('All'); setTimeframe('All'); }} loading={serverList.loading} error={serverList.error} onRetry={serverList.reload} />
          <div className="overflow-x-auto">
            <table className="workspace-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Country</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Last Login Time</th>
                  <th className="py-3 px-4">Last Logout Time</th>
                  <th className="py-3 px-4">
                    {timeframe === 'All' || timeframe === 'today'
                      ? 'Time Spent (Today)'
                      : `Time Spent (${getTimeframeLabel(timeframe)})`}
                  </th>
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
                    <tr tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") { event.preventDefault(); event.currentTarget.click(); } }}
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
                            {staff.country || ''}
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

                      {/* Time Spent in Timeframe */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${
                            (timeframe === 'All' || timeframe === 'today' ? (staff.todayMinutes > 0) : ((staff.periodMinutes || 0) > 0 || (staff.todayMinutes || 0) > 0))
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}>
                            {timeframe === 'All' || timeframe === 'today'
                              ? (staff.todayTimeFormatted || '0m')
                              : (staff.periodTimeFormatted || staff.todayTimeFormatted || '0m')}
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

                      {/* ActionMenu */}
                      <td className="py-3.5 px-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Activity Timeline',
                              onClick: () => setSelectedStaffId(staff.userId || staff.email)
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
<ListPager list={serverList} page={currentPage} onPageChange={setCurrentPage} limit={itemsPerPage} onLimitChange={setItemsPerPage} />
        </div>
      ) : (
        /* ================= SUBVIEW 2: GRANULAR SESSION LOGS ================= */
        <div className="workspace-list-frame bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
<ListToolbar search={searchTerm} onSearchChange={setSearchTerm} filters={[{key:'role',label:'roles',value:roleFilter,onChange:setRoleFilter,options:serverList.facets.role || availableRoles},{key:'status',label:'online status',value:statusFilter,onChange:setStatusFilter,options:['Online','Offline']},{key:'timeframe',label:'timeframes',value:timeframe,onChange:setTimeframe,options:[{value:'today',label:'Today'},{value:'yesterday',label:'Yesterday'},{value:'week',label:'Past 7 days'},{value:'15days',label:'Past 15 days'},{value:'month',label:'Past 30 days'}]}]} onReset={() => { setSearchTerm(''); setRoleFilter('All'); setStatusFilter('All'); setTimeframe('All'); }} loading={serverList.loading} error={serverList.error} onRetry={serverList.reload} />
          <div className="overflow-x-auto">
            <table className="workspace-table w-full text-left border-collapse">
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
                    <tr tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") { event.preventDefault(); event.currentTarget.click(); } }}
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
                          <span className="text-[10px] text-slate-400 block font-mono">IP: {sess.ipAddress || 'Not recorded'}</span>
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

                      {/* ActionMenu */}
                      <td className="py-3.5 px-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Staff Timeline',
                              onClick: () => setSelectedStaffId(sess.user?._id || sess.user || sess.userEmail)
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

<ListPager list={serverList} page={currentPage} onPageChange={setCurrentPage} limit={itemsPerPage} onLimitChange={setItemsPerPage} />
        </div>
      )}
    </div>
  );
}
