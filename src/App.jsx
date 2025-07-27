import React, { useState } from "react";
import QRCode from "qrcode.react";

export default function App() {
  const [formData, setFormData] = useState({
    emri: "",
    mbiemri: "",
    adresa: "",
    telefoni: "",
    email: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const qrData = JSON.stringify(formData);

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>Regjistrimi i Paketës</h1>
      <div style={{ display: "flex", gap: 10 }}>
        <input type="text" name="emri" placeholder="Emri" onChange={handleChange} />
        <input type="text" name="mbiemri" placeholder="Mbiemri" onChange={handleChange} />
      </div>
      <input type="text" name="adresa" placeholder="Adresa" onChange={handleChange} style={{ width: "100%", marginTop: 10 }} />
      <input type="text" name="telefoni" placeholder="Nr Telefoni" onChange={handleChange} style={{ width: "100%", marginTop: 10 }} />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} style={{ width: "100%", marginTop: 10 }} />
      <div style={{ marginTop: 20 }}>
        <QRCode value={qrData} size={180} />
      </div>
    </div>
  );
}
