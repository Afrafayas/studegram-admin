import React, { useState, useMemo } from 'react';

export default function AdminReport({ 
  applications = [], 
  activeSubTab = null,
  referralAgents = [],
  universities = []
}) {
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedUniversity, setSelectedUniversity] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');

  const allReportApps = useMemo(() => {
    return (applications || []).map((app, idx) => {
      // 1. Agent channel extraction
      let agentName = 'Direct';
      if (app.partner && typeof app.partner === 'object') {
        agentName = app.partner.companyName || app.partner.name || app.partnerCompanyName || app.partnerName || app.assignedBdm || 'Direct';
      } else if (app.partnerCompanyName && app.partnerCompanyName !== 'Direct') {
        agentName = app.partnerCompanyName;
      } else if (app.partnerName && app.partnerName !== 'Direct') {
        agentName = app.partnerName;
      } else if (typeof app.partner === 'string' && app.partner.trim() && app.partner !== 'Direct' && app.partner !== 'null' && app.partner !== 'undefined') {
        const matchedAgent = (referralAgents || []).find(ag => ag._id === app.partner || ag.id === app.partner);
        if (matchedAgent) {
          agentName = matchedAgent.companyName || matchedAgent.name || app.partner;
        } else {
          agentName = app.partner;
        }
      } else if (app.assignedBdm && app.assignedBdm !== 'Direct') {
        agentName = app.assignedBdm;
      }

      // 2. University destination extraction
      let univName = 'N/A';
      if (app.universityName && app.universityName !== 'N/A') {
        univName = app.universityName;
      } else if (app.university && typeof app.university === 'object') {
        univName = app.university.name || app.university.title || 'N/A';
      } else if (typeof app.university === 'string' && app.university.trim()) {
        const matchedUniv = (universities || []).find(u => u._id === app.university || u.id === app.university);
        if (matchedUniv) {
          univName = matchedUniv.name || matchedUniv.universityName || app.university;
        } else {
          univName = app.university;
        }
      }

      // 3. Country extraction
      let countryName = app.country;
      if (!countryName || countryName === 'N/A') {
        if (app.university && typeof app.university === 'object' && app.university.country) {
          countryName = app.university.country;
        } else {
          const matchedUniv = (universities || []).find(u => 
            (u.name && u.name.toLowerCase() === univName.toLowerCase()) || 
            u._id === app.university || 
            u.id === app.university
          );
          if (matchedUniv?.country) {
            countryName = matchedUniv.country;
          } else {
            countryName = 'United Kingdom';
          }
        }
      }

      return {
        camsId: app.camsId || app._id || `CAMS${10000 + idx}`,
        name: app.studentName || `${app.firstName || ''} ${app.lastName || ''}`.trim() || 'N/A',
        agent: agentName,
        university: univName,
        course: app.courseName || (app.course && typeof app.course === 'object' ? (app.course.title || app.course.name) : app.course) || 'N/A',
        country: countryName,
        intake: app.intake || 'N/A',
        status: app.secondaryStatus || app.status || 'Pending'
      };
    });
  }, [applications, referralAgents, universities]);

  // Dynamically extract real available agents from DB master records and live applications
  const availableAgents = useMemo(() => {
    const set = new Set();
    (referralAgents || []).forEach(ag => {
      const company = (ag.companyName || '').trim();
      const name = (ag.name || '').trim();
      if (company) set.add(company);
      if (name) set.add(name);
    });
    allReportApps.forEach(app => {
      const ag = (app.agent || '').trim();
      if (ag && ag !== 'N/A' && ag !== 'Direct') {
        set.add(ag);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [referralAgents, allReportApps]);

  // Dynamically extract real universities from DB master records and live applications
  const availableUniversities = useMemo(() => {
    const set = new Set();
    (universities || []).forEach(u => {
      const name = typeof u === 'string' ? u.trim() : (u.name || u.universityName || u.title || '').trim();
      if (name) set.add(name);
    });
    allReportApps.forEach(app => {
      const u = (app.university || '').trim();
      if (u && u !== 'N/A') {
        set.add(u);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [universities, allReportApps]);

  // Dynamically extract real countries from applications, universities, and agents
  const availableCountries = useMemo(() => {
    const set = new Set();
    allReportApps.forEach(app => {
      const c = (app.country || '').trim();
      if (c && c !== 'N/A') set.add(c);
    });
    (universities || []).forEach(u => {
      if (u.country && u.country.trim()) set.add(u.country.trim());
    });
    (referralAgents || []).forEach(ag => {
      if (ag.country && ag.country.trim()) set.add(ag.country.trim());
    });
    ['United Kingdom', 'Canada', 'Australia', 'India'].forEach(c => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allReportApps, universities, referralAgents]);

  const filteredApps = allReportApps.filter(app => {
    let agentMatch = true;
    if (selectedAgent !== 'All') {
      if (selectedAgent === 'Direct') {
        agentMatch = (app.agent || '').toLowerCase() === 'direct';
      } else {
        agentMatch = (app.agent || '').toLowerCase().includes(selectedAgent.toLowerCase());
      }
    }
    const univMatch = selectedUniversity === 'All' || (app.university || '').toLowerCase().includes(selectedUniversity.toLowerCase());
    const countryMatch = selectedCountry === 'All' || (app.country || '').toLowerCase().includes(selectedCountry.toLowerCase());
    return agentMatch && univMatch && countryMatch;
  });

  const handleExport = () => {
    try {
      const headers = ['CAMS ID', 'Student Name', 'Agent Channel', 'University', 'Course', 'Intake', 'Country', 'Status'];
      const rows = filteredApps.map(app => [
        `"${(app.camsId || '').replace(/"/g, '""')}"`,
        `"${(app.name || '').replace(/"/g, '""')}"`,
        `"${(app.agent || '').replace(/"/g, '""')}"`,
        `"${(app.university || '').replace(/"/g, '""')}"`,
        `"${(app.course || '').replace(/"/g, '""')}"`,
        `"${(app.intake || '').replace(/"/g, '""')}"`,
        `"${(app.country || '').replace(/"/g, '""')}"`,
        `"${(app.status || '').replace(/"/g, '""')}"`
      ].join(','));
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `admin_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export error:', e);
      alert("Exporting report as CSV database download...");
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin-Report Generator</h1>
            {activeSubTab === 'report-agent' && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-[#D99A1C]/15 text-[#D99A1C] rounded-lg border border-[#D99A1C]/30 uppercase tracking-wider">
                By Agent
              </span>
            )}
            {activeSubTab === 'report-university' && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-[#2563EB]/15 text-[#2563EB] rounded-lg border border-[#2563EB]/30 uppercase tracking-wider">
                By University
              </span>
            )}
            {activeSubTab === 'report-country' && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 uppercase tracking-wider">
                By Country
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Query B2B referrals and filter details by university, country, and agent channel.</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Query Filters */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#2563EB] rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`space-y-1.5 p-2 rounded-xl transition-all ${activeSubTab === 'report-agent' ? 'bg-[#D99A1C]/5 ring-1 ring-[#D99A1C]/30' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Referral Agent</label>
            {activeSubTab === 'report-agent' && (
              <span className="text-[9px] font-extrabold text-[#D99A1C] bg-[#D99A1C]/10 px-1.5 py-0.5 rounded">Active Subtab</span>
            )}
          </div>
          <select 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
          >
            <option value="All">All Agents ({availableAgents.length + 1})</option>
            <option value="Direct">Direct Applicant</option>
            {availableAgents.map(ag => (
              <option key={ag} value={ag}>{ag}</option>
            ))}
          </select>
        </div>

        <div className={`space-y-1.5 p-2 rounded-xl transition-all ${activeSubTab === 'report-university' ? 'bg-[#2563EB]/5 ring-1 ring-[#2563EB]/30' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">University Destination</label>
            {activeSubTab === 'report-university' && (
              <span className="text-[9px] font-extrabold text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded">Active Subtab</span>
            )}
          </div>
          <select 
            value={selectedUniversity} 
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
          >
            <option value="All">All Universities ({availableUniversities.length})</option>
            {availableUniversities.map(univ => (
              <option key={univ} value={univ}>{univ}</option>
            ))}
          </select>
        </div>

        <div className={`space-y-1.5 p-2 rounded-xl transition-all ${activeSubTab === 'report-country' ? 'bg-emerald-50/50 ring-1 ring-emerald-200' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Country</label>
            {activeSubTab === 'report-country' && (
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Active Subtab</span>
            )}
          </div>
          <select 
            value={selectedCountry} 
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#D99A1C] focus:border-[#D99A1C]"
          >
            <option value="All">All Countries ({availableCountries.length})</option>
            {availableCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Query Results Table */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Query Results ({filteredApps.length} entries)</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400">Filters: Agent={selectedAgent}, Univ={selectedUniversity}, Country={selectedCountry}</span>
            {(selectedAgent !== 'All' || selectedUniversity !== 'All' || selectedCountry !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAgent('All');
                  setSelectedUniversity('All');
                  setSelectedCountry('All');
                }}
                className="text-[10px] font-extrabold text-[#D99A1C] hover:underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
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
                    <td className="px-6 py-4 font-bold text-[#2563EB]">{app.camsId}</td>
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
