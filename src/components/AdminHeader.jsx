import React, { useState } from 'react';

export default function AdminHeader({ 
  activeTab, 
  activeSubTab, 
  onToggleSidebar, 
  onLogout
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const getBreadcrumbs = () => {
    const crumbs = ['Studegram Admin'];
    
    if (activeTab === 'daily-report') {
      crumbs.push('Daily Report');
    } else if (activeTab === 'admin-report') {
      crumbs.push('Admin-Report');
      if (activeSubTab === 'report-agent') crumbs.push('By Agent');
      if (activeSubTab === 'report-university') crumbs.push('By University');
      if (activeSubTab === 'report-course') crumbs.push('By Course');
    } else if (activeTab === 'partners') {
      crumbs.push('Partners');
    } else if (activeTab === 'students') {
      crumbs.push('Students');
    } else if (activeTab === 'staff') {
      crumbs.push('Staff');
    } else if (activeTab === 'sales-order') {
      crumbs.push('Sales Order');
      if (activeSubTab === 'tourist-package') crumbs.push('Tourist Package');
      if (activeSubTab === 'study') crumbs.push('Study (Apply)');
    } else if (activeTab === 'settings') {
      crumbs.push('Application Portal Settings');
      if (activeSubTab) {
        const subLabel = activeSubTab.replace('settings-', '').replace('-', ' ');
        crumbs.push(subLabel.charAt(0).toUpperCase() + subLabel.slice(1));
      }
    } else if (activeTab === 'todo-list') {
      crumbs.push('To-do List');
    }
    
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex flex-col select-none z-20 sticky top-0 bg-white">
      {/* 1. Subscription Expiry Warning Banner */}
      <div className="bg-[#FFFBEB] border-b border-[#FDE68A] text-[#B45309] text-[11px] font-bold py-2 px-6 flex items-center justify-between shadow-sm animate-pulse-slow">
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <span>Your subscription will expire on July 31, 2026. Please renew your plan to prevent service interruption.</span>
        </div>
        <button className="bg-[#F59E0B] text-white hover:bg-[#D97706] px-3 py-1 rounded-md font-extrabold text-[10px] uppercase tracking-wider transition-all duration-150 active:scale-95">
          Renew Now
        </button>
      </div>

      {/* 2. Top Navigation Bar */}
      <div className="h-[64px] min-h-[64px] border-b border-[#E2E8F0] px-6 flex items-center justify-between">
        {/* Left Side: Hamburger & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
            title="Toggle Navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumbs */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb}>
                {index > 0 && (
                  <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
                  </svg>
                )}
                <span className={index === breadcrumbs.length - 1 ? "text-slate-900 font-bold" : ""}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="sm:hidden text-xs font-bold text-slate-900">
            {breadcrumbs[breadcrumbs.length - 1]}
          </div>
        </div>

        {/* Center Side: Global Search */}
        <div className="relative w-full max-w-xs mx-4 hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-full pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            placeholder="Search here..."
          />
        </div>

        {/* Right Side: Profile Dropdown */}
        <div className="flex items-center gap-3 relative">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">Super Admin</p>
            <p className="text-[10px] text-slate-500 font-medium">admin@studegram.com</p>
          </div>

          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="relative cursor-pointer group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6366F1] to-[#06B6D4] flex items-center justify-center font-bold text-white text-xs shadow-md border-2 border-white group-hover:border-indigo-500 transition-all">
              SA
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <>
              {/* Back-drop to close */}
              <div 
                onClick={() => setProfileDropdownOpen(false)}
                className="fixed inset-0 z-10"
              ></div>
              
              <div className="absolute right-0 top-11 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-[#E2E8F0]">
                  <p className="text-xs font-bold text-slate-900">Super Admin</p>
                  <p className="text-[10px] text-slate-500 truncate">admin@studegram.com</p>
                </div>
                <a
                  href="http://localhost:5173/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Student Portal</span>
                </a>
                <hr className="border-[#E2E8F0] my-1" />
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
