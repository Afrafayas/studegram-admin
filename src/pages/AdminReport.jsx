import RowActions, { rowViewProps } from '../components/RowActions';
import ListRecordView from '../components/ListRecordView';
import API from '../api/axios';
import useServerList from '../hooks/useServerList';
import ListToolbar, { ListPager } from '../components/ListToolbar';
import { getDisplayId } from '../utils/displayId';
import { ActionButton } from '../components/ActionControls';
import React, { useState, useMemo, useEffect } from 'react';

export default function AdminReport({ 
  applications = [], 
  activeSubTab = null,
  referralAgents = [],
  universities = [],
  onOpenApplication
}) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [listStatus, setListStatus] = useState('All');
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(15);
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedUniversity, setSelectedUniversity] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');

  const allReportApps = useMemo(() => {
    return (applications || []).map((app) => {
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
            countryName = 'Not provided';
          }
        }
      }

      return {
        id: app.id || app._id || app.camsId,
        camsId: getDisplayId(app),
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

  const serverList = useServerList('/lists/query', { localRecords: allReportApps, resource: 'admin-report', search: listSearch, filters: { agent: selectedAgent, university: selectedUniversity, country: selectedCountry, status: listStatus }, page: listPage, limit: listLimit, onPageChange: setListPage });
  const filteredApps = serverList.data;
  useEffect(() => { setListPage(1); }, [listSearch, selectedAgent, selectedUniversity, selectedCountry, listStatus]);

  const handleExport = async () => {
    try {
      const response = await API.post('/lists/query', { resource: 'admin-report', records: allReportApps }, { params: { export: 'true', search: listSearch, filters: JSON.stringify({ agent: selectedAgent, university: selectedUniversity, country: selectedCountry, status: listStatus }) } });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to export report.');
      const exportRows = response.data.data;
      const headers = ['Application ID', 'Student Name', 'Agent Channel', 'University', 'Course', 'Intake', 'Country', 'Status'];
      const rows = exportRows.map(app => [
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
      alert(e.response?.data?.message || e.message || "Unable to export report.");
    }
  };

  const openReportApplication = app => onOpenApplication ? onOpenApplication(app.id) : setSelectedReport(app);
  if (selectedReport) return <div className="workspace-page p-4 sm:p-6"><ListRecordView record={{...selectedReport,studentName:selectedReport.name,universityName:selectedReport.university,courseName:selectedReport.course,partnerName:selectedReport.agent}} title="Application report" onBack={()=>setSelectedReport(null)} /></div>;
  return (
    <div className="workspace-page flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="workspace-panel flex flex-wrap gap-3 justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
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
        <ActionButton
          onClick={handleExport}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export CSV</span>
        </ActionButton>
      </div>

      {/* Query Results Table */}
      <div className="workspace-panel workspace-list-frame bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
<ListToolbar search={listSearch} onSearchChange={setListSearch} filters={[{key:'agent',label:'agents',value:selectedAgent,onChange:setSelectedAgent,options:['Direct',...availableAgents]},{key:'university',label:'universities',value:selectedUniversity,onChange:setSelectedUniversity,options:availableUniversities},{key:'country',label:'countries',value:selectedCountry,onChange:setSelectedCountry,options:availableCountries},{key:'status',label:'statuses',value:listStatus,onChange:setListStatus,options:serverList.facets.status || []}]} onReset={() => { setListSearch(''); setSelectedAgent('All'); setSelectedUniversity('All'); setSelectedCountry('All'); setListStatus('All'); }} loading={serverList.loading} error={serverList.error} onRetry={serverList.reload} />
        
        <div className="overflow-x-auto">
          {filteredApps.length > 0 ? (
            <table className="workspace-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Application ID</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Agent Channel</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">University</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Intake</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredApps.map((app) => (
                  <tr key={app.id || app.camsId} {...rowViewProps(()=>openReportApplication(app))} className="cursor-pointer hover:bg-[#F8FAFC] transition-colors duration-100">
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
                    <td className="text-right"><RowActions><ActionButton className="rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50" onClick={()=>openReportApplication(app)}>View application</ActionButton></RowActions></td>
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
<ListPager list={serverList} page={listPage} onPageChange={setListPage} limit={listLimit} onLimitChange={setListLimit} />
      </div>
    </div>
  );
}
