import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA: registrar el service worker (solo en producción — en dev con Vite estorba el HMR).
// Si falla (navegador viejo, iframe, etc.) la app sigue funcionando normal sin instalación.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("No se pudo registrar el service worker:", err);
    });
  });
}
