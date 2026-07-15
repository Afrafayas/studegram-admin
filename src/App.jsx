import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminPortal from './AdminPortal';

function AppContent() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return <AdminPortal onLogout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
