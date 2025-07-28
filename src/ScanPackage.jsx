import React, { useEffect, useState } from 'react';

/**
 * Component that uses the html5-qrcode library (loaded from a CDN) to scan
 * QR codes via the webcam. When a QR code is successfully scanned, it
 * expects the code to contain a JSON string with an `id` field. It then
 * fetches the corresponding package from the backend using the stored
 * token and displays the details.
 */
const ScanPackage = () => {
  const [scanned, setScanned] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Dynamically load the html5-qrcode script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.7/dist/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => {
      if (!window.Html5QrcodeScanner) {
        setError('Biblioteka e skanimit nuk u ngarkua');
        return;
      }
      const onScanSuccess = async (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.id) {
            setError(null);
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/packages/${data.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const pkg = await res.json();
              setScanned(pkg);
            } else {
              const err = await res.json();
              setError(err.error || 'Nuk u gjet pako');
            }
          } else {
            setError('QR Code nuk përmban id të paketës');
          }
        } catch (e) {
          setError('Formati i QR Code nuk është i vlefshëm');
        }
      };
      const onScanFailure = (err) => {
        // you can log scanning errors but we ignore to avoid noise
      };
      const scanner = new window.Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanFailure);
    };
    document.body.appendChild(script);
    return () => {
      // Cleanup: remove script and scanner container
      document.body.removeChild(script);
      const elem = document.getElementById('qr-reader');
      if (elem) elem.innerHTML = '';
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Skanoni QR Code për Paketën</h2>
      <div id="qr-reader" style={{ width: 300, marginBottom: 20 }}></div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {scanned && (
        <div style={{ border: '1px solid #ccc', padding: 10 }}>
          <h3>Detajet e Paketës</h3>
          <p><strong>ID:</strong> {scanned._id}</p>
          <p><strong>Emri:</strong> {scanned.emri}</p>
          <p><strong>Mbiemri:</strong> {scanned.mbiemri}</p>
          <p><strong>Adresa:</strong> {scanned.adresa}</p>
          <p><strong>Qyteti:</strong> {scanned.qyteti}</p>
          <p><strong>Telefoni:</strong> {scanned.telefoni}</p>
          <p><strong>Email dërgues:</strong> {scanned.emailSender}</p>
          <p><strong>Email marrës:</strong> {scanned.emailReceiver}</p>
          <p><strong>Status:</strong> {scanned.status}</p>
        </div>
      )}
    </div>
  );
};

export default ScanPackage;