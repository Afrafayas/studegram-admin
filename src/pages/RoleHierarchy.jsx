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
  const toast = useToast();
  const { currentUser, auditLogs, addAuditLog } = useAuth();
  
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'hierarchy' | 'logs'
  const [selectedRole, setSelectedRole] = useState('Director');
  
  // Database roles with instant preset fallback
  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
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

  const filteredRoles = roles.filter(r => portalFilter === 'All' || r.portalType === portalFilter);

  return (
    <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          {/* Controls Bar */}
          <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Portal View Filter:</span>
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-bold">
                {['All', 'Admin', 'Agent'].map(p => (
                  <ActionButton
                    key={p}
                    onClick={() => setPortalFilter(p)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      portalFilter === p ? 'bg-white text-[#D99A1C] shadow-sm font-black' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {p === 'All' ? 'All Roles' : p === 'Admin' ? '🏛️ Admin Roles' : '🏢 Agent Roles'}
                  </ActionButton>
                ))}
              </div>
            </div>

            <ActionButton
              onClick={openCreateRoleModal}
              className="bg-gradient-to-r from-[#D99A1C] to-[#F5B025] hover:scale-[1.02] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Custom Role</span>
            </ActionButton>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => (
              <div key={role._id || role.name} className="bg-white border border-[#E2E8F0] hover:border-[#D99A1C] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        role.portalType === 'Agent' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {role.portalType === 'Agent' ? '🏢 Agent Portal Role' : '🏛️ Admin Portal Role'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 pt-1 tracking-tight">{role.displayName || role.name}</h3>
                    </div>
                    {role.isPreset && (
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        System Preset
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {role.description || 'Configured system security role.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Assigned Permissions ({role.permissions?.length || 0}):</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {role.permissions?.includes('*') ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                          ⚡ Full Access (*)
                        </span>
                      ) : role.permissions?.map((pKey) => (
                        <span key={pKey} className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200">
                          {pKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <ActionButton
                  onClick={() => openEditRoleModal(role)}
                  className="w-full mt-2 bg-slate-900 hover:bg-black text-white font-extrabold text-xs py-2 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Checklist Permissions</span>
                </ActionButton>
              </div>
            ))}
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
          <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-100 pb-3">
            Live System RBAC Audit Logs
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
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
                {auditLogs.map((log) => (
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
        </div>
      )}

      {/* EDIT / CREATE ROLE CHECKLIST MODAL */}
      {isRoleModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
    </div>
  );
}
