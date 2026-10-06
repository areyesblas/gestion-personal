// src/lib/finanzas.js
//
// Analitica de Finanzas: las cuentas que varias pantallas hacen sobre los mismos movimientos.
// Salio de App.jsx en la Fase 1 (5 oct 2026) porque Reportes y Estimaciones se volvieron perezosos
// y estas piezas las comparten con el Dashboard y Presupuesto, que NO son perezosos. Si se hubieran
// ido dentro de los modulos, el Dashboard se habria quedado sin ellas.
//
// No guarda nada: Finanzas sigue siendo la unica fuente de verdad y aqui solo se lee y se calcula.

import { todayISO, montoBaseDe } from "./formato";

// Paleta de las graficas. Es el orden en que se van asignando las series/rebanadas.
export const CHART_COLORS = ["#c9a227", "#4fa88f", "#d1554a", "#5b8def", "#a67c52", "#8d92a3", "#8e6fce"];

// Rangos que ofrecen Reportes y Estimaciones en su selector.
export const RANGOS_REPORTE = [
  { label: "Últimos 3 meses", meses: 3 },
  { label: "Últimos 6 meses", meses: 6 },
  { label: "Últimos 12 meses", meses: 12 },
  { label: "Últimos 24 meses", meses: 24 },
];

export function lastNMonthKeys(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
export const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
};

// "Despliega" cada movimiento en entradas virtuales por mes dentro del rango:
// los movimientos normales aportan solo en su mes; los recurrentes aportan en cada mes
// entre su fecha de inicio y su fecha de fin (o indefinidamente si no tiene fin).
export function buildMonthlyLedger(finanzas, monthKeys) {
  const entries = [];
  for (const f of finanzas) {
    const monto = Number(f.monto || 0);
    if (!monto) continue;
    if (!f.esRecurrente) {
      const m = (f.fecha || "").slice(0, 7);
      if (monthKeys.includes(m)) entries.push({ mes: m, tipo: f.tipo, monto, categoria: f.categoria || "Sin categoría", proyectoId: f.proyectoId });
      continue;
    }
    const inicioM = (f.fecha || "").slice(0, 7);
    const finM = f.fechaFin ? f.fechaFin.slice(0, 7) : null;
    for (const m of monthKeys) {
      if (m < inicioM) continue;
      if (finM && m > finM) continue;
      if (f.frecuencia === "Anual" && m.slice(5, 7) !== inicioM.slice(5, 7)) continue;
      entries.push({ mes: m, tipo: f.tipo, monto, categoria: f.categoria || "Sin categoría", proyectoId: f.proyectoId });
    }
  }
  return entries;
}

// Cuenta cuántas veces ocurre un pago recurrente entre dos fechas (aproximado por frecuencia).
function contarOcurrenciasRecurrente(f, desde, hasta) {
  const inicio = new Date(Math.max(new Date(f.fecha), new Date(desde)));
  const fin = f.fechaFin ? new Date(Math.min(new Date(f.fechaFin), new Date(hasta))) : new Date(hasta);
  if (inicio > fin) return 0;
  const dias = Math.floor((fin - inicio) / 86400000) + 1;
  if (f.frecuencia === "Semanal") return Math.floor(dias / 7) + 1;
  if (f.frecuencia === "Quincenal") return Math.floor(dias / 15) + 1;
  if (f.frecuencia === "Anual") return Math.floor(dias / 365) + 1;
  return Math.floor(dias / 30.44) + 1; // Mensual (default)
}

// Calcula el saldo real (efectivo + cuenta) a partir del último "punto de partida" definido,
// sumando/restando los movimientos reales (Cobrado, no Pendiente) desde esa fecha.
export function calcularSaldo(data) {
  const checkpoints = [...(data.saldoInicial || [])].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  const activo = checkpoints[0];
  if (!activo) return null;
  const hoy = todayISO();
  let efectivo = Number(activo.efectivo) || 0;
  let cuenta = Number(activo.cuenta) || 0;

  for (const f of data.finanzas) {
    if (f.estatus === "Pendiente") continue; // aún no es dinero real
    if (f.forma !== "Efectivo" && f.forma !== "Transferencia") continue; // Especie/Intercambio no mueven dinero real
    const signo = f.tipo === "Ingreso" ? 1 : -1;

    if (!f.esRecurrente) {
      if (!f.fecha || f.fecha < activo.fecha || f.fecha > hoy) continue;
      const monto = montoBaseDe(f) * signo;
      if (f.forma === "Efectivo") efectivo += monto; else cuenta += monto;
    } else {
      const n = contarOcurrenciasRecurrente(f, activo.fecha, hoy);
      const monto = montoBaseDe(f) * signo * n;
      if (f.forma === "Efectivo") efectivo += monto; else cuenta += monto;
    }
  }
  return { fecha: activo.fecha, efectivo, cuenta, total: efectivo + cuenta, checkpoints };
}
