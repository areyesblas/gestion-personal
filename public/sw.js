// Service Worker de ARKEYONE — solo existe para permitir instalación como PWA
// y suavizar la carga de la cáscara estática de la app (JS/CSS/íconos).
//
// A propósito NO cachea datos de Supabase ni respuestas de API: la app es
// "Online-First" (decisión del documento maestro), así que cualquier petición
// que no sea un archivo estático propio simplemente pasa de largo a la red.
//
// Sube este número cada vez que cambie la lógica del propio Service Worker
// (no hace falta tocarlo por cambios normales del código de la app).
const CACHE_VERSION = "arkeyone-sw-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Por si en el futuro se quita el skipWaiting() automático de arriba: main.jsx puede pedirle
// explícitamente a un service worker en espera que tome control ya, sin esperar a que se
// cierren todas las pestañas/la PWA (ver comentario largo en main.jsx sobre por qué importa).
self.addEventListener("message", (event) => {
  if (event.data?.tipo === "arkeyone-skip-waiting") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo intervenimos peticiones GET de nuestro propio origen.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const url = new URL(request.url);

  // Navegación (recargar la app / abrirla desde el ícono): red primero, y si no hay
  // conexión, se responde con lo último cacheado de index.html si existe.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(request);
          const cache = await caches.open(CACHE_VERSION);
          cache.put("/index.html", resp.clone());
          return resp;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const cached = await cache.match("/index.html");
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Archivos estáticos generados por el build (JS/CSS con hash) e íconos:
  // cache-first, ya que su nombre cambia con cada build (no hay riesgo de servir viejo).
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          cache.put(request, resp.clone());
          return resp;
        } catch {
          return Response.error();
        }
      })()
    );
  }

  // Todo lo demás (Supabase, Resend, cualquier API) no se toca: va directo a la red.
});

// --- Web Push ---------------------------------------------------------------
// El payload que manda nuestra Edge Function siempre es JSON:
// { titulo, mensaje, url, tag, recursoTabla, recursoId }
self.addEventListener("push", (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch { datos = {}; }

  const titulo = datos.titulo || "ARKEYONE";
  const opciones = {
    body: datos.mensaje || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: datos.tag || undefined, // notificaciones con el mismo tag se reemplazan en vez de amontonarse
    data: { url: datos.url || "/", recordatorioId: datos.recordatorioId || null },
    vibrate: [80, 40, 80],
    // Botones de acción rápida (ej. medicamentos: "Tomado" / "Posponer"). Chrome/Android los
    // soportan; iOS Safari los ignora silenciosamente y solo deja abrir la notificación al tocarla
    // — por eso el "url" de arriba siempre debe llevar a una pantalla útil por sí sola.
    actions: Array.isArray(datos.actions) ? datos.actions.slice(0, 2) : undefined,
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// Al tocar la notificación (o uno de sus botones de acción): si ya hay una pestaña/ventana de
// ARKEYONE abierta, la enfoca y le manda a dónde ir; si no hay ninguna, abre una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const recordatorioId = event.notification.data?.recordatorioId;
  let url = event.notification.data?.url || "/";

  // event.action viene vacío ("") si tocaron el cuerpo de la notificación (no un botón).
  if (event.action && recordatorioId) {
    url = `/?accion=${encodeURIComponent(event.action)}&recordatorio=${encodeURIComponent(recordatorioId)}`;
  }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ tipo: "arkeyone-deep-link", url });
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })()
  );
});
