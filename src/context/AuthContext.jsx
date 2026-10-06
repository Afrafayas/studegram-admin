import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

// Preset users mapped to organizational hierarchy roles
export const PRESET_USERS = [
  {
    id: 100,
    name: 'Super Admin',
    email: 'superadminluzid@gmail.com',
    password: '123456',
    role: 'Director',
    level: 1,
    country: 'All',
    team: 'All',
    phone: '+1 800 555 0199',
    avatar: 'SA'
  },
  {
    id: 101,
    name: 'Elena Rostova',
    email: 'director@studegram.com',
    password: 'password123',
    role: 'Director',
    level: 1,
    country: 'All', // Global scope
    team: 'All',
    phone: '+44 7911 123456',
    avatar: 'ER'
  },
  {
    id: 102,
    name: 'Marcus Vance',
    email: 'coo@studegram.com',
    password: 'password123',
    role: 'COO',
    level: 2,
    country: 'All', // Global operational scope
    team: 'All',
    phone: '+44 7911 654321',
    avatar: 'MV'
  },
  {
    id: 103,
    name: 'Sarah Jenkins',
    email: 'finance@studegram.com',
    password: 'password123',
    role: 'Finance',
    level: 3,
    country: 'All', // Global financial scope
    team: 'All',
    phone: '+44 7911 987654',
    avatar: 'SJ'
  },
  {
    id: 104,
    name: 'Rajesh Kumar',
    email: 'countryhead.in@studegram.com',
    password: 'password123',
    role: 'Country Head',
    level: 4,
    country: 'India', // Scoped to country
    team: 'All',
    phone: '+91 98765 43210',
    avatar: 'RK'
  },
  {
    id: 105,
    name: 'Amit Patel',
    email: 'bdm.india@studegram.com',
    password: 'password123',
    role: 'BDM',
    level: 5,
    country: 'India',
    team: 'North India', // Scoped to team
    phone: '+91 99988 77766',
    avatar: 'AP'
  },
  {
    id: 106,
    name: 'Rahul Krishnan',
    email: 'rahul@studegram.com',
    password: 'password123',
    role: 'Executive',
    level: 6,
    country: 'India',
    team: 'North India',
    bdm: 'Amit Patel', // Scoped to assigned tasks/BDM
    phone: '+91 99988 87772',
    avatar: 'RK'
  }
];

// Defined permissions for each role
const ROLE_PERMISSIONS = {
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

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('studegram_audit_logs');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 1,
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        userName: 'Elena Rostova',
        userRole: 'Director',
        action: 'SYSTEM_INIT',
        targetType: 'System',
        targetId: 'SYS-001',
        details: 'System initialized with active RBAC hierarchy config.'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        userName: 'Marcus Vance',
        userRole: 'COO',
        action: 'ONBOARD_STAFF',
        targetType: 'Staff',
        targetId: '106',
        details: 'Onboarded Rahul Krishnan as Executive.'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('studegram_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (action, targetType, targetId, details) => {
    if (!currentUser) return;
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId: targetId || 'N/A',
      details: typeof details === 'object' ? JSON.stringify(details) : details
    };
    setAuditLogs(prev => [newLog, ...prev]);
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
        if (['SuperAdmin', 'Director'].includes(roleName)) mappedLevel = 1;
        else if (['Admin', 'COO'].includes(roleName)) mappedLevel = 2;
        else if (['Finance', 'OperationsHead'].includes(roleName)) mappedLevel = 3;
        else if (['Country Head', 'CRE'].includes(roleName)) mappedLevel = 4;
        else if (roleName === 'BDM') mappedLevel = 5;

        const userObj = {
          id: dbUser.id || dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          role: roleName,
          level: mappedLevel,
          country: dbUser.country || 'India',
          team: 'All',
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
    if (!currentUser || !currentSessionId) return;

    const intervalId = setInterval(async () => {
      try {
        await API.post('/activity-logs/heartbeat', {
          sessionId: currentSessionId,
          userId: currentUser.id
        });
      } catch (err) {
        // Silently catch heartbeat error
      }
    }, 45000);

    return () => clearInterval(intervalId);
  }, [currentUser, currentSessionId]);

  // Log specific action to activity timeline
  const logPortalActivity = async (action, title, category = 'General', details = '', page = '') => {
    if (!currentSessionId) return;
    try {
      await API.post('/activity-logs/action', {
        sessionId: currentSessionId,
        action,
        title,
        category,
        details,
        page
      });
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
  };


  // Permission validation with dynamic DB checklist lookup
  const hasPermission = (permissionCode) => {
    if (!currentUser) return false;

    // Direct superadmin / director bypass
    if (['SuperAdmin', 'Director'].includes(currentUser.role)) return true;

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
