import RowActions, { rowViewProps } from '../components/RowActions';
import ListRecordView from '../components/ListRecordView';
import ListFilterTabs from '../components/ListFilterTabs';
import ListToolbar, { ListPager } from '../components/ListToolbar';
import useServerList from '../hooks/useServerList';
import { ActionButton } from '../components/ActionControls';
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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const activityList = useServerList('/lists/query', {
    search, page, limit, onPageChange: setPage, filters: { activityGroup: categoryFilter, timeframe: dateFilter },
    localRecords: data?.timeline || [], resource: 'staff-activity-timeline', enabled: Boolean(data?.staff)
  });
  useEffect(() => { setPage(1); }, [search, categoryFilter, dateFilter, staffId]);


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
      <div className="workspace-panel p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 mt-12 shadow-sm">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          !
        </div>
        <h3 className="text-base font-bold text-slate-800">Staff Records Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          No activity logs could be found for this staff member identifier.
        </p>
        <ActionButton
          onClick={onBack}
          className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Activity Logs
        </ActionButton>
      </div>
    );
  }

  if (selectedEvent) return <div className="workspace-page p-4 sm:p-6"><ListRecordView record={{name:selectedEvent.title,description:selectedEvent.details,createdAt:selectedEvent.timestamp,status:selectedEvent.action}} title="Activity details" onBack={()=>setSelectedEvent(null)}><div className="rounded-xl border border-slate-200 bg-white p-5"><dl className="grid gap-4 sm:grid-cols-2">{['category','device','ipAddress','duration'].filter(key=>selectedEvent[key]).map(key=><div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="text-sm text-slate-800">{String(selectedEvent[key])}</dd></div>)}</dl>{selectedEvent.isActiveSession && <p className="mt-4 text-sm text-emerald-700">Session in progress</p>}</div></ListRecordView></div>;
  const { staff, stats = {}, sessions = [] } = data;

  // Helper for formatting minutes
  const formatMinutes = (mins) => {
    if (!mins || mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Activity category classification helpers
  const isApplicationActivity = (item) => {
    const cat = (item.category || '').toLowerCase().trim();
    const act = (item.action || '').toUpperCase().trim();
    if (['application', 'applications', 'student', 'students'].includes(cat)) return true;
    return (
      act.startsWith('APPLICATION_') ||
      act.startsWith('DOCUMENT_') ||
      act.startsWith('STATUS_') ||
      act.startsWith('STAGE_') ||
      act.startsWith('STUDENT_') ||
      act.startsWith('ONBOARD_STUDENT') ||
      act.startsWith('PICK_')
    );
  };


  // Dynamic metrics calculation based on selected timeframe
  let displayTotalTime = stats.totalTimeFormatted || '0m';
  let displayTotalSessions = stats.totalSessions || 0;
  let displayAvgSessionTime = stats.avgSessionFormatted || '0m';
  let metricSubtitle = 'Across all sessions';

  if (dateFilter !== 'All') {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let rangeStart = null;
    let rangeEnd = new Date(now);

    if (dateFilter === 'today') {
      rangeStart = startOfToday;
      metricSubtitle = 'Today';
    } else if (dateFilter === 'yesterday') {
      rangeStart = new Date(startOfToday);
      rangeStart.setDate(rangeStart.getDate() - 1);
      rangeEnd = startOfToday;
      metricSubtitle = 'Yesterday';
    } else if (dateFilter === 'week') {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 7);
      rangeStart.setHours(0, 0, 0, 0);
      metricSubtitle = 'In past 7 days';
    } else if (dateFilter === '15days') {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 15);
      rangeStart.setHours(0, 0, 0, 0);
      metricSubtitle = 'In past 15 days';
    } else if (dateFilter === 'month') {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 30);
      rangeStart.setHours(0, 0, 0, 0);
      metricSubtitle = 'In past 30 days';
    }

    if (rangeStart) {
      const rStart = rangeStart.getTime();
      const rEnd = rangeEnd.getTime();
      let periodMins = 0;
      let sessionCount = 0;

      sessions.forEach(sess => {
        const sStart = new Date(sess.loginTime).getTime();
        const sEnd = sess.isActive
          ? now
          : (sess.logoutTime ? new Date(sess.logoutTime).getTime() : sStart + ((sess.durationMinutes || 0) * 60000));

        if (sEnd >= rStart && sStart <= rEnd) {
          sessionCount++;
          const overlapStart = Math.max(sStart, rStart);
          const overlapEnd = Math.min(sEnd, rEnd);
          if (overlapEnd > overlapStart) {
            periodMins += Math.max(1, Math.round((overlapEnd - overlapStart) / 60000));
          }
        }
      });

      displayTotalSessions = sessionCount;
      displayTotalTime = formatMinutes(periodMins);
      const avgMins = sessionCount > 0 ? Math.round(periodMins / sessionCount) : 0;
      displayAvgSessionTime = formatMinutes(avgMins);
    }
  }

  const filteredTimeline = activityList.data;

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
    <div className="workspace-page flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <ActionButton
            onClick={onBack}
            className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Activity Logs</span>
          </ActionButton>
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
          <ActionButton
            onClick={fetchStaffDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold shadow-xs transition-all"
            title="Refresh Timeline Data"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </ActionButton>
        </div>
      </div>

      {/* Staff Hero Profile & Metrics Card */}
      <div className="workspace-panel bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
                  {staff.country || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Key Performance & Portal Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Portal Time</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-600">{displayTotalTime}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{metricSubtitle}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sessions</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-900">{displayTotalSessions}</span>
                <span className="text-[11px] text-slate-400 font-semibold">logins</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{metricSubtitle}</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Session Time</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-indigo-600">{displayAvgSessionTime}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{metricSubtitle}</span>
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

      <div className="workspace-panel rounded-xl border border-slate-200 bg-white overflow-hidden">
        <ListToolbar search={search} onSearchChange={setSearch} label="activity" loading={activityList.loading} error={activityList.error} onRetry={activityList.reload} onReset={() => { setSearch(''); setCategoryFilter('All'); setDateFilter('All'); setPage(1); }} filters={[
          { key: 'activityGroup', label: 'Activity Types', value: categoryFilter, onChange: setCategoryFilter, options: [{ value: 'Auth', label: 'Logins & Logouts' }, { value: 'Application', label: 'Application Operations' }, { value: 'Other', label: 'Other Activities' }] },
          { key: 'timeframe', label: 'Timeframes', value: dateFilter, onChange: setDateFilter, options: [{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: 'week', label: 'Past 7 Days' }, { value: '15days', label: 'Past 15 Days' }, { value: 'month', label: 'Past 30 Days' }] }
        ]} />
        <h2 className="px-4 py-3 text-sm font-bold text-slate-900">Activity Timeline</h2>
      </div>

      <ListFilterTabs value={categoryFilter} onChange={setCategoryFilter} query={{endpoint:'/lists/query',localRecords:data?.timeline || [],resource:'staff-activity-timeline',search,filters:{timeframe:dateFilter}}} options={[{value:'All',label:'All activities',filters:{activityGroup:'All'}},{value:'Auth',label:'Logins & logouts',filters:{activityGroup:'Auth'}},{value:'Application',label:'Application operations',filters:{activityGroup:'Application'}},{value:'Other',label:'Other activities',filters:{activityGroup:'Other'}}]} />
      <div className="workspace-list-frame overflow-x-auto"><table className="workspace-table w-full text-left"><thead><tr><th>Activity</th><th>Type</th><th>Date & time</th><th>Details</th><th className="text-right">Actions</th></tr></thead><tbody>{activityList.data.map(event=><tr key={event.id || event._id} {...rowViewProps(()=>setSelectedEvent(event))} className="cursor-pointer hover:bg-slate-50"><td className="font-semibold">{event.title}</td><td>{event.action}{event.isActiveSession && <span className="block text-xs text-emerald-700">Session in progress</span>}</td><td className="whitespace-nowrap">{formatDateHeader(event.timestamp)}<span className="block text-xs text-slate-500">{formatTimeOnly(event.timestamp)}</span></td><td><p className="max-w-md truncate">{event.details || 'Operational action performed inside admin portal.'}</p></td><td className="text-right"><RowActions><ActionButton className="rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50" onClick={()=>setSelectedEvent(event)}>View activity</ActionButton></RowActions></td></tr>)}{!activityList.loading && !activityList.data.length && <tr><td colSpan="5" className="text-center text-slate-500">No activity matches the selected filters.</td></tr>}</tbody></table></div>
      <ListPager list={activityList} page={page} onPageChange={setPage} limit={limit} onLimitChange={setLimit} />
    </div>
  );
}
