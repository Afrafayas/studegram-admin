import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Preset users mapped to organizational hierarchy roles
export const PRESET_USERS = [
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

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const token = resData.token;
        const dbUser = resData.data;

        // Map backend roles to frontend preset user roles
        let mappedRole = 'Executive';
        let mappedLevel = 6;
        let mappedCountry = 'India';
        let mappedTeam = 'North India';

        if (dbUser.role === 'SuperAdmin') {
          mappedRole = 'Director';
          mappedLevel = 1;
          mappedCountry = 'All';
          mappedTeam = 'All';
        } else if (dbUser.role === 'Admin') {
          mappedRole = 'COO';
          mappedLevel = 2;
          mappedCountry = 'All';
          mappedTeam = 'All';
        } else if (dbUser.role === 'Manager') {
          if (dbUser.email.includes('finance')) {
            mappedRole = 'Finance';
            mappedLevel = 3;
            mappedCountry = 'All';
            mappedTeam = 'All';
          } else {
            mappedRole = 'Country Head';
            mappedLevel = 4;
            mappedCountry = 'India';
            mappedTeam = 'All';
          }
        } else if (dbUser.role === 'Executive') {
          if (dbUser.email.includes('bdm')) {
            mappedRole = 'BDM';
            mappedLevel = 5;
            mappedCountry = 'India';
            mappedTeam = 'North India';
          } else {
            mappedRole = 'Executive';
            mappedLevel = 6;
            mappedCountry = 'India';
            mappedTeam = 'North India';
          }
        }

        const userObj = {
          id: dbUser.id || dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          role: mappedRole,
          level: mappedLevel,
          country: mappedCountry,
          team: mappedTeam,
          phone: dbUser.phone || '',
          avatar: dbUser.name ? dbUser.name.split(' ').map(n=>n[0]).join('') : 'U'
        };

        setCurrentUser(userObj);
        localStorage.setItem('studegram_user', JSON.stringify(userObj));
        localStorage.setItem('admin_token', token);

        const newLog = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userName: userObj.name,
          userRole: userObj.role,
          action: 'LOGIN_SUCCESS',
          targetType: 'Session',
          targetId: 'SYS-AUTH',
          details: `Successful login as ${userObj.role} via API (Scope: ${userObj.country}/${userObj.team})`
        };
        setAuditLogs(prev => [newLog, ...prev]);
        return { success: true };
      } else {
        throw new Error(resData.message || 'Invalid credentials');
      }
    } catch (err) {
      console.warn('API login failed, falling back to preset local credentials:', err.message);
      
      const user = PRESET_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('studegram_user', JSON.stringify(user));
        localStorage.setItem('admin_token', 'mock-admin-token-12345');
        
        const newLog = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userName: user.name,
          userRole: user.role,
          action: 'LOGIN_SUCCESS',
          targetType: 'Session',
          targetId: 'SYS-AUTH',
          details: `Successful login as ${user.role} via local mock (Scope: ${user.country}/${user.team})`
        };
        setAuditLogs(prev => [newLog, ...prev]);
        return { success: true };
      }
      return { success: false, message: err.message || 'Invalid email or password' };
    }
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('LOGOUT', 'Session', 'SYS-AUTH', `User ${currentUser.name} signed out.`);
    }
    setCurrentUser(null);
    localStorage.removeItem('studegram_user');
    localStorage.removeItem('admin_token');
  };

  // Permission validation
  const hasPermission = (permissionCode) => {
    if (!currentUser) return false;
    const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
    if (permissions.includes('*')) return true;
    return permissions.includes(permissionCode);
  };

  // Scope validation
  const checkScope = (entityCountry, entityBdm, entityExecutiveId) => {
    if (!currentUser) return false;
    
    // Director, COO, Finance have Global scopes (except Finance sees only financials)
    if (['Director', 'COO', 'Finance'].includes(currentUser.role)) {
      return true;
    }

    // Country Head scope check
    if (currentUser.role === 'Country Head') {
      return entityCountry === currentUser.country;
    }

    // BDM scope check
    if (currentUser.role === 'BDM') {
      return entityCountry === currentUser.country && entityBdm === currentUser.name;
    }

    // Executive scope check
    if (currentUser.role === 'Executive') {
      return entityExecutiveId === currentUser.id || entityExecutiveId === currentUser.name;
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
      addAuditLog
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
