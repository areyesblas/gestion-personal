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
//
// Auto-actualización: cuando subimos una versión nueva, el navegador descarga el sw.js nuevo en
// segundo plano pero por default lo deja "esperando" hasta que cierres TODAS las pestañas/la app.
// En una PWA instalada eso casi nunca pasa sola (uno no la "cierra", solo la manda a segundo
// plano) — así se quedaba viendo para siempre el index.html viejo, con scripts de un build que
// ya no existe en el servidor (pantalla en blanco). Aquí forzamos que la versión nueva tome
// control en cuanto esté lista, y recargamos la página una sola vez para que cargue limpio.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registro) => {
      // Ya había un service worker viejo esperando (de una visita anterior) — actívalo ya.
      if (registro.waiting) registro.waiting.postMessage({ tipo: "arkeyone-skip-waiting" });

      // Se detectó una versión nueva mientras la app estaba abierta: en cuanto termine de
      // instalarse, dile que tome control inmediatamente (no espere a que cierres todo).
      registro.addEventListener("updatefound", () => {
        const nuevo = registro.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && registro.waiting) {
            registro.waiting.postMessage({ tipo: "arkeyone-skip-waiting" });
          }
        });
      });

      // Revisa si hay una versión nueva cada vez que la app vuelve a primer plano (abrir el
      // ícono, volver de otra app) — así no depende de que el sistema decida revisar solo.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registro.update();
      });
    }).catch((err) => {
      console.warn("No se pudo registrar el service worker:", err);
    });

    // Cuando el nuevo service worker toma control, recarga una sola vez para que la página
    // cargue con la versión nueva de arriba a abajo (evita mezclar JS viejo con SW nuevo).
    let yaRecargo = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (yaRecargo) return;
      yaRecargo = true;
      window.location.reload();
    });
  });
}
