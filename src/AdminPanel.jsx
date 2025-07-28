import React, { useEffect, useState } from 'react';

/**
 * Admin panel for listing, deleting and exporting packages. Requires the
 * user to be authenticated and have the admin role. Uses the JWT token
 * stored in localStorage to authorize requests.
 */
const AdminPanel = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');

  const fetchPackages = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/packages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      } else {
        const err = await res.json();
        alert(err.error || 'Gabim gjatë marrjes së pakove');
      }
    } catch (err) {
      alert('Gabim rrjeti: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!window.confirm('Jeni i sigurt që doni të fshini këtë pako?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPackages((pkgs) => pkgs.filter((p) => p._id !== id));
      } else {
        alert(data.error || 'Gabim gjatë fshirjes');
      }
    } catch (err) {
      alert('Gabim rrjeti: ' + err.message);
    }
  };

  const handleEdit = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const newStatus = prompt('Vendosni statusin e ri për paketën (p.sh. Dërguar, Pranuar):');
    if (!newStatus) return;
    try {
      const res = await fetch(`http://localhost:5000/api/packages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setPackages((pkgs) => pkgs.map((p) => (p._id === id ? data : p)));
      } else {
        alert(data.error || 'Gabim gjatë editimit');
      }
    } catch (err) {
      alert('Gabim rrjeti: ' + err.message);
    }
  };

  const handleReport = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!month) {
      alert('Ju lutem zgjidhni një muaj');
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/report?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${month}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const err = await res.json();
        alert(err.error || 'Gabim gjatë gjenerimit të raportit');
      }
    } catch (err) {
      alert('Gabim rrjeti: ' + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Paneli i Administratorit</h2>
      <div style={{ marginBottom: 20 }}>
        <label>
          Raporti mujor:
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button onClick={handleReport} style={{ marginLeft: 10 }}>Shkarko raport</button>
      </div>
      {loading ? (
        <p>Duke u ngarkuar...</p>
      ) : (
        <table border="1" cellPadding="5" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Emri</th>
              <th>Mbiemri</th>
              <th>Adresa</th>
              <th>Qyteti</th>
              <th>Telefoni</th>
              <th>Email dërgues</th>
              <th>Email marrës</th>
              <th>Data</th>
              <th>Veprime</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p._id}>
                <td>{p._id}</td>
                <td>{p.emri}</td>
                <td>{p.mbiemri}</td>
                <td>{p.adresa}</td>
                <td>{p.qyteti}</td>
                <td>{p.telefoni}</td>
                <td>{p.emailSender}</td>
                <td>{p.emailReceiver}</td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleEdit(p._id)}>Edito</button>
                  <button onClick={() => handleDelete(p._id)} style={{ marginLeft: 5 }}>Fshij</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPanel;