// src/lib/formato.js
//
// Dinero, fechas e ids. Salio de App.jsx en la Fase 0 del corte por modulos (5 oct 2026): son
// helpers que usan practicamente todas las pantallas, y mientras vivieran dentro del archivo
// grande no se podia extraer ningun modulo sin arrastrarlo completo.
//
// Regla de este archivo: funciones PURAS, sin React, sin Supabase y sin estado. Si algo necesita
// datos de la cuenta o un hook, no va aqui.

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
export const fmtMoney = (n) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const horaActualHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
export const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date(todayISO())) / 86400000);

export const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const MESES_CORTO_FECHA = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
// "2026-03-01" -> "01 Mar 2026". Se parte la cadena a mano (sin new Date) porque construir una
// fecha desde un ISO sin hora la interpreta en UTC y en México puede mostrar el día anterior.
export const fmtFechaCorta = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d} ${MESES_CORTO_FECHA[Number(m) - 1] || m} ${y}`;
};

// Date -> "2026-03-01" en hora LOCAL (lo contrario de toISOString, que pasa a UTC y en México
// puede devolver el día anterior).
export function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---------- Divisas ----------
   La cuenta lleva UNA moneda base (MXN) y todo lo que se suma, reporta o compara usa el monto ya
   convertido y CONGELADO en el momento de capturar (finanzas.monto_base). Un movimiento de hace
   dos años no cambia de valor porque hoy se moviera el dólar: eso fue lo que costó ese día.
   Las monedas son las que cubre la API de tipos de cambio (lista del BCE); para cualquier otra
   se captura el tipo de cambio a mano, que de todos modos siempre se puede corregir. */
export const MONEDA_BASE = "MXN";
export const MONEDAS = [
  { codigo: "MXN", nombre: "Peso mexicano" },
  { codigo: "USD", nombre: "Dólar estadounidense" },
  { codigo: "EUR", nombre: "Euro" },
  { codigo: "CAD", nombre: "Dólar canadiense" },
  { codigo: "GBP", nombre: "Libra esterlina" },
  { codigo: "BRL", nombre: "Real brasileño" },
  { codigo: "JPY", nombre: "Yen japonés" },
  { codigo: "CHF", nombre: "Franco suizo" },
];

// El monto con el que se hacen TODAS las cuentas. El `?? monto` no es decoración: los
// movimientos viejos y los que crean las sincronizaciones automáticas (eventos, activos) no
// traen monto_base, y esos siempre son MXN, donde monto y monto base son el mismo número.
export const montoBaseDe = (f) => Number(f?.montoBase ?? f?.monto) || 0;

// Formatea un importe en su moneda original, para enseñar "USD 1,200" junto al equivalente.
export const fmtMonedaOriginal = (monto, moneda) => {
  const n = Number(monto) || 0;
  try { return n.toLocaleString("es-MX", { style: "currency", currency: moneda || MONEDA_BASE }); }
  catch { return `${n.toLocaleString("es-MX")} ${moneda || ""}`.trim(); }
};
