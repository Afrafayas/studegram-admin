import { ActionButton } from '../components/ActionControls';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DailyReport({ applications,
  onNavigateToBecomePartner,
  onNavigateToCreateApplication,
  onNavigateToApplications,
  onOpenApplicationDetail }) {
  const { currentUser } = useAuth();
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Compute stats dynamically based on scoped applications to demonstrate RBAC scoping
  // Compute stats dynamically based on actual applications
  // Filtered lists for each card
  const todayApps = (applications || []).filter(app => new Date(app.createdAt || app.dateAdded).toDateString() === new Date().toDateString());
  const activeLeadsApps = (applications || []).filter(app => !/closed|enrolled|rejected|withdrawn/i.test(app.status || app.secondaryStatus || ''));
  const successfulApps = (applications || []).filter(app => {
    const s = String(app.status || app.secondaryStatus || '').trim().toLowerCase();
    return s.includes('enrolled') || s.includes('visa received') || s.includes('visa approved');
  });
  const pendingApps = (applications || []).filter(a => a.secondaryStatus === 'Pending' || a.secondaryStatus === 'Document Verification' || a.status === 'Submitted');

  // Counts
  const totalAppsToday = todayApps.length;
  const activeLeads = activeLeadsApps.length;
  const successfulApplications = successfulApps.length;
  const successRateValue = applications?.length ? Math.round((successfulApplications / applications.length) * 100) : 0;
  const successRate = `${successRateValue}%`;
  const pendingVerification = pendingApps.length;

  // Generic click handler for cards
  const handleCardClick = (filteredList, filterType) => {
    if (filteredList && filteredList.length === 1) {
      // Exactly 1 -> redirect to application detail page
      const singleApp = filteredList[0];
      const appId = singleApp.id || singleApp._id;
      if (onOpenApplicationDetail && appId) {
        onOpenApplicationDetail(appId);
        return;
      }
    }
    // 0 or > 1 -> redirect to applications list page with filter
    if (onNavigateToApplications) {
      onNavigateToApplications(filterType);
    }
  };

  const timelineData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateString = date.toDateString();
    const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const dayApps = (applications || []).filter(app => {
      const created = new Date(app.createdAt || app.dateAdded);
      return !Number.isNaN(created.getTime()) && created.toDateString() === dateString;
    });
    return {
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      dateString,
      formattedDate,
      count: dayApps.length,
      apps: dayApps,
    };
  });

  const handleTimelinePointClick = (point) => {
    if (onNavigateToApplications) {
      onNavigateToApplications({
        type: 'date',
        dateString: point.dateString,
        label: `${point.day}, ${point.formattedDate}`,
      });
    }
  };

  // Dynamic university breakdown
  const univMap = {};
  if (applications) {
    applications.forEach(a => {
      const uName = a.universityName || a.university?.name || (typeof a.university === 'string' && a.university ? a.university : 'N/A');
      if (!univMap[uName]) {
        univMap[uName] = { name: uName, apps: [], count: 0 };
      }
      univMap[uName].apps.push(a);
      univMap[uName].count += 1;
    });
  }

  const universityData = Object.values(univMap)
    .sort((a, b) => b.count - a.count)
    .map((item, idx) => ({
      ...item,
      pct: applications?.length > 0 ? Math.round((item.count / applications.length) * 100) : 0,
      color: idx % 2 === 0 ? 'from-indigo-500 to-cyan-400' : 'from-blue-500 to-indigo-500',
    }));

  const handleUniversityClick = (univ) => {
    if (onNavigateToApplications) {
      onNavigateToApplications({
        type: 'university',
        universityName: univ.name,
        label: univ.name === 'N/A' ? 'No University Assigned (N/A)' : univ.name,
      });
    }
  };

  const width = 500;
  const height = 150;
  const padding = 30;
  const points = timelineData.map((data, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (timelineData.length - 1);
    const maxVal = Math.max(...timelineData.map(d => d.count)) + 5;
    const y = height - padding - (data.count / maxVal) * (height - padding * 2);
    return { x, y, ...data, index: idx };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  if (currentUser?.role === 'Finance') {
    return (
      <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F8FAFC]">
        {/* Welcome Banner */}
        <div className="flex flex-wrap gap-3 justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Financial Operations Console</h1>
            <p className="text-xs text-slate-500 font-semibold">
              Logged in as <span className="text-emerald-600 font-extrabold">{currentUser?.role}</span> (Scope: {currentUser?.country}/{currentUser?.team})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wider">Financial Scoping</span>
          </div>
        </div>

        {/* Finance Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-indigo-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total volume tracked</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">₹86,500</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">INR</span>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-emerald-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Paid Commissions</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">₹2,775</span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase">Cleared</span>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-amber-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pending Payables</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">₹3,460</span>
              <span className="text-[9px] font-bold text-amber-500 uppercase">In Pipeline</span>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-rose-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Disputed/Under Review</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">₹2,640</span>
              <span className="text-[9px] font-bold text-rose-500 uppercase">Held</span>
            </div>
          </div>
        </div>

        {/* Finance Info Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm space-y-4">
          <span className="text-4xl">📊</span>
          <h2 className="text-sm font-black text-slate-900 uppercase">Financial Management Hub</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            As a member of the Finance Team, your dashboard displays only financial analytics and commission payouts. Use the sidebar to go to Commission Management to approve agent invoices and export financial CSV statements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F8FAFC]">
      {/* Welcome Banner */}
      <div className="workspace-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Welcome back, {currentUser?.name}!</h1>
          <p className="text-xs text-slate-500 font-semibold">
            Logged in as <span className="text-[#D99A1C] font-extrabold">{currentUser?.role}</span> (Scope: {currentUser?.country}/{currentUser?.team})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButton
            onClick={() => onNavigateToCreateApplication && onNavigateToCreateApplication()}
            className="bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:scale-[1.02] active:scale-95 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            title="Create New Application"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Application</span>
          </ActionButton>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
            <span className="h-2 w-2 bg-[#10B981] rounded-full animate-ping"></span>
            <span className="text-[10px] text-[#10B981] font-extrabold uppercase tracking-wider">Live System Sync</span>
          </div>
        </div>
      </div>

      {/* Dashboard Quick Action Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-1 overflow-x-auto">
        <ActionButton className="px-4 py-2 text-xs font-black text-[#D99A1C] border-b-2 border-[#D99A1C] bg-white shadow-xs rounded-t-xl cursor-pointer shrink-0">
          📊 System Overview
        </ActionButton>
        <ActionButton
          onClick={() => onNavigateToBecomePartner && onNavigateToBecomePartner()}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>🤝 Become our Partner</span>
          <span className="px-1.5 py-0.5 bg-[#D99A1C]/20 text-[#D99A1C] text-[9px] font-black rounded-md uppercase">Onboard</span>
        </ActionButton>
        <ActionButton
          onClick={() => onNavigateToCreateApplication && onNavigateToCreateApplication()}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#D99A1C] hover:bg-white rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer group shrink-0"
        >
          <span className="group-hover:text-[#D99A1C]">➕ New Application</span>
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-600 text-[9px] font-black rounded-md uppercase">Apply</span>
        </ActionButton>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div
          onClick={() => handleCardClick(todayApps, 'today')}
          className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-5 shadow-xs flex flex-col justify-between group transition-all duration-150 cursor-pointer hover:shadow-md"
          title="Click to view Applications Registry"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 group-hover:text-[#D99A1C] transition-colors">Applications Filed</span>
            {/* <span className="text-[#D99A1C] bg-[#D99A1C]/10 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D99A1C]/25">+12.4%</span> */}
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{totalAppsToday}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Today</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-[#D99A1C] h-full w-[70%]" />
          </div>
        </div>

        {/* Card 2 */}
        <div onClick={() => handleCardClick(activeLeadsApps, 'active')} className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between group transition-all duration-150 cursor-pointer hover:shadow-md">
          <div className="flex justify-between items-start  ">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Active Leads</span>
            {/* <span className="text-blue-600 bg-blue-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">+8.1%</span> */}
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{activeLeads}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Files</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-[#2563EB] h-full w-[85%]" />
          </div>
        </div>

        {/* Card 3 */}
        <div onClick={() => handleCardClick(successfulApps, 'success')} className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Success Rate</span>
            <span className="text-amber-600 bg-amber-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">Visa / Enrolled</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{successRate}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{successfulApplications} of {applications?.length || 0} applications</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div role="progressbar" aria-label="Visa approved or enrolled application rate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={successRateValue} className="bg-[#D99A1C] h-full transition-[width]" style={{ width: `${successRateValue}%` }} />
          </div>
        </div>

        {/* Card 4 */}
        <div onClick={() => handleCardClick(pendingApps, 'pending')} className="bg-white border border-[#EF4444]/20 border-t-4 border-t-[#EF4444] rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-150 bg-red-50/5 cursor-pointer hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Pending Review</span>
            <span className="text-amber-600 bg-amber-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">Immediate Action</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#EF4444] tracking-tight">{pendingVerification}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Files</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#EF4444]">Requires manual validation</span>
            <ActionButton className="text-[9px] font-extrabold bg-[#EF4444] hover:bg-red-650 text-white px-2 py-1 rounded shadow-xs uppercase">Review</ActionButton>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Application Filing Timeline</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Filing trend over the last 7 working days</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Weekly Trend</span>
            </div>

            <div className="relative pt-4 flex items-center justify-center">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0, 25, 50, 75, 100].map((yVal) => {
                  const y = padding + (yVal / 100) * (height - padding * 2);
                  return (
                    <line
                      key={yVal}
                      x1={padding}
                      y1={y}
                      x2={width - padding}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                <path d={areaPath} fill="url(#chartGradient)" />
                <path d={linePath} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />

                {points.map((p) => (
                  <g
                    key={p.dateString || p.day}
                    className="cursor-pointer"
                    onClick={() => handleTimelinePointClick(p)}
                    onMouseEnter={() => setHoveredPoint(p.index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Invisible larger hit area for easy clicking */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={14}
                      fill="transparent"
                    />
                    {/* Hover halo */}
                    {hoveredPoint === p.index && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={9}
                        fill="#06B6D4"
                        fillOpacity="0.3"
                      />
                    )}
                    {/* Visible point */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint === p.index ? 6 : 4}
                      fill={hoveredPoint === p.index ? '#06B6D4' : '#6366F1'}
                      stroke="white"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                  </g>
                ))}
              </svg>

              {hoveredPoint !== null && (
                <div
                  className="absolute bg-slate-900 text-white rounded-xl px-3 py-2 text-xs font-bold shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 z-30 select-none border border-slate-700 whitespace-nowrap"
                  style={{
                    left: `${(points[hoveredPoint].x / width) * 100}%`,
                    top: `${(points[hoveredPoint].y / height) * 100 - 10}%`,
                  }}
                >
                  <div className="text-[10px] text-slate-400 font-semibold">{points[hoveredPoint].day}, {points[hoveredPoint].formattedDate}</div>
                  <div className="text-white font-extrabold text-xs">
                    {points[hoveredPoint].count} Application{points[hoveredPoint].count === 1 ? '' : 's'} Filed
                  </div>
                  <div className="text-[9px] text-indigo-300 font-medium mt-0.5">Click to view filed list →</div>
                </div>
              )}
            </div>

            <div className="flex justify-between px-6 pt-2 text-[10px] font-extrabold text-slate-400">
              {timelineData.map((d, idx) => (
                <button
                  key={d.dateString || d.day}
                  type="button"
                  onClick={() => handleTimelinePointClick(d)}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className={`hover:text-indigo-600 transition-colors cursor-pointer px-1.5 py-0.5 rounded ${
                    hoveredPoint === idx ? 'text-indigo-600 font-black bg-indigo-50' : ''
                  }`}
                  title={`View applications filed on ${d.day}, ${d.formattedDate}`}
                >
                  {d.day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Top Performing Universities</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Ranked by volume of student submissions</p>
              </div>
              <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full">Universities</span>
            </div>

            <div className="space-y-4">
              {universityData.map((univ, index) => (
                <div
                  key={univ.name}
                  onClick={() => handleUniversityClick(univ)}
                  className="space-y-1.5 cursor-pointer p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-all group select-none"
                  title={`Click to view ${univ.count} application(s) for ${univ.name}`}
                  onMouseEnter={() => setHoveredBarIndex(index)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span className="truncate group-hover:text-indigo-600 transition-colors">{univ.name}</span>
                    <span className="text-indigo-600 font-extrabold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                      {univ.count} file{univ.count === 1 ? '' : 's'} ({univ.pct}%) →
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${univ.color} rounded-full transition-all duration-500`}
                      style={{ width: `${univ.pct}%`, opacity: hoveredBarIndex === index ? 1 : 0.85 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Logs */}
      {/*
      <div className="workspace-panel workspace-list-frame bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">System Operations Log</h3>
          <span className="text-[10px] text-slate-400 font-semibold">Latest 4 actions</span>
        </div>
        <div className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
          <div className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <p className="font-bold text-slate-950">New application file registered for Shanto Shaju</p>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>Assigned: Admin 1</span>
              <span>10 mins ago</span>
            </div>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <p className="font-bold text-slate-950">Referral Agent 'Salman' updated Course Documents</p>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>B2B Portal</span>
              <span>45 mins ago</span>
            </div>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <p className="font-bold text-slate-950">Visa verification pending for client Aneesha Anil</p>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>Assigned: Super Admin</span>
              <span>2 hours ago</span>
            </div>
          </div>
          <div className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <p className="font-bold text-slate-950">New agent account info@luzidcraft.com verified</p>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>System Approval</span>
              <span>4 hours ago</span>
            </div>
          </div>
        </div>
      </div>
      */}
    </div>
  );
}
