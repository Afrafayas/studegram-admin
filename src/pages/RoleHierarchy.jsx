import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RoleHierarchy() {
  const { currentUser, auditLogs } = useAuth();
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [selectedRole, setSelectedRole] = useState('Director');

  const rolesInfo = {
    'Director': {
      level: 1,
      scope: 'Global System Scope (Full Access)',
      desc: 'Super Administrator with unrestricted rights. Manages user provisioning, billing, system configurations, and views complete reports across all countries.',
      permissions: ['* (All System Actions)', 'users:create', 'users:delete', 'roles:manage', 'commissions:manage', 'commissions:export', 'settings:edit', 'logs:view']
    },
    'COO': {
      level: 2,
      scope: 'Global Operations Scope',
      desc: 'Administrative lead managing global workflow operations. Oversees Country Heads, BDMs, and Executives. Reviews metrics globally but cannot edit core system-level portal configurations.',
      permissions: ['dashboard:view', 'reports:view', 'partners:view', 'partners:manage', 'students:view', 'students:edit', 'students:approve', 'staff:view', 'staff:manage', 'settings:view', 'commissions:view']
    },
    'Finance': {
      level: 3,
      scope: 'Global Financial Scope',
      desc: 'Dedicated to financial reporting, commission pipelines, payout auditing, invoicing, and CSV reports. Blocked from customer profiles and staff onboarding.',
      permissions: ['dashboard:view_financial', 'partners:view', 'commissions:view', 'commissions:manage', 'commissions:export']
    },
    'Country Head': {
      level: 4,
      scope: 'Country Scope (e.g. India Only)',
      desc: 'Manages regional BDMs and Executives under their country scope. Approves student workflows and monitors region-specific daily dashboards.',
      permissions: ['dashboard:view', 'reports:view', 'partners:view', 'partners:manage', 'students:view', 'students:edit', 'students:approve', 'staff:view', 'staff:manage', 'commissions:view']
    },
    'BDM': {
      level: 5,
      scope: 'Team Scope (e.g. North India)',
      desc: 'Business development manager who logs leads, manages partners under their team, and assigns operational files to Executives.',
      permissions: ['dashboard:view', 'partners:view', 'students:view', 'students:edit', 'tasks:assign']
    },
    'Executive': {
      level: 6,
      scope: 'Assigned File Scope',
      desc: 'Operations Executives who handle documents, verify SSLC/HSC credentials, and update stage states on explicitly assigned client files.',
      permissions: ['dashboard:view', 'students:view', 'students:update_status', 'students:upload_docs']
    }
  };

  const getRoleBg = (role) => {
    switch (role) {
      case 'Director': return 'bg-[#D99A1C] border-[#D99A1C] text-white';
      case 'COO': return 'bg-indigo-600 border-indigo-650 text-white';
      case 'Finance': return 'bg-emerald-600 border-emerald-650 text-white';
      case 'Country Head': return 'bg-blue-600 border-blue-650 text-white';
      case 'BDM': return 'bg-cyan-600 border-cyan-650 text-white';
      case 'Executive': return 'bg-slate-700 border-slate-750 text-white';
      default: return 'bg-slate-100 border-slate-200 text-slate-800';
    }
  };

  const currentRoleDetails = rolesInfo[selectedRole];

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Security & RBAC Administration</h1>
          <p className="text-xs text-slate-500 font-medium">
            Visualize the active organizational hierarchy, view role-based API clearance boundaries, and monitor live audit logs.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-slate-150 p-1.5 rounded-xl flex gap-1 text-[11px] font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'hierarchy' ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'hover:bg-white/50 hover:text-slate-950'
            }`}
          >
            Hierarchy Visualizer
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'logs' ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'hover:bg-white/50 hover:text-slate-950'
            }`}
          >
            System Audit Logs
          </button>
        </div>
      </div>

      {activeTab === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Column 1 & 2: Interactive Tree Visualizer */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-100 pb-3">
                Organizational Hierarchy Tree
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Click on any node below to inspect that role's boundaries, permissions, and database filters in the inspector panel.
              </p>
            </div>

            {/* Tree Chart */}
            <div className="py-8 flex flex-col items-center gap-6 relative select-none">
              
              {/* Level 1: Director */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setSelectedRole('Director')}
                  className={`px-6 py-3 border-2 rounded-2xl shadow-md transition-all text-xs font-black cursor-pointer transform hover:scale-[1.03] ${
                    selectedRole === 'Director' ? 'ring-4 ring-amber-500/20 scale-[1.03]' : 'opacity-80'
                  } ${getRoleBg('Director')}`}
                >
                  👑 Director (Level 1)
                </button>
                <div className="h-6 w-0.5 bg-slate-350"></div>
              </div>

              {/* Level 2: COO */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setSelectedRole('COO')}
                  className={`px-6 py-3 border-2 rounded-2xl shadow-md transition-all text-xs font-black cursor-pointer transform hover:scale-[1.03] ${
                    selectedRole === 'COO' ? 'ring-4 ring-indigo-500/20 scale-[1.03]' : 'opacity-80'
                  } ${getRoleBg('COO')}`}
                >
                  ⚡ COO / Operations Head (Level 2)
                </button>
                <div className="h-6 w-0.5 bg-slate-350"></div>
              </div>

              {/* Horizontal line for splits */}
              <div className="w-[80%] max-w-lg border-t-2 border-slate-350 relative -mt-0.5"></div>

              {/* Level 3 splits: Finance, Country Head */}
              <div className="grid grid-cols-2 gap-12 w-full max-w-xl text-center">
                
                {/* Left Side: Finance (Parallel report, but blocked from core operational child nodes) */}
                <div className="flex flex-col items-center -mt-6">
                  <div className="h-6 w-0.5 bg-slate-350"></div>
                  <button
                    onClick={() => setSelectedRole('Finance')}
                    className={`px-5 py-3 border-2 rounded-2xl shadow-md transition-all text-xs font-black cursor-pointer transform hover:scale-[1.03] ${
                      selectedRole === 'Finance' ? 'ring-4 ring-emerald-500/20 scale-[1.03]' : 'opacity-80'
                    } ${getRoleBg('Finance')}`}
                  >
                    💵 Finance Team (Level 3)
                  </button>
                  <div className="text-[9px] text-slate-400 font-bold mt-1.5">Reporting only</div>
                </div>

                {/* Right Side: Country Head */}
                <div className="flex flex-col items-center -mt-6">
                  <div className="h-6 w-0.5 bg-slate-350"></div>
                  <button
                    onClick={() => setSelectedRole('Country Head')}
                    className={`px-5 py-3 border-2 rounded-2xl shadow-md transition-all text-xs font-black cursor-pointer transform hover:scale-[1.03] ${
                      selectedRole === 'Country Head' ? 'ring-4 ring-blue-500/20 scale-[1.03]' : 'opacity-80'
                    } ${getRoleBg('Country Head')}`}
                  >
                    🗺️ Country Head (Level 4)
                  </button>
                  <div className="h-6 w-0.5 bg-slate-350"></div>
                  
                  {/* Country Head reports to BDMs */}
                  <button
                    onClick={() => setSelectedRole('BDM')}
                    className={`px-5 py-2.5 border-2 rounded-2xl shadow-md transition-all text-xs font-black cursor-pointer transform hover:scale-[1.03] ${
                      selectedRole === 'BDM' ? 'ring-4 ring-cyan-500/20 scale-[1.03]' : 'opacity-80'
                    } ${getRoleBg('BDM')}`}
                  >
                    💼 BDM (Level 5)
                  </button>
                  <div className="h-6 w-0.5 bg-slate-350"></div>

                  {/* BDMs report to Application Executives */}
                  <button
                    onClick={() => setSelectedRole('Executive')}
                    className={`px-5 py-2.5 border-2 rounded-2xl shadow-md transition-all text-xs font-black cursor-pointer transform hover:scale-[1.03] ${
                      selectedRole === 'Executive' ? 'ring-4 ring-slate-500/20 scale-[1.03]' : 'opacity-80'
                    } ${getRoleBg('Executive')}`}
                  >
                    📝 Executive (Level 6)
                  </button>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 font-semibold flex items-center gap-2">
              <span>💡</span>
              <span>Each level inherits scopes and reporting structures. Lower roles cannot edit or view data outside their scoping flags (e.g. Country Head country limit).</span>
            </div>
          </div>

          {/* Column 3: Inspector Panel */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[9px] font-black text-[#D99A1C] uppercase tracking-widest">Selected Role Inspector</span>
                <h2 className="text-base font-black text-slate-900 mt-1">{selectedRole}</h2>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Hierarchy Level: {currentRoleDetails.level} of 6</p>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Scoped Boundary</h3>
                  <p className="text-xs font-bold text-[#D99A1C] mt-1">{currentRoleDetails.scope}</p>
                </div>

                <div>
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description</h3>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-1">{currentRoleDetails.desc}</p>
                </div>

                <div>
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Permitted Action Keys</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentRoleDetails.permissions.map(perm => (
                      <span key={perm} className="px-2 py-1 bg-slate-100 border border-slate-200/50 rounded-lg text-[9px] font-mono font-bold text-slate-700">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200/50 rounded-xl space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Active Demo Account</span>
              <div className="text-[11px] font-bold text-slate-800">
                {selectedRole === 'Director' && <p>📧 director@studegram.com <br/>🔑 password123</p>}
                {selectedRole === 'COO' && <p>📧 coo@studegram.com <br/>🔑 password123</p>}
                {selectedRole === 'Finance' && <p>📧 finance@studegram.com <br/>🔑 password123</p>}
                {selectedRole === 'Country Head' && <p>📧 countryhead.in@studegram.com <br/>🔑 password123</p>}
                {selectedRole === 'BDM' && <p>📧 bdm.india@studegram.com <br/>🔑 password123</p>}
                {selectedRole === 'Executive' && <p>📧 rahul@studegram.com <br/>🔑 password123</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">System Action Audit Trails</h2>
          </div>

          {currentUser.role !== 'Director' ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <span className="text-3xl">🔒</span>
              <h3 className="text-xs font-black text-rose-900 uppercase">Audit Log Access Restricted</h3>
              <p className="text-[11px] text-slate-500 font-semibold max-w-sm">
                Only the Director (Level 1 Super Admin) has authorization to inspect the operational audit database. Your attempt has been logged in the security buffer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Actor Name</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Action Prefix</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Target Entity</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Target ID</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Log Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()} {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-3.5 text-slate-900 font-bold font-sans">{log.userName}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          log.userRole === 'Director' ? 'bg-amber-100 text-amber-700' :
                          log.userRole === 'COO' ? 'bg-indigo-100 text-indigo-700' :
                          log.userRole === 'Finance' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {log.userRole}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[#D99A1C] font-extrabold">{log.action}</td>
                      <td className="px-6 py-3.5 text-slate-500 font-sans">{log.targetType}</td>
                      <td className="px-6 py-3.5 text-slate-900 font-bold">{log.targetId}</td>
                      <td className="px-6 py-3.5 text-slate-600 font-sans font-semibold max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
