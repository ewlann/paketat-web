import React from 'react';
import RegisterForm from './RegisterForm';

export default function App() {
  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>Regjistrimi i Paketës</h1>
      <RegisterForm />
    </div>
  );
}
