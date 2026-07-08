import React, { useState } from 'react';

export default function Clients({ clients, setClients }) {
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => {
    const typeMatch = filterType === 'All' || c.type === filterType;
    const searchMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.phone.includes(searchTerm);
    return typeMatch && searchMatch;
  });

  const handleInviteClient = () => {
    alert("Sending client portal onboarding link via email invitation...");
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Clients & Partners Directory</h1>
          <p className="text-xs text-slate-500 font-medium">B2B Referral Agents and Direct Student Client list profiles.</p>
        </div>
        <button
          onClick={handleInviteClient}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Onboard Client</span>
        </button>
      </div>

      {/* Directory Filters & Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
          {['All', 'Student', 'Agent'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === type 
                  ? 'bg-white text-indigo-600 shadow-sm font-black' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {type}s
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
            placeholder="Search by name, email, phone..."
          />
        </div>
      </div>

      {/* Table Directory */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Client profiles</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredClients.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[60px]">SI.NO.</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Onboarding Role</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Active Files</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredClients.map((client, idx) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                        client.type === 'Agent' ? 'bg-gradient-to-tr from-cyan-500 to-indigo-500' : 'bg-gradient-to-tr from-indigo-500 to-cyan-400'
                      }`}>
                        {client.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-slate-950 font-black">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Account Verified</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        client.type === 'Agent' 
                          ? 'bg-cyan-50 text-cyan-700 border-cyan-100' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {client.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-bold">{client.email}</td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">{client.phone}</td>
                    <td className="px-6 py-4 font-black">{client.activeApps}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-extrabold">
                        {client.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-xs font-black text-slate-900 uppercase">No Clients Found</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">No directory entries matched your search query. Try another input.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
