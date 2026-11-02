import ListRecordView from '../components/ListRecordView';
import ListFilterTabs from '../components/ListFilterTabs';
import useServerList from '../hooks/useServerList';
import ListToolbar, { ListPager } from '../components/ListToolbar';
import ActionMenu from '../components/ActionMenu';
import SearchableSelect from '../components/SearchableSelect';
import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../api/axios';

const SIDEBAR_PERMISSION_ITEMS = [
  { key: 'sidebar:daily-report', label: 'Daily Report', portal: 'Admin' },
  { key: 'sidebar:applications', label: 'Applications', portal: 'Admin' },
  { key: 'sidebar:admin-report', label: 'Admin-Report (Analytics)', portal: 'Admin' },
  { key: 'sidebar:become-partner', label: 'Become Our Partner', portal: 'Admin' },
  { key: 'sidebar:students', label: 'Students Directory', portal: 'Admin' },
  { key: 'sidebar:commissions', label: 'Commissions Pipeline', portal: 'Admin' },
  { key: 'sidebar:staff', label: 'Staff Management', portal: 'Admin' },
  { key: 'sidebar:settings', label: 'Portal Settings', portal: 'Admin' },
  { key: 'sidebar:todo-list', label: 'To-do List', portal: 'Admin' },

  { key: 'sidebar:dashboard', label: 'Agent Dashboard', portal: 'Agent' },
  { key: 'sidebar:universities', label: 'Universities', portal: 'Agent' },
  { key: 'sidebar:courses', label: 'Search Courses', portal: 'Agent' },
  { key: 'sidebar:staff', label: 'Agency Team / Staff', portal: 'Agent' },
  { key: 'sidebar:notice', label: 'Notices', portal: 'Agent' },
  { key: 'sidebar:webinar', label: 'Webinars', portal: 'Agent' },
  { key: 'sidebar:knowledge', label: 'Knowledge Hub', portal: 'Agent' },
  { key: 'sidebar:scholarships', label: 'Scholarships', portal: 'Agent' },
  { key: 'sidebar:deadlines', label: 'University Deadlines', portal: 'Agent' }
];

const FEATURE_ACTION_PERMISSIONS = [
  { key: 'applications:view', label: 'View Student Applications', portal: 'Both' },
  { key: 'applications:create', label: 'Create / Submit New Application', portal: 'Both' },
  { key: 'applications:edit', label: 'Edit Application & Change Stage Status', portal: 'Both' },
  { key: 'applications:delete', label: 'Delete Student Application', portal: 'Admin' },
  { key: 'applications:claim_commission', label: 'Claim Agency Commission Payout', portal: 'Agent' },
  { key: 'partners:view', label: 'View Referral Partner Agencies', portal: 'Admin' },
  { key: 'partners:approve', label: 'Approve / Reject Agency Registrations', portal: 'Admin' },
  { key: 'commissions:view', label: 'View Commission Reports', portal: 'Both' },
  { key: 'commissions:manage', label: 'Approve Payout / Disburse Commission Funds', portal: 'Admin' },
  { key: 'commissions:export', label: 'Export Financial CSV Statement Reports', portal: 'Admin' },
  { key: 'staff:view', label: 'View Staff Accounts', portal: 'Both' },
  { key: 'staff:manage', label: 'Create, Edit & Deactivate Staff Credentials', portal: 'Both' },
  { key: 'settings:edit', label: 'Modify Portal System Settings & Options', portal: 'Admin' }
];

export default function RoleHierarchy() {
  const [listRecord, setListRecord] = React.useState(null);

  const toast = useToast();
  const { currentUser, auditLogs, addAuditLog } = useAuth();
  
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'hierarchy' | 'logs'
  const [selectedRole, setSelectedRole] = useState('Director');
  
  // Database roles with instant preset fallback
  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(15);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRole, setAuditRole] = useState('All');
  const [auditAction, setAuditAction] = useState('All');
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(15);
  const auditList = useServerList('/lists/query', { localRecords: auditLogs, resource: 'role-audit', search: auditSearch, filters: { role: auditRole, action: auditAction }, page: auditPage, limit: auditLimit, onPageChange: setAuditPage });
  useEffect(() => { setAuditPage(1); }, [auditSearch, auditRole, auditAction]);
  const [portalFilter, setPortalFilter] = useState('All'); // 'All' | 'Admin' | 'Agent'

  // Modal State for editing/creating role checklist
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    portalType: 'Admin',
    description: '',
    permissions: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const res = await API.get('/roles');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRoles(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch roles:', err.message);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      displayName: '',
      portalType: 'Admin',
      description: '',
      permissions: ['sidebar:dashboard', 'applications:view']
    });
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name || '',
      displayName: role.displayName || role.name || '',
      portalType: role.portalType || 'Admin',
      description: role.description || '',
      permissions: role.permissions || []
    });
    setIsRoleModalOpen(true);
  };

  const togglePermissionKey = (key) => {
    setRoleForm(prev => {
      const exists = prev.permissions.includes(key);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(k => k !== key) };
      } else {
        return { ...prev, permissions: [...prev.permissions, key] };
      }
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.displayName.trim() || (!editingRole && !roleForm.name.trim())) {
      toast.error('Role name and display title are required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRole) {
        const res = await API.put(`/roles/${editingRole._id || editingRole.id}`, {
          displayName: roleForm.displayName,
          description: roleForm.description,
          permissions: roleForm.permissions
        });
        if (res.data?.success) {
          toast.success(`Role '${roleForm.displayName}' permissions updated in database!`);
          addAuditLog('UPDATE_ROLE_PERMISSIONS', 'Security', editingRole.name, `Updated permissions checklist for ${roleForm.displayName}`);
          setIsRoleModalOpen(false);
          fetchRoles();
        }
      } else {
        const res = await API.post('/roles', {
          name: roleForm.name,
          displayName: roleForm.displayName,
          portalType: roleForm.portalType,
          description: roleForm.description,
          permissions: roleForm.permissions
        });
        if (res.data?.success) {
          toast.success(`New role '${roleForm.displayName}' created and saved to database!`);
          addAuditLog('CREATE_ROLE', 'Security', roleForm.name, `Created custom role ${roleForm.displayName}`);
          setIsRoleModalOpen(false);
          fetchRoles();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save role permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const serverList = useServerList('/roles', { search: listSearch, filters: { portalType: portalFilter }, page: listPage, limit: listLimit, onPageChange: setListPage, reloadKey: JSON.stringify(roles) });
  useEffect(() => { setListPage(1); }, [listSearch, portalFilter]);
  const filteredRoles = serverList.data;

  return (
    listRecord ? <div className="workspace-page flex-1 p-4 sm:p-6"><ListRecordView record={listRecord} title={listRecord.displayName || listRecord.title || listRecord.name || listRecord.university || 'Record details'} onBack={() => setListRecord(null)} /></div> : (<div className="workspace-page flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="workspace-panel bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Security & Role-Based Permissions (RBAC)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-[#D99A1C] border border-amber-200">
              Live Database Checklist
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Manage preset and custom roles, configure sidebar checklist visibility, and assign feature capabilities for both Admin and Agent portals.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-slate-150 p-1.5 rounded-xl flex gap-1 text-[11px] font-bold text-slate-600 shrink-0">
          <ActionButton
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'checklist' ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'hover:bg-white/50 hover:text-slate-950'
            }`}
          >
            📋 Role & Permissions Checklist
          </ActionButton>
          <ActionButton
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'hierarchy' ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'hover:bg-white/50 hover:text-slate-950'
            }`}
          >
            🌳 Tree Visualizer
          </ActionButton>
          <ActionButton
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
              activeTab === 'logs' ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'hover:bg-white/50 hover:text-slate-950'
            }`}
          >
            📜 Audit Logs
          </ActionButton>
        </div>
      </div>

      {/* TAB 1: ROLE & PERMISSION CHECKLIST BUILDER */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="workspace-panel workspace-list-frame bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
            {/* Scoping Tabs on top of table */}
            <ListFilterTabs value={portalFilter} onChange={value => { setPortalFilter(value); setListPage(1); }} options={[{value:'All',label:'All roles',filters:{portalType:'All'}},{value:'Admin',label:'Admin roles',filters:{portalType:'Admin'}},{value:'Agent',label:'Agent roles',filters:{portalType:'Agent'}}]} query={{endpoint:'/roles',search:listSearch,reloadKey:JSON.stringify(roles)}} />

            <ListToolbar search={listSearch} onSearchChange={setListSearch} filters={[{ key:'portalType',label:'portals',value:portalFilter,onChange:setPortalFilter,options:['Admin','Agent'] }]} onReset={() => { setListSearch(''); setPortalFilter('All'); setListPage(1); }} loading={serverList.loading} error={serverList.error} onRetry={serverList.reload} />

            

            <div className="overflow-x-auto">
              {filteredRoles.length > 0 ? (
                <table className="workspace-table w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider pl-6">Role Name & Title</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Portal Type</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Classification</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Permissions</th>
                      <th className="px-6 py-3.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredRoles.map(role => (
                      <tr tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") { event.preventDefault(); event.currentTarget.click(); } }}
                        key={role._id || role.name}
                        onClick={() => setListRecord(role)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-black text-slate-900 pl-6">
                          <span className="group-hover:text-[#D99A1C] transition-colors">{role.displayName || role.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                            role.portalType === 'Agent' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {role.portalType === 'Agent' ? 'Agent Portal' : 'Admin Portal'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${role.isPreset ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {role.isPreset ? 'System Preset' : 'Custom'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{role.description || 'Configured system security role.'}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {role.permissions?.includes('*') ? (
                            <span className="text-emerald-700 font-extrabold">Full Access (*)</span>
                          ) : (
                            <span>{role.permissions?.length || 0} permissions</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right pr-6" onClick={e => e.stopPropagation()}>
                          <ActionMenu
                            items={[
                              { label: 'Edit Checklist Permissions', onClick: () => openEditRoleModal(role) },
                              { label: 'View Role Details', onClick: () => openEditRoleModal(role) }
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">No roles found</div>
              )}
            </div>

            <ListPager list={serverList} page={listPage} onPageChange={setListPage} limit={listLimit} onLimitChange={setListLimit} />
          </div>
        </div>
      )}

      {/* TAB 2: HIERARCHY TREE VISUALIZER */}
      {activeTab === 'hierarchy' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-100 pb-3">
            System Identity & Role Hierarchy Tree
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#D99A1C] uppercase tracking-wider">🏛️ Admin Portal Role Hierarchy</h3>
              <div className="space-y-2">
                {roles.filter(role => role.portalType === 'Admin').map(role => ({ name: role.displayName || role.name, desc: role.description })).map((r, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{r.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-[9px] font-bold">Role</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider">🏢 Agent Portal Role Hierarchy</h3>
              <div className="space-y-2">
                {roles.filter(role => role.portalType === 'Agent').map(role => ({ name: role.displayName || role.name, desc: role.description })).map((r, i) => (
                  <div key={i} className="p-3 bg-purple-50/50 border border-purple-200/70 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{r.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-bold">Level {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
<ListToolbar search={auditSearch} onSearchChange={setAuditSearch} filters={[{key:'role',label:'roles',value:auditRole,onChange:setAuditRole,options:auditList.facets.role || []},{key:'action',label:'actions',value:auditAction,onChange:setAuditAction,options:auditList.facets.action || []}]} onReset={() => { setAuditSearch(''); setAuditRole('All'); setAuditAction('All'); }} loading={auditList.loading} error={auditList.error} onRetry={auditList.reload} />
          <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-100 pb-3">
            Live System RBAC Audit Logs
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="workspace-table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {auditList.data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('en-GB')}</td>
                    <td className="p-3 font-bold text-slate-900">{log.userName}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-amber-50 text-[#D99A1C] border border-amber-200 rounded text-[9px] font-bold">{log.userRole}</span></td>
                    <td className="p-3 font-extrabold text-slate-800">{log.action}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
<ListPager list={auditList} page={auditPage} onPageChange={setAuditPage} limit={auditLimit} onLimitChange={setAuditLimit} />
        </div>
      )}

      {/* EDIT / CREATE ROLE CHECKLIST MODAL */}
      {isRoleModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4 overflow-y-auto">
          <div className="workspace-list-frame bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 bg-slate-900 text-white border-b border-white/10">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider">
                  {editingRole ? `Edit Role Permissions — ${editingRole.displayName}` : 'Create New Security Role'}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Checklist sidebar visibility & feature action rights</p>
              </div>
              <ActionButton onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                ✕
              </ActionButton>
            </div>

            <ActionForm onSubmit={handleSaveRole} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Role Title / Display Name *</label>
                  <input
                    type="text"
                    required
                    value={roleForm.displayName}
                    onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                    placeholder="e.g. Senior Counselor / Regional Auditor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D99A1C]"
                  />
                </div>

                {!editingRole && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">System Identifier (No spaces) *</label>
                    <input
                      type="text"
                      required
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder="e.g. SeniorCounselor"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D99A1C]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Target Portal *</label>
                  <SearchableSelect
                    value={roleForm.portalType}
                    onChange={(e) => setRoleForm({ ...roleForm, portalType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D99A1C]"
                  >
                    <option value="Admin">🏛️ Admin Portal</option>
                    <option value="Agent">🏢 Agent Portal</option>
                  </SearchableSelect>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Role Description</label>
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="Describe operational access boundary..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#D99A1C]"
                  />
                </div>
              </div>

              {/* SIDEBAR ITEMS CHECKLIST */}
              <div className="space-y-3 border-t border-slate-150 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📌 Sidebar Navigation Checklist</span>
                    <span className="text-[10px] text-slate-400 font-semibold">(Check items allowed to appear in sidebar)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {SIDEBAR_PERMISSION_ITEMS.map((item) => {
                    const isChecked = roleForm.permissions.includes(item.key) || roleForm.permissions.includes('*');
                    return (
                      <label
                        key={item.key}
                        onClick={() => togglePermissionKey(item.key)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked ? 'bg-amber-50 border-[#D99A1C] text-slate-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#D99A1C] rounded border-slate-300 focus:ring-[#D99A1C]"
                        />
                        <div className="truncate">
                          <p className="text-xs">{item.label}</p>
                          <span className="text-[9px] text-slate-400 block font-mono">{item.key}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* FEATURE ACTION PERMISSIONS CHECKLIST */}
              <div className="space-y-3 border-t border-slate-150 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡ Feature Capabilities Checklist</span>
                    <span className="text-[10px] text-slate-400 font-semibold">(Check action rights granted)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEATURE_ACTION_PERMISSIONS.map((act) => {
                    const isChecked = roleForm.permissions.includes(act.key) || roleForm.permissions.includes('*');
                    return (
                      <label
                        key={act.key}
                        onClick={() => togglePermissionKey(act.key)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div className="truncate">
                          <p className="text-xs">{act.label}</p>
                          <span className="text-[9px] text-slate-400 block font-mono">{act.key}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3">
                <ActionButton
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:scale-[1.01] text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                  {isSaving && (
                    <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isSaving ? 'Saving to Database...' : 'Save Role & Permissions to Database ✓'}
                </ActionButton>
              </div>
            </ActionForm>
          </div>
        </div>,
        document.body
      )}
    </div>)
  );
}
