import React, { useState } from "react";
import QRCode from "react-qr-code";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    emri: "",
    mbiemri: "",
    adresa: "",
    qyteti: "",
    telefoni: "",
    emailSender: "",
    emailReceiver: "",
  });

  const [qrVisible, setQrVisible] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setQrVisible(false);
  };

  const handleGenerate = () => {
    setQrVisible(true);
  };

  // Generate PDF after saving. Uses jsPDF and html2canvas to create a simple
  // document with the package details and a QR code containing the package ID.
  const generatePdf = async (pkgId) => {
    // Dynamic imports to reduce bundle size and load only when needed
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    // Build a container with the package details
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.innerHTML = `
      <h2>Detajet e Paketës</h2>
      <p><strong>Emri:</strong> ${formData.emri}</p>
      <p><strong>Mbiemri:</strong> ${formData.mbiemri}</p>
      <p><strong>Adresa:</strong> ${formData.adresa}</p>
      <p><strong>Qyteti:</strong> ${formData.qyteti}</p>
      <p><strong>Telefoni:</strong> ${formData.telefoni}</p>
      <p><strong>Email Dërgues:</strong> ${formData.emailSender}</p>
      <p><strong>Email Marrës:</strong> ${formData.emailReceiver}</p>
      <div id="qrForPdf"></div>
    `;
    document.body.appendChild(container);
    // Note: we intentionally omit generating a QR code in the PDF on the
    // client side because the qrcode library is not available in the
    // frontend build. The server attaches a PDF with a QR code via email.
    // Convert DOM to canvas
    const pdfCanvas = await html2canvas(container);
    const imgData = pdfCanvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth;
    const imgHeight = (pdfCanvas.height * imgWidth) / pdfCanvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`paketa_${pkgId}.pdf`);
    document.body.removeChild(container);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        result = { error: 'Përgjigjja nuk ishte në format JSON' };
      }
      if (response.ok && result.package && result.package._id) {
        alert('✅ Paketa u ruajt me sukses!');
        // Generate and download PDF locally
        await generatePdf(result.package._id);
        setQrVisible(true);
      } else {
        alert('❌ Gabim gjatë ruajtjes: ' + (result.error || '')); 
      }
    } catch (error) {
      alert('❌ Gabim rrjeti: ' + error.message);
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
        <input type="email" name="emailSender" placeholder="Email i dërguesit" onChange={handleChange} />
        <input type="email" name="emailReceiver" placeholder="Email i marrësit" onChange={handleChange} />
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
