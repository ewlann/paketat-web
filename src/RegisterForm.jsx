import React, { useState } from "react";
import QRCode from "qrcode.react";
import axios from "axios";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    emri: "",
    mbiemri: "",
    adresa: "",
    telefoni: "",
    email: "",
  });

  const [qrVisible, setQrVisible] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setQrVisible(false);
  };

  const handleGenerate = async () => {
    try {
      // 1. Dërgo të dhënat te serveri
      const res = await axios.post("http://localhost:3001/register", formData);
      console.log("Serveri ktheu:", res.data.message);

      // 2. Trego QR Code
      setQrVisible(true);
    } catch (error) {
      console.error("Gabim gjatë ruajtjes së paketës:", error);
    }
  };

  const qrData = JSON.stringify(formData);

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>Regjistrimi i Paketës</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="text" name="emri" placeholder="Emri" onChange={handleChange} />
        <input type="text" name="mbiemri" placeholder="Mbiemri" onChange={handleChange} />
        <input type="text" name="adresa" placeholder="Adresa" onChange={handleChange} style={{ width: "100%" }} />
        <input type="text" name="telefoni" placeholder="Nr Tel" onChange={handleChange} style={{ width: "100%" }} />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} style={{ width: "100%" }} />
      </div>

      <button onClick={handleGenerate} style={{ marginTop: 20, padding: "10px 20px", background: "black", color: "white", border: "none" }}>
        Gjenero QR Code
      </button>

      {qrVisible && (
        <div style={{ marginTop: 20 }}>
          <QRCode value={qrData} size={180} />
        </div>
      )}
    </div>
  );
}
