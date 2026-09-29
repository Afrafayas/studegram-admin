import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function AdminHeader({ 
  activeTab, 
  activeSubTab, 
  onToggleSidebar, 
  onLogout,
  onBack,
  isSyncing,
  onRefreshData
}) {
  const { currentUser } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Real-time Notification System
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const getBreadcrumbs = () => {
    const crumbs = ['Studegram Admin'];
    
    if (activeTab === 'daily-report') {
      crumbs.push('Daily Report');
    } else if (activeTab === 'admin-report') {
      crumbs.push('Admin-Report');
      if (activeSubTab === 'report-agent') crumbs.push('By Agent');
      if (activeSubTab === 'report-university') crumbs.push('By University');
      if (activeSubTab === 'report-country') crumbs.push('By Country');
    } else if (activeTab === 'applications') {
      crumbs.push('Applications');
    } else if (activeTab === 'become-partner') {
      crumbs.push('Become our Partner');
    } else if (activeTab === 'partners') {
      crumbs.push('Partners');
    } else if (activeTab === 'students') {
      crumbs.push('Students');
    } else if (activeTab === 'commissions') {
      crumbs.push('Commission Management');
    } else if (activeTab === 'role-hierarchy') {
      crumbs.push('Security & Role Hierarchy');
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
    <header className="flex flex-col select-none z-20 sticky top-0 bg-[#0A0A0F] text-white border-b border-slate-900">
      {/* Top Navigation Bar */}
      <div className="h-[64px] min-h-[64px] px-6 flex items-center justify-between">
        {/* Left Side: Hamburger & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg focus:outline-none"
            title="Toggle Navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg focus:outline-none transition-all flex items-center justify-center active:scale-95 duration-100"
              title="Go Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}

          {/* Breadcrumbs */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb}>
                {index > 0 && (
                  <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
                  </svg>
                )}
                <span className={index === breadcrumbs.length - 1 ? "text-[#D99A1C] font-extrabold" : ""}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="sm:hidden text-xs font-bold text-white">
            {breadcrumbs[breadcrumbs.length - 1]}
          </div>
        </div>

        {/* Right Side: Profile Dropdown, Notifications & Sync Badge */}
        <div className="flex items-center gap-3 relative">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isSyncing}
              title="Sync Live Server Data"
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-[#D99A1C] text-[10px] font-extrabold text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span className={isSyncing ? "animate-spin text-[#D99A1C]" : "text-[#D99A1C]"}>🔄</span>
              <span className="hidden md:inline">{isSyncing ? "Syncing..." : "Sync DB"}</span>
            </button>
          )}

          {/* Real-time Notification Bell Drawer */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (unreadCount > 0) handleMarkAllRead();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all relative focus:outline-none"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifications && (
              <>
                <div 
                  onClick={() => setShowNotifications(false)}
                  className="fixed inset-0 z-10"
                />
                <div className="absolute right-0 top-11 w-80 sm:w-96 bg-[#0A0A0F] border border-slate-800 rounded-2xl shadow-2xl py-3 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-2.5 border-b border-slate-900 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">System Notifications</h4>
                      <p className="text-[10px] text-slate-400">Live operational & application logs</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[9px] font-extrabold text-[#D99A1C] hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-900/60">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n._id} className={`p-3 hover:bg-slate-900/50 transition-colors ${!n.isRead ? 'bg-indigo-950/20' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-white">{n.title}</h5>
                            <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-medium mt-1 leading-snug">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-xs font-medium">
                        No notifications found.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{currentUser?.name || 'Super Admin'}</p>
            <p className="text-[10px] text-[#D99A1C] font-extrabold uppercase">{currentUser?.role || 'SuperAdmin'} ({currentUser?.country || 'Global'})</p>
          </div>

          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="relative cursor-pointer group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#D99A1C] to-[#F5B025] flex items-center justify-center font-bold text-white text-xs shadow-md border-2 border-white group-hover:border-[#D99A1C] transition-all">
              {currentUser?.avatar || 'SA'}
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
              
              <div className="absolute right-0 top-11 w-52 bg-[#0A0A0F] border border-slate-800 rounded-xl shadow-2xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-900">
                  <p className="text-xs font-bold text-white">{currentUser?.name}</p>
                  <p className="text-[9px] text-[#D99A1C] font-black uppercase mt-0.5">{currentUser?.role}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                </div>
                <a
                  href="http://localhost:5173/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-[#161622] hover:text-white flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Student Portal</span>
                </a>
                <hr className="border-slate-900 my-1" />
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/20 flex items-center gap-2 font-bold"
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

