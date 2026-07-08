import React, { useState } from 'react';
import Login from './pages/Login';
import AdminPortal from './AdminPortal';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return <AdminPortal onLogout={handleLogout} />;
}
