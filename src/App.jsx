import React, { useState, useEffect } from 'react';
import RegisterForm from './RegisterForm';
import Login from './Login';
import AdminPanel from './AdminPanel';
import ScanPackage from './ScanPackage';

export default function App() {
  const [page, setPage] = useState('register');
  const [role, setRole] = useState(null);

  useEffect(() => {
    // On load, check if token exists and decode role
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        setRole(payload.role);
        if (payload.role === 'admin') setPage('admin');
      } catch (e) {
        // ignore decode errors
      }
    }
  }, []);

  const handleLogin = (roleFromLogin) => {
    setRole(roleFromLogin);
    if (roleFromLogin === 'admin') {
      setPage('admin');
    } else {
      setPage('register');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setRole(null);
    setPage('register');
  };

  return (
    <div style={{ maxWidth: 1000, margin: 'auto', padding: 20 }}>
      <nav style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <button onClick={() => setPage('register')}>Regjistro Paketë</button>
        {role === 'admin' && <button onClick={() => setPage('admin')}>Paneli i adminit</button>}
        {role && <button onClick={() => setPage('scan')}>Skanim</button>}
        {role ? (
          <button onClick={handleLogout}>Dil</button>
        ) : (
          <button onClick={() => setPage('login')}>Hyr</button>
        )}
      </nav>
      {page === 'register' && (
        <>
          <h1 style={{ textAlign: 'center' }}>Regjistrimi i Paketës</h1>
          <RegisterForm />
        </>
      )}
      {page === 'login' && <Login onLogin={handleLogin} />}
      {page === 'admin' && role === 'admin' && <AdminPanel />}
      {page === 'scan' && role && <ScanPackage />}
    </div>
  );
}
