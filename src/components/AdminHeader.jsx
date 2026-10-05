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
  onRefreshData,
  onNavigate
}) {
  const { currentUser } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Real-time Notification System
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const defaultNotifications = [
    {
      _id: 'notif-1',
      title: 'New Agency Registration Under Review',
      message: 'LuzidCraft (Salman) has completed registration and submitted legal documents for admin review.',
      createdAt: new Date().toISOString(),
      isRead: false,
      targetTab: 'become-partner'
    },
    {
      _id: 'notif-2',
      title: 'New Student Application Submitted',
      message: 'Rahul Sharma submitted application for MSc Data Science at University of Hertfordshire.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
      targetTab: 'applications'
    }
  ];

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter(n => !n.isRead).length);
      } else {
        setNotifications(defaultNotifications);
        setUnreadCount(defaultNotifications.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err.message);
      setNotifications(defaultNotifications);
      setUnreadCount(defaultNotifications.filter(n => !n.isRead).length);
    }
  };

  // Real-time Application Comments System
  const [commentsList, setCommentsList] = useState([]);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await API.get('/applications/recent-comments');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const readStorageKey = 'studegram_admin_read_comments';
        let readIds = new Set();
        try {
          readIds = new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));
        } catch (e) {}

        const updatedList = res.data.data.map(c => {
          const idKey = c.commentId || `${c.applicationId}_${c.createdAt}`;
          const isMarkedRead = readIds.has(idKey);
          return {
            ...c,
            isUnreplied: isMarkedRead ? false : c.isUnreplied,
            isRead: isMarkedRead
          };
        });

        setCommentsList(updatedList);
        const unreplied = updatedList.filter(c => c.isUnreplied).length;
        setUnreadCommentsCount(unreplied);
      }
    } catch (err) {
      console.warn('Failed to fetch comments for admin header:', err.message);
    }
  };

  const handleCommentClick = (comm) => {
    setShowComments(false);
    const readStorageKey = 'studegram_admin_read_comments';
    try {
      const readIds = new Set(JSON.parse(localStorage.getItem(readStorageKey) || '[]'));
      const idKey = comm.commentId || `${comm.applicationId}_${comm.createdAt}`;
      readIds.add(idKey);
      localStorage.setItem(readStorageKey, JSON.stringify([...readIds]));
    } catch (e) {}

    setCommentsList(prev => prev.map(c => 
      (c.applicationId === comm.applicationId)
        ? { ...c, isUnreplied: false, isRead: true } 
        : c
    ));
    setUnreadCommentsCount(prev => Math.max(0, prev - 1));

    if (onNavigate) onNavigate('applications', null, comm.applicationId);
  };

  useEffect(() => {
    fetchNotifications();
    fetchComments();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchComments();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await API.put('/notifications/read-all').catch(() => {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const getNotificationDestination = (n) => {
    if (!n) return { tab: 'daily-report', subTab: null };

    if (n.targetTab || n.tab) {
      return { tab: n.targetTab || n.tab, subTab: n.targetSubTab || n.subTab || null };
    }

    const titleLower = (n.title || '').toLowerCase();
    const messageLower = (n.message || '').toLowerCase();
    const typeLower = (n.type || n.category || '').toLowerCase();
    const fullText = `${titleLower} ${messageLower} ${typeLower}`;

    if (
      fullText.includes('agency') || 
      fullText.includes('partner') || 
      fullText.includes('registration') || 
      fullText.includes('under review') || 
      fullText.includes('legal document') ||
      typeLower === 'partner' ||
      typeLower === 'agency'
    ) {
      return { tab: 'become-partner', subTab: null };
    }

    if (
      fullText.includes('application') || 
      fullText.includes('cams') || 
      fullText.includes('offer') || 
      fullText.includes('visa') || 
      fullText.includes('filing') ||
      fullText.includes('unreplied') ||
      typeLower === 'application'
    ) {
      return { tab: 'applications', subTab: null };
    }

    if (fullText.includes('student') || typeLower === 'student') {
      return { tab: 'students', subTab: null };
    }

    if (
      fullText.includes('commission') || 
      fullText.includes('claim') || 
      fullText.includes('payout') ||
      typeLower === 'commission'
    ) {
      return { tab: 'commissions', subTab: null };
    }

    if (
      fullText.includes('staff') || 
      fullText.includes('executive') || 
      fullText.includes('bdm') || 
      fullText.includes('hierarchy') ||
      typeLower === 'staff'
    ) {
      return { tab: 'staff', subTab: null };
    }

    if (fullText.includes('university')) {
      return { tab: 'settings', subTab: 'settings-university' };
    }
    if (fullText.includes('course')) {
      return { tab: 'settings', subTab: 'settings-course' };
    }
    if (fullText.includes('intake')) {
      return { tab: 'settings', subTab: 'settings-intake' };
    }
    if (fullText.includes('setting')) {
      return { tab: 'settings', subTab: null };
    }

    if (fullText.includes('todo') || fullText.includes('task')) {
      return { tab: 'todo-list', subTab: null };
    }

    return { tab: 'daily-report', subTab: null };
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      try {
        await API.put(`/notifications/${n._id}/read`).catch(() => {
          API.put('/notifications/read-all').catch(() => {});
        });
      } catch (err) {
        console.warn('Could not mark notification read on backend:', err.message);
      }
    }

    setShowNotifications(false);

    const { tab, subTab } = getNotificationDestination(n);
    const extractedCams = (n.message || '').match(/CAMS-\d+/i)?.[0] || (n.title || '').match(/CAMS-\d+/i)?.[0];
    const targetAppId = n.relatedId || n.applicationId || n.targetAppId || n.appId || extractedCams;

    if (onNavigate) {
      onNavigate(tab, subTab, targetAppId);
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
      crumbs.push('Applications');
      if (activeSubTab === 'study' || !activeSubTab) crumbs.push('New Application');
      if (activeSubTab === 'tourist-package') crumbs.push('Tourist Package');
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

        {/* Right Side: Profile Dropdown, Notifications & Refresh Button */}
        <div className="flex items-center gap-3 relative">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isSyncing}
              title="Refresh Live Data"
              className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-[#D99A1C] text-[10px] font-extrabold text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span className={isSyncing ? "animate-spin text-[#D99A1C]" : "text-[#D99A1C]"}>🔄</span>
              <span className="hidden md:inline">{isSyncing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          {/* Real-time Application Comments Icon & Drawer */}
          <div className="relative">
            <button
              onClick={() => {
                setShowComments(!showComments);
                if (showNotifications) setShowNotifications(false);
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all relative focus:outline-none cursor-pointer"
              title="Application Comments & Messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {unreadCommentsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce shadow">
                  {unreadCommentsCount}
                </span>
              )}
            </button>

            {/* Application Comments Dropdown */}
            {showComments && (
              <>
                <div 
                  onClick={() => setShowComments(false)}
                  className="fixed inset-0 z-10"
                />
                <div className="absolute right-0 top-11 w-80 sm:w-96 bg-[#0A0A0F] border border-slate-800 rounded-2xl shadow-2xl py-3 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-2.5 border-b border-slate-900 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Application Comments</span>
                        {unreadCommentsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white shadow">
                            {unreadCommentsCount} Unreplied
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400">Agent messages & application discussions</p>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-900/60 p-1.5 space-y-1.5">
                    {commentsList.length > 0 ? (
                      commentsList.map((comm, idx) => (
                        <div 
                          key={comm.applicationId || idx} 
                          onClick={() => handleCommentClick(comm)}
                          className={`p-3 rounded-xl transition-all cursor-pointer group ${
                            comm.isUnreplied
                              ? 'bg-blue-950/80 border-l-4 border-l-blue-500 text-blue-100 font-bold shadow-md hover:bg-blue-900'
                              : 'bg-slate-900/50 border-l-4 border-l-emerald-600 text-slate-300 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-extrabold text-white group-hover:text-[#F5B025] transition-colors flex items-center gap-1.5">
                              {comm.isUnreplied && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>}
                              <span>{comm.camsId && !/[0-9a-fA-F]{24}/.test(comm.camsId) ? `${comm.camsId} · ` : ''}{comm.studentName}</span>
                            </h5>
                            <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                              {comm.createdAt ? new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{comm.universityName} - {comm.courseName}</p>
                          <p className="text-[11px] font-semibold mt-1 leading-snug break-words">"{comm.text}"</p>
                          <div className="mt-2 flex items-center justify-between text-[9px]">
                            <span className={`px-2 py-0.5 rounded font-extrabold uppercase ${comm.isUnreplied ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              {comm.isUnreplied ? '💬 Unreplied Message' : '✓ Replied / Read'}
                            </span>
                            <span className="text-[#D99A1C] font-extrabold group-hover:underline">Open Application →</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-xs font-medium">
                        No application comments found.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Real-time Notification Bell Drawer */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (showComments) setShowComments(false);
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all relative focus:outline-none cursor-pointer"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce shadow">
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
                        className="text-[9px] font-extrabold text-[#D99A1C] hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-900/60 p-1.5 space-y-1">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n._id || n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 rounded-xl transition-all cursor-pointer group ${
                            !n.isRead 
                              ? 'bg-[#1E1B4B]/90 border-l-4 border-l-[#D99A1C] text-amber-100 font-extrabold shadow-sm hover:bg-[#2E2A72]' 
                              : 'bg-slate-900/40 border-l-4 border-l-slate-700 text-slate-400 opacity-60 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-white group-hover:text-[#F5B025] transition-colors flex items-center gap-1.5">
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#D99A1C] inline-block shrink-0 animate-pulse"></span>}
                              {n.title}
                            </h5>
                            <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                              {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-medium mt-1 leading-snug">{n.message}</p>
                          <div className="mt-2 flex items-center justify-between text-[9px]">
                            <span className={`px-2 py-0.5 rounded font-extrabold ${!n.isRead ? 'bg-[#D99A1C] text-black' : 'bg-slate-800 text-slate-500'}`}>
                              {!n.isRead ? 'UNREAD' : 'READ'}
                            </span>
                            <span className="text-[#D99A1C] font-extrabold group-hover:underline">Open Page →</span>
                          </div>
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

