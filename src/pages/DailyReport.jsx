import React, { useState } from 'react';

export default function DailyReport({ applications }) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const totalAppsToday = applications ? applications.length + 40 : 42;
  const activeLeads = 318;
  const successRate = "94.2%";
  const pendingVerification = 18;

  const timelineData = [
    { day: 'Wed', count: 12 },
    { day: 'Thu', count: 19 },
    { day: 'Fri', count: 15 },
    { day: 'Sat', count: 8 },
    { day: 'Sun', count: 10 },
    { day: 'Mon', count: 28 },
    { day: 'Tue', count: 35 },
  ];

  const universityData = [
    { name: 'University of Surrey', count: 28, pct: 85, color: 'from-indigo-500 to-cyan-400' },
    { name: 'Coventry University', count: 22, pct: 70, color: 'from-blue-500 to-indigo-500' },
    { name: 'Anglia Ruskin University', count: 17, pct: 55, color: 'from-cyan-500 to-blue-400' },
    { name: 'Calicut University', count: 12, pct: 40, color: 'from-teal-400 to-cyan-500' },
  ];

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

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Operations Report</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time performance analytics and application statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-[#10B981] rounded-full animate-ping"></span>
          <span className="text-[10px] text-[#10B981] font-extrabold uppercase tracking-wider">Live System Sync</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-5 shadow-xs flex flex-col justify-between group transition-all duration-150">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Applications Filed</span>
            <span className="text-[#D99A1C] bg-[#D99A1C]/10 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D99A1C]/25">+12.4%</span>
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
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between group transition-all duration-150">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Active Leads</span>
            <span className="text-blue-600 bg-blue-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">+8.1%</span>
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
        <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-150">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Success Rate</span>
            <span className="text-amber-600 bg-amber-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">CAS Clear</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{successRate}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Visa Issued</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-[#D99A1C] h-full w-[94.2%]" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-[#EF4444]/20 border-t-4 border-t-[#EF4444] rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-150 bg-red-50/5">
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
            <button className="text-[9px] font-extrabold bg-[#EF4444] hover:bg-red-650 text-white px-2 py-1 rounded shadow-xs uppercase">Review</button>
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
                  <circle
                    key={p.day}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint === p.index ? 5.5 : 4}
                    fill={hoveredPoint === p.index ? '#06B6D4' : '#6366F1'}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint(p.index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>

              {hoveredPoint !== null && (
                <div 
                  className="absolute bg-slate-900 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
                  style={{
                    left: `${(points[hoveredPoint].x / width) * 100}%`,
                    top: `${(points[hoveredPoint].y / height) * 100 - 15}%`,
                  }}
                >
                  {points[hoveredPoint].count} Apps
                </div>
              )}
            </div>

            <div className="flex justify-between px-6 pt-2 text-[10px] font-extrabold text-slate-400">
              {timelineData.map(d => (
                <span key={d.day}>{d.day}</span>
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
                  className="space-y-1 cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(index)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span className="truncate">{univ.name}</span>
                    <span className="text-indigo-600">{univ.count} files ({univ.pct}%)</span>
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
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
    </div>
  );
}
