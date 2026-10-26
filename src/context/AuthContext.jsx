import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

// Defined permissions for each role
const ROLE_PERMISSIONS = {
  'SuperAdmin': ['*'],
  'Super Admin': ['*'],
  'Admin': ['*'],
  'Director': ['*'], // Access to all actions
  'COO': [
    'dashboard:view', 'reports:view', 'partners:view', 'partners:manage',
    'students:view', 'students:edit', 'students:approve',
    'staff:view', 'staff:manage', 'settings:view', 'commissions:view'
  ],
  'Finance': [
    'dashboard:view_financial', 'partners:view', 'commissions:view', 'commissions:manage', 'commissions:export'
  ],
  'Country Head': [
    'dashboard:view', 'reports:view', 'partners:view', 'partners:manage',
    'students:view', 'students:edit', 'students:approve',
    'staff:view', 'staff:manage', 'commissions:view'
  ],
  'BDM': [
    'dashboard:view', 'partners:view', 'students:view', 'students:edit', 'tasks:assign'
  ],
  'Executive': [
    'dashboard:view', 'students:view', 'students:update_status', 'students:upload_docs'
  ]
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('studegram_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (!currentUser || !localStorage.getItem('admin_token')) return;
    let active = true;
    API.get('/activity-logs', { params: { limit: 100 } }).then(response => {
      if (!active || !response.data?.success || !Array.isArray(response.data.data)) return;
      const records = response.data.data.flatMap(session => (session.activities || []).map(activity => ({
        id: activity._id,
        timestamp: activity.timestamp,
        userName: session.userName,
        userRole: session.userRole,
        action: activity.action,
        details: activity.details
      })));
      setAuditLogs(records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }).catch(error => console.warn('Unable to load audit records:', error.message));
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('studegram_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (action, targetType, targetId, details) => {
    if (!currentUser) return;
    const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId: targetId || 'N/A',
      details: detailStr
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Automatically dispatch to live staff activity logs endpoint
    const isApp = targetType === 'Application' || targetType === 'Student';
    const category = isApp ? 'Application' : 'System';
    const title = String(action || 'Activity').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    logPortalActivity(action, title, category, detailStr, typeof window !== 'undefined' ? window.location.pathname : '');
  };

  const [dbRoles, setDbRoles] = useState([]);

  const fetchRoles = async () => {
    try {
      const res = await API.get('/roles');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDbRoles(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch DB roles:', err.message);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email, password });
      const resData = response.data;
      if (resData?.success) {
        const token = resData.token;
        const dbUser = resData.data;

        const roleName = dbUser.role || 'Executive';
        let mappedLevel = 6;
        if (['SuperAdmin', 'Super Admin', 'Director', 'Admin'].includes(roleName)) mappedLevel = 1;
        else if (['COO'].includes(roleName)) mappedLevel = 2;
        else if (['Finance', 'OperationsHead'].includes(roleName)) mappedLevel = 3;
        else if (['Country Head', 'CRE'].includes(roleName)) mappedLevel = 4;
        else if (roleName === 'BDM') mappedLevel = 5;

        const userObj = {
          id: dbUser.id || dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          role: roleName,
          level: mappedLevel,
          country: dbUser.country || dbUser.countries?.[0] || '',
          team: dbUser.team || '',
          phone: dbUser.phone || '',
          avatar: dbUser.name ? dbUser.name.split(' ').map(n=>n[0]).join('') : 'U'
        };

        setCurrentUser(userObj);
        localStorage.setItem('studegram_user', JSON.stringify(userObj));
        localStorage.setItem('admin_token', token);

        let activeSessionId = resData.sessionId;
        if (!activeSessionId) {
          try {
            const sessRes = await API.post('/activity-logs/login', {
              userId: userObj.id,
              userEmail: userObj.email,
              userName: userObj.name,
              userRole: userObj.role,
              userPhone: userObj.phone,
              userCountry: userObj.country
            });
            if (sessRes.data?.sessionId) {
              activeSessionId = sessRes.data.sessionId;
            }
          } catch (e) {
            console.warn('Could not record activity login:', e.message);
          }
        }

        if (activeSessionId) {
          setCurrentSessionId(activeSessionId);
          localStorage.setItem('admin_session_id', activeSessionId);
        }

        const newLog = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userName: userObj.name,
          userRole: userObj.role,
          action: 'LOGIN_SUCCESS',
          targetType: 'Session',
          targetId: 'SYS-AUTH',
          details: `Successful login as ${userObj.role} via API`
        };
        setAuditLogs(prev => [newLog, ...prev]);
        return { success: true };
      } else {
        return { success: false, message: resData?.message || 'Invalid credentials' };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Invalid email or password';
      console.warn('API login failed:', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return localStorage.getItem('admin_session_id') || null;
  });

  // Periodic heartbeat every 45 seconds to keep portal time spent updated accurately in DB
  useEffect(() => {
    if (!currentUser) return;

    const sendHeartbeat = async () => {
      try {
        const sessId = currentSessionId || localStorage.getItem('admin_session_id');
        const res = await API.post('/activity-logs/heartbeat', {
          sessionId: sessId || undefined,
          userId: currentUser.id || currentUser._id
        });
        if (res.data?.sessionId && (!currentSessionId || currentSessionId !== res.data.sessionId)) {
          setCurrentSessionId(res.data.sessionId);
          localStorage.setItem('admin_session_id', res.data.sessionId);
        }
      } catch (err) {
        // Silently catch heartbeat error
      }
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 45000);

    return () => clearInterval(intervalId);
  }, [currentUser, currentSessionId]);

  // Log specific action to activity timeline
  const logPortalActivity = async (action, title, category = 'General', details = '', page = '') => {
    try {
      const sessId = currentSessionId || localStorage.getItem('admin_session_id');
      const res = await API.post('/activity-logs/action', {
        sessionId: sessId || undefined,
        action,
        title,
        category,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
        page: page || (typeof window !== 'undefined' ? window.location.pathname : '')
      });
      if (res.data?.data?._id && (!currentSessionId || currentSessionId !== res.data.data._id)) {
        setCurrentSessionId(res.data.data._id);
        localStorage.setItem('admin_session_id', res.data.data._id);
      }
    } catch (err) {
      // Ignore non-fatal action logging failure
    }
  };

  const logout = async () => {
    const sessId = currentSessionId || localStorage.getItem('admin_session_id');
    if (sessId || currentUser) {
      try {
        await API.post('/activity-logs/logout', {
          sessionId: sessId,
          userId: currentUser?.id,
          userEmail: currentUser?.email
        });
      } catch (e) {
        console.warn('Activity logout API error:', e.message);
      }
    }

    if (currentUser) {
      addAuditLog('LOGOUT', 'Session', 'SYS-AUTH', `User ${currentUser.name} signed out.`);
    }

    setCurrentUser(null);
    setCurrentSessionId(null);
    localStorage.removeItem('studegram_user');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_session_id');
    localStorage.removeItem('studegram_admin_active_tab');
    localStorage.removeItem('studegram_admin_active_subtab');
    localStorage.removeItem('studegram_admin_single_view_app_id');
    localStorage.removeItem('studegram_admin_single_view_app');
    localStorage.removeItem('studegram_admin_single_view_partner_id');
    localStorage.removeItem('studegram_admin_single_view_partner');
    localStorage.removeItem('studegram_admin_partner_subview');
    localStorage.removeItem('studegram_admin_selected_staff_id');
    localStorage.removeItem('studegram_admin_staff_logs_subview');
    localStorage.removeItem('studegram_admin_expanded_student_id');
  };


  // Permission validation with dynamic DB checklist lookup
  const hasPermission = (permissionCode) => {
    if (!currentUser) return false;

    // Direct superadmin / director / admin bypass
    if (['SuperAdmin', 'Super Admin', 'Admin', 'Director'].includes(currentUser.role)) return true;

    // Check dynamic DB role permissions
    const dbRoleMatch = dbRoles.find(r => r.name === currentUser.role || r.displayName === currentUser.role);
    if (dbRoleMatch && Array.isArray(dbRoleMatch.permissions)) {
      if (dbRoleMatch.permissions.includes('*')) return true;
      if (dbRoleMatch.permissions.includes(permissionCode)) return true;
    }

    // Fallback preset checks
    const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
    if (permissions.includes('*')) return true;
    return permissions.includes(permissionCode);
  };

  // Scope validation
  const checkScope = (entityCountry, entityBdm, entityExecutiveId) => {
    if (!currentUser) return false;
    
    const role = (currentUser.role || '').trim();

    // SuperAdmin, Director, COO, Finance, OperationsHead, CRE have Global scopes
    if (['SuperAdmin', 'Super Admin', 'Director', 'Admin', 'COO', 'Finance', 'OperationsHead', 'CRE'].includes(role)) {
      return true;
    }

    // CRE / Country Head scope check
    if (['CRE', 'Country Head'].includes(role)) {
      if (!currentUser.country || currentUser.country === 'All' || currentUser.country === 'Global') return true;
      return (entityCountry || 'India').toLowerCase() === (currentUser.country || 'India').toLowerCase();
    }

    // BDM scope check
    if (role === 'BDM') {
      if (!currentUser.country || currentUser.country === 'All' || currentUser.country === 'Global') return true;
      return (entityCountry || 'India').toLowerCase() === (currentUser.country || 'India').toLowerCase() && (entityBdm === currentUser.name || !entityBdm || entityBdm === 'Direct');
    }

    // Executive scope check
    if (role === 'Executive') {
      if (!currentUser.country || currentUser.country === 'All' || currentUser.country === 'Global') return true;
      return !entityExecutiveId || entityExecutiveId === currentUser.id || entityExecutiveId === currentUser.name || (entityCountry || 'India').toLowerCase() === (currentUser.country || 'India').toLowerCase();
    }

    return false;
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      logout,
      hasPermission,
      checkScope,
      auditLogs,
      addAuditLog,
      currentSessionId,
      logPortalActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
