import React, { useState } from 'react';

/**
 * Simple login form for operators/admins. It posts credentials to the
 * backend and stores the received JWT token in localStorage. After
 * successful login it invokes onLogin callback with the decoded role.
 */
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const parseJwt = (token) => {
    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      return payload;
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        const payload = parseJwt(data.token);
        const role = payload?.role || 'operator';
        onLogin(role);
      } else {
        alert(data.error || 'Gabim gjatë loginit');
      }
    } catch (err) {
      alert('Gabim rrjeti: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2 style={{ textAlign: 'center' }}>Identifikohu</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: 'blue', color: 'white', border: 'none' }}>
          {loading ? 'Duke u futur...' : 'Hyr' }
        </button>
      </form>
    </div>
  );
};

export default Login;