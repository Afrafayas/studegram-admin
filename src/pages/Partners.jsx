import React, { useState } from 'react';

export default function Partners({ clients, setClients }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  
  // Modal State for adding new Partner
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');

  // Extract partners (type === 'Agent')
  const partners = clients.filter(c => c.type === 'Agent');

  // Filter partners
  const filteredPartners = partners.filter(p => {
    const code = p.partnerCode || '';
    const name = p.name || '';
    const email = p.email || '';
    const phone = p.phone || '';
    
    const searchMatch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        phone.includes(searchTerm);
                        
    const statusMatch = statusFilter === 'All' || p.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleInvitePartner = (e) => {
    e.preventDefault();
    if (!newPartnerName || !newPartnerEmail || !newPartnerPhone) {
      alert("Please fill out all fields.");
      return;
    }

    const nextCodeNum = partners.length + 101;
    const newPartner = {
      id: Date.now(),
      name: newPartnerName,
      type: 'Agent',
      email: newPartnerEmail,
      phone: newPartnerPhone,
      partnerCode: `PRT-${nextCodeNum}`,
      status: 'Active',
      activeApps: 0,
      dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    setClients(prev => [newPartner, ...prev]);
    
    // Reset form & close modal
    setNewPartnerName('');
    setNewPartnerEmail('');
    setNewPartnerPhone('');
    setIsModalOpen(false);
    
    alert(`Partner ${newPartnerName} successfully onboarded with Code ${newPartner.partnerCode}`);
  };

  // Find referred students for a specific partner
  const getReferredStudents = (partnerName) => {
    return clients.filter(c => c.type === 'Student' && c.referredBy === partnerName);
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Referral Partners Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage B2B Referral Agents, view their details and referred student applications.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Onboard Partner</span>
        </button>
      </div>

      {/* Directory Filters & Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
          {['All', 'Active', 'Inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === status 
                  ? 'bg-white text-indigo-600 shadow-sm font-black' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            placeholder="Search by name, code, email, phone..."
          />
        </div>
      </div>

      {/* Table Directory */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Agent & Partner channels</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredPartners.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[50px]"></th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[60px]">SI.NO.</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Partner details</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Partner Code</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Referred Student Files</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredPartners.map((partner, idx) => {
                  const isExpanded = expandedId === partner.id;
                  const referredStudents = getReferredStudents(partner.name);
                  
                  return (
                    <React.Fragment key={partner.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(partner.id)}>
                        <td className="pl-6 py-4 w-[40px]">
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs bg-gradient-to-tr from-cyan-500 to-indigo-500">
                            {partner.name.split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-slate-950 font-black">{partner.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">Registered Partner</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border bg-cyan-50 text-cyan-700 border-cyan-100">
                            {partner.partnerCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-bold">{partner.email}</td>
                        <td className="px-6 py-4 text-slate-500 font-semibold">{partner.phone}</td>
                        <td className="px-6 py-4 font-black text-indigo-600">{referredStudents.length} Students</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold ${
                            partner.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {partner.status}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Section for partner details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="bg-slate-50/50 p-6 border-t border-b border-slate-100">
                            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                  Partner Information Sheet — {partner.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Joined On: {partner.dateAdded || 'N/A'}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] font-semibold text-slate-600">
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Agency Code</span>
                                  <span className="text-slate-900 font-bold text-xs">{partner.partnerCode}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Direct Phone Line</span>
                                  <span className="text-slate-900 font-medium text-xs">{partner.phone}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Primary Email Address</span>
                                  <span className="text-indigo-600 font-bold text-xs">{partner.email}</span>
                                </div>
                              </div>
                              
                              {/* Referred Students Table */}
                              <div className="space-y-2 pt-2">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Referred Students ({referredStudents.length})</h4>
                                {referredStudents.length > 0 ? (
                                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150">
                                          <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Student Name</th>
                                          <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Email Address</th>
                                          <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Phone</th>
                                          <th className="px-4 py-2 text-slate-400 font-extrabold uppercase tracking-wider">Files / Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {referredStudents.map(student => (
                                          <tr key={student.id} className="hover:bg-slate-50/30">
                                            <td className="px-4 py-2.5 font-bold text-slate-900">{student.name}</td>
                                            <td className="px-4 py-2.5 text-slate-500">{student.email}</td>
                                            <td className="px-4 py-2.5 text-slate-500">{student.phone}</td>
                                            <td className="px-4 py-2.5">
                                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-extrabold border border-indigo-100">
                                                Active ({student.activeApps})
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 font-medium italic">No students have been referred by this partner yet.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-xs font-black text-slate-900 uppercase">No Partners Found</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">No partner directory entries matched your query.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Onboard Referral Partner</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Invite new agency partner to access referral portal</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvitePartner} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Partner / Agency Name</label>
                <input
                  type="text"
                  required
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                  placeholder="e.g. Luzidcraft Agency"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Contact Email</label>
                <input
                  type="email"
                  required
                  value={newPartnerEmail}
                  onChange={(e) => setNewPartnerEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                  placeholder="e.g. partner@agency.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newPartnerPhone}
                  onChange={(e) => setNewPartnerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                  placeholder="e.g. +91 9998887776"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md"
                >
                  Confirm Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
