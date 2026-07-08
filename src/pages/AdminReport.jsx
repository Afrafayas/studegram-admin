import React, { useState } from 'react';

export default function AdminReport({ applications }) {
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedUniversity, setSelectedUniversity] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');

  const reportDatabase = [
    { camsId: 'CAMS10204', name: 'Shanto Shaju', agent: 'Salman', university: 'University of Surrey', course: 'MSc International Hotel Management', intake: 'September 2026', status: 'Offer Issued' },
    { camsId: 'CAMS10492', name: 'Aneesha Anil', agent: 'Aisha', university: 'University of Surrey', course: 'MSc Human Resources Management', intake: 'January 2027', status: 'Pending' },
    { camsId: 'CAMS93810', name: 'Rahul Krishnan', agent: 'Salman', university: 'Coventry University', course: 'MSc Computer Science', intake: 'September 2026', status: 'Processed' },
    { camsId: 'CAMS30492', name: 'Sherin Susan', agent: 'Aisha', university: 'Anglia Ruskin University', course: 'BCOM', intake: 'January 2027', status: 'Document Verification' },
    { camsId: 'CAMS82739', name: 'Basil George', agent: 'None (Direct)', university: 'Calicut University', course: 'BCOM', intake: 'June 2026', status: 'Visa Pending' },
    { camsId: 'CAMS10928', name: 'Nandana Roy', agent: 'Salman', university: 'Coventry University', course: 'MSc Human Resources Management', intake: 'September 2026', status: 'Offer Issued' },
  ];

  const allReportApps = [
    ...reportDatabase,
    ...(applications || []).map((app, idx) => ({
      camsId: app.camsId || `CAMS${10000 + idx}`,
      name: app.studentName || `${app.firstName} ${app.lastName}`,
      agent: 'Salman',
      university: app.universityName || app.university,
      course: app.courseName || 'MSc Computer Science',
      intake: app.intake,
      status: app.secondaryStatus || 'Pending'
    }))
  ];

  const filteredApps = allReportApps.filter(app => {
    const agentMatch = selectedAgent === 'All' || app.agent.toLowerCase().includes(selectedAgent.toLowerCase());
    const univMatch = selectedUniversity === 'All' || app.university.toLowerCase().includes(selectedUniversity.toLowerCase());
    const courseMatch = selectedCourse === 'All' || app.course.toLowerCase().includes(selectedCourse.toLowerCase());
    return agentMatch && univMatch && courseMatch;
  });

  const handleExport = () => {
    alert("Exporting report as CSV database download...");
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin-Report Generator</h1>
          <p className="text-xs text-slate-500 font-medium">Query B2B referrals and filter details by university, course, and agent channel.</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Query Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Referral Agent</label>
          <select 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Agents</option>
            <option value="Salman">Salman</option>
            <option value="Aisha">Aisha</option>
            <option value="Direct">Direct Applicant</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">University Destination</label>
          <select 
            value={selectedUniversity} 
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Universities</option>
            <option value="Surrey">University of Surrey</option>
            <option value="Coventry">Coventry University</option>
            <option value="Anglia Ruskin">Anglia Ruskin University</option>
            <option value="Calicut">Calicut University</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Academic Program</label>
          <select 
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Courses</option>
            <option value="Hotel">MSc International Hotel Management</option>
            <option value="Resources">MSc Human Resources Management</option>
            <option value="Computer">MSc Computer Science</option>
            <option value="BCOM">BCOM</option>
          </select>
        </div>
      </div>

      {/* Query Results Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Query Results ({filteredApps.length} entries)</h2>
          <span className="text-[10px] font-bold text-slate-400">Filters: Agent={selectedAgent}, Univ={selectedUniversity}, Course={selectedCourse}</span>
        </div>
        <div className="overflow-x-auto">
          {filteredApps.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">CAMS ID</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Agent Channel</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Intake</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredApps.map((app) => (
                  <tr key={app.camsId} className="hover:bg-[#F8FAFC] transition-colors duration-100">
                    <td className="px-6 py-4 font-bold text-indigo-600">{app.camsId}</td>
                    <td className="px-6 py-4 text-slate-950 font-black">{app.name}</td>
                    <td className="px-6 py-4">{app.agent}</td>
                    <td className="px-6 py-4">{app.university}</td>
                    <td className="px-6 py-4 truncate max-w-[180px]">{app.course}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{app.intake}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        app.status === 'Offer Issued' || app.status === 'Processed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : app.status === 'Pending' || app.status === 'Visa Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xs font-black text-slate-900 uppercase">No Matches Found</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">Try loosening your query filter options to populate application records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
