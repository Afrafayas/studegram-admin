import React, { useState } from 'react';

export default function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  activeSubTab, 
  setActiveSubTab, 
  onLogout, 
  isOpen,
  onClose
}) {
  const [salesOrderOpen, setSalesOrderOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [adminReportsOpen, setAdminReportsOpen] = useState(false);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setActiveSubTab(null);
    if (onClose) onClose();
  };

  const handleSubTabClick = (tabId, subTabId) => {
    setActiveTab(tabId);
    setActiveSubTab(subTabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        ></div>
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 lg:z-30 lg:static w-[260px] min-w-[260px] bg-[#0F172A] border-r border-[#1E293B] text-slate-300 h-screen lg:h-auto flex flex-col justify-between py-5 select-none transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        
        <div className="flex flex-col gap-6 overflow-y-auto px-4 scrollbar-thin">
          {/* Brand Header */}
          <div className="px-2 pb-4 border-b border-[#1E293B] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#06B6D4] flex items-center justify-center font-extrabold text-white text-base shadow-lg shadow-indigo-500/20">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-widest text-white uppercase">STUDEGRAM</span>
              <span className="text-[9px] text-cyan-400 font-extrabold tracking-wider uppercase -mt-0.5">Admin Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {/* Daily Report */}
            <button
              onClick={() => handleTabClick('daily-report')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                activeTab === 'daily-report' && !activeSubTab
                  ? 'bg-[#1E293B] text-white border-l-2 border-indigo-500 pl-2.5'
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Daily Report</span>
            </button>

            {/* Admin-Report Collapsible */}
            <div>
              <button
                onClick={() => setAdminReportsOpen(!adminReportsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'admin-report' ? 'text-white font-bold bg-[#1E293B]/40' : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" />
                  </svg>
                  <span>Admin-Report</span>
                </div>
                <svg className={`w-3.5 h-3.5 transform transition-transform duration-200 ${adminReportsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {adminReportsOpen && (
                <div className="pl-7 mt-1.5 space-y-1 border-l border-slate-800 ml-5">
                  <button
                    onClick={() => handleSubTabClick('admin-report', 'report-agent')}
                    className={`w-full text-left py-2 px-3 text-[11px] font-semibold rounded-md transition-colors ${
                      activeTab === 'admin-report' && activeSubTab === 'report-agent'
                        ? 'text-cyan-400 bg-slate-800/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Report by Agent
                  </button>
                  <button
                    onClick={() => handleSubTabClick('admin-report', 'report-university')}
                    className={`w-full text-left py-2 px-3 text-[11px] font-semibold rounded-md transition-colors ${
                      activeTab === 'admin-report' && activeSubTab === 'report-university'
                        ? 'text-cyan-400 bg-slate-800/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Report by University
                  </button>
                  <button
                    onClick={() => handleSubTabClick('admin-report', 'report-course')}
                    className={`w-full text-left py-2 px-3 text-[11px] font-semibold rounded-md transition-colors ${
                      activeTab === 'admin-report' && activeSubTab === 'report-course'
                        ? 'text-cyan-400 bg-slate-800/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Report by Course
                  </button>
                </div>
              )}
            </div>

            {/* Partners */}
            <button
              onClick={() => handleTabClick('partners')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                activeTab === 'partners' && !activeSubTab
                  ? 'bg-[#1E293B] text-white border-l-2 border-indigo-500 pl-2.5'
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Partners</span>
            </button>

            {/* Students */}
            <button
              onClick={() => handleTabClick('students')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                activeTab === 'students' && !activeSubTab
                  ? 'bg-[#1E293B] text-white border-l-2 border-indigo-500 pl-2.5'
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14v6" />
              </svg>
              <span>Students</span>
            </button>

            {/* Sales Order Dropdown */}
            <div>
              <button
                onClick={() => setSalesOrderOpen(!salesOrderOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'sales-order' ? 'text-white font-bold bg-[#1E293B]/40' : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Sales Order</span>
                </div>
                <svg className={`w-3.5 h-3.5 transform transition-transform duration-200 ${salesOrderOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {salesOrderOpen && (
                <div className="pl-7 mt-1.5 space-y-1 border-l border-slate-800 ml-5">
                  <button
                    onClick={() => handleSubTabClick('sales-order', 'tourist-package')}
                    className={`w-full text-left py-2 px-3 text-[11px] font-semibold rounded-md transition-colors ${
                      activeTab === 'sales-order' && activeSubTab === 'tourist-package'
                        ? 'text-cyan-400 bg-slate-800/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tourist Package
                  </button>
                  <button
                    onClick={() => handleSubTabClick('sales-order', 'study')}
                    className={`w-full text-left py-2 px-3 text-[11px] font-semibold rounded-md transition-colors ${
                      activeTab === 'sales-order' && activeSubTab === 'study'
                        ? 'text-cyan-400 bg-slate-800/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Study (Apply)
                  </button>
                </div>
              )}
            </div>

            {/* Application Portal Settings Dropdown */}
            <div>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'settings' ? 'text-white font-bold bg-[#1E293B]/40' : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Portal Settings</span>
                </div>
                <svg className={`w-3.5 h-3.5 transform transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="pl-7 mt-1.5 space-y-1 border-l border-slate-800 ml-5">
                  {[
                    { id: 'settings-university', label: 'University' },
                    { id: 'settings-course', label: 'Course' },
                    { id: 'settings-intake', label: 'Intake' },
                    { id: 'settings-formats', label: 'File Formats' },
                    { id: 'settings-course-docs', label: 'Course Documents' },
                    { id: 'settings-documents', label: 'Documents' },
                    { id: 'settings-agent', label: 'Referral Agent' },
                    { id: 'settings-stages', label: 'Stages' },
                    { id: 'settings-actions', label: 'Staged Actions' },
                    { id: 'settings-qualifications', label: 'Qualifications' },
                  ].map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handleSubTabClick('settings', subItem.id)}
                      className={`w-full text-left py-1.5 px-3 text-[11px] font-semibold rounded-md transition-colors ${
                        activeTab === 'settings' && activeSubTab === subItem.id
                          ? 'text-cyan-400 bg-slate-800/40 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* To-do List */}
            <button
              onClick={() => handleTabClick('todo-list')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                activeTab === 'todo-list' && !activeSubTab
                  ? 'bg-[#1E293B] text-white border-l-2 border-indigo-500 pl-2.5'
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>To-do List</span>
            </button>
          </nav>
        </div>

        {/* Footer actions inside Sidebar */}
        <div className="px-4 mt-auto pt-4 border-t border-[#1E293B] flex flex-col gap-2">
          {/* Switch to Student Portal */}
          <a
            href="http://localhost:5173/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 text-cyan-400 hover:text-cyan-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all text-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Studegram Student Portal</span>
          </a>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
