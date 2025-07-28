import React, { useState } from "react";
import QRCode from "react-qr-code";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    emri: "",
    mbiemri: "",
    adresa: "",
    qyteti: "",
    telefoni: "",
    email: "",
  });

  const [qrVisible, setQrVisible] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setQrVisible(false);
  };

  const handleGenerate = () => {
    setQrVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        result = { error: "Përgjigjja nuk ishte në format JSON" };
      }

      if (response.ok) {
        alert("✅ Paketa u ruajt me sukses!");
      } else {
        alert("❌ Gabim gjatë ruajtjes: " + result.error);
      }
    } catch (error) {
      alert("❌ Gabim rrjeti: " + error.message);
    }
  };

  const qrData = JSON.stringify(formData);

  return (
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <h2>📦 Regjistrimi i Paketës</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "auto" }}>
        <input type="text" name="emri" placeholder="Emri" onChange={handleChange} />
        <input type="text" name="mbiemri" placeholder="Mbiemri" onChange={handleChange} />
        <input type="text" name="adresa" placeholder="Adresa" onChange={handleChange} />
        <input type="text" name="qyteti" placeholder="Qyteti" onChange={handleChange} />
        <input type="text" name="telefoni" placeholder="Nr Telefoni" onChange={handleChange} />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={handleGenerate}
          style={{ padding: "10px 20px", background: "black", color: "white", border: "none" }}
        >
          Gjenero QR Code
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          onClick={handleSubmit}
          style={{ padding: "10px 20px", background: "green", color: "white", border: "none" }}
        >
          Ruaj Paketën
        </button>
      </div>

      {qrVisible && (
        <div style={{ marginTop: 20 }}>
          <QRCode value={qrData} size={150} />
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
