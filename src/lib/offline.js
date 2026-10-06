// src/lib/offline.js
//
// Cola de operaciones hechas sin conexion, guardada en localStorage para que sobreviva a un
// cierre de la app. Salio de App.jsx en la Fase 2 (5 oct 2026): la usan tanto AppLoggedIn (que
// reintenta al volver la conexion) como los modulos perezosos, asi que no podia vivir dentro de
// ninguno de los dos.
//
// localStorage puede fallar o venir vacio (ventana privada, datos bloqueados), por eso cada
// lectura y cada escritura van en su try: la app tiene que funcionar igual sin cola.

import { uid } from "./formato";

const CLAVE_PENDIENTES_OFFLINE = "arkeyone_pendientes_offline";
export function leerPendientesOffline() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PENDIENTES_OFFLINE) || "[]"); }
  catch { return []; }
}
export function guardarPendientesOffline(lista) {
  try { localStorage.setItem(CLAVE_PENDIENTES_OFFLINE, JSON.stringify(lista)); } catch {}
}
export function agregarPendienteOffline({ ownerId, operacion, key, targetIds, payload, descripcion }) {
  const lista = leerPendientesOffline();
  lista.push({ id: uid(), ownerId, operacion, key, targetIds: targetIds || null, payload: payload || null, descripcion, creadoEn: new Date().toISOString() });
  guardarPendientesOffline(lista);
}
export function quitarPendientesOffline(ids) {
  guardarPendientesOffline(leerPendientesOffline().filter((p) => !ids.includes(p.id)));
}
