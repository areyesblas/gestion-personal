// src/components/modulos/Estimaciones.jsx
//
// Separado de Reportes: Reportes muestra lo que YA pasó; Estimaciones interpreta ese histórico
// para proyectar qué podría venir. Nunca modifica ni sustituye los datos fuente de Finanzas —
// solo lee y calcula. Módulo sensible (candado de 15 min, igual que Finanzas/Reportes).

import { useState, useMemo } from "react";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { fmtMoney, montoBaseDe, todayISO } from "../../lib/formato";
import { RANGOS_REPORTE, buildMonthlyLedger, lastNMonthKeys, calcularSaldo } from "../../lib/finanzas";
import { Stat } from "../ui/basicos";

export default function Estimaciones({ data }) {
  const [rangoMeses, setRangoMeses] = useState(6);

  const monthKeys = useMemo(() => lastNMonthKeys(rangoMeses), [rangoMeses]);
  const ledger = useMemo(() => buildMonthlyLedger(data.finanzas, monthKeys), [data.finanzas, monthKeys]);
  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "Sin proyecto";
  const nombreContacto = (id) => data.contactos.find((c) => c.id === id)?.nombre || "Sin cliente";

  const serieMensual = useMemo(() => monthKeys.map((m) => {
    const delMes = ledger.filter((e) => e.mes === m);
    const ingresos = delMes.filter((e) => e.tipo === "Ingreso").reduce((s, e) => s + e.monto, 0);
    const egresos = delMes.filter((e) => e.tipo === "Egreso").reduce((s, e) => s + e.monto, 0);
    return { mes: m, ingresos, egresos, neto: ingresos - egresos };
  }), [ledger, monthKeys]);

  // --- Proyección de ingresos/egresos (promedio del rango) y flujo/liquidez (próximos 3 meses) ---
  const promedioIngreso = serieMensual.length ? serieMensual.reduce((s, m) => s + m.ingresos, 0) / serieMensual.length : 0;
  const promedioEgreso = serieMensual.length ? serieMensual.reduce((s, m) => s + m.egresos, 0) / serieMensual.length : 0;
  const promedioNeto = promedioIngreso - promedioEgreso;

  const saldo = calcularSaldo(data);
  const proyeccionFlujo = useMemo(() => {
    const meses = [];
    let acumulado = saldo?.total ?? 0;
    const hoy = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      acumulado += promedioNeto;
      meses.push({ mes: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }), saldoProyectado: acumulado });
    }
    return meses;
  }, [saldo, promedioNeto]);

  // --- Tendencias de gasto y anomalías: mes más reciente del rango vs promedio de los meses previos ---
  const tendenciasCategoria = useMemo(() => {
    if (monthKeys.length < 2) return [];
    const mesActual = monthKeys[monthKeys.length - 1];
    const mesesPrevios = monthKeys.slice(0, -1);
    const gastoPorCat = {};
    for (const e of ledger) {
      if (e.tipo !== "Egreso") continue;
      if (!gastoPorCat[e.categoria]) gastoPorCat[e.categoria] = { actual: 0, previoTotal: 0 };
      if (e.mes === mesActual) gastoPorCat[e.categoria].actual += e.monto;
      else if (mesesPrevios.includes(e.mes)) gastoPorCat[e.categoria].previoTotal += e.monto;
    }
    return Object.entries(gastoPorCat)
      .map(([categoria, v]) => {
        const promedioPrevio = mesesPrevios.length ? v.previoTotal / mesesPrevios.length : 0;
        const cambioPct = promedioPrevio > 0 ? ((v.actual - promedioPrevio) / promedioPrevio) * 100 : (v.actual > 0 ? 100 : 0);
        return { categoria, actual: v.actual, promedioPrevio, cambioPct };
      })
      .filter((c) => c.actual > 0 || c.promedioPrevio > 0)
      .sort((a, b) => Math.abs(b.cambioPct) - Math.abs(a.cambioPct));
  }, [ledger, monthKeys]);
  const anomalias = tendenciasCategoria.filter((c) => Math.abs(c.cambioPct) >= 40 && c.promedioPrevio > 0);

  // --- Rentabilidad por proyecto y por cliente ---
  const porProyecto = useMemo(() => {
    const map = {};
    for (const e of ledger) {
      const key = e.proyectoId || "sin-proyecto";
      if (!map[key]) map[key] = { ingresos: 0, egresos: 0 };
      map[key][e.tipo === "Ingreso" ? "ingresos" : "egresos"] += e.monto;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ nombre: id === "sin-proyecto" ? "Sin proyecto" : nombreProyecto(id), neto: v.ingresos - v.egresos }))
      .filter((p) => p.neto !== 0)
      .sort((a, b) => b.neto - a.neto);
  }, [ledger, data.proyectos]);

  const porCliente = useMemo(() => {
    const map = {};
    for (const f of data.finanzas) {
      if (!f.contactoId || f.estatus !== "Cobrado") continue;
      const m = (f.fecha || "").slice(0, 7);
      if (!monthKeys.includes(m)) continue;
      if (!map[f.contactoId]) map[f.contactoId] = { ingresos: 0, egresos: 0 };
      map[f.contactoId][f.tipo === "Ingreso" ? "ingresos" : "egresos"] += montoBaseDe(f);
    }
    return Object.entries(map)
      .map(([id, v]) => ({ nombre: nombreContacto(id), neto: v.ingresos - v.egresos }))
      .sort((a, b) => b.neto - a.neto);
  }, [data.finanzas, monthKeys, data.contactos]);

  // --- Comportamiento de ingresos y gastos recurrentes ---
  const recurrentesActivos = data.finanzas.filter((f) => f.esRecurrente && (!f.fechaFin || f.fechaFin >= todayISO()));
  const recurrenteIngresoMensual = recurrentesActivos.filter((f) => f.tipo === "Ingreso" && f.frecuencia !== "Anual").reduce((s, f) => s + montoBaseDe(f), 0);
  const recurrenteEgresoMensual = recurrentesActivos.filter((f) => f.tipo === "Egreso" && f.frecuencia !== "Anual").reduce((s, f) => s + montoBaseDe(f), 0);

  // --- Proyección de categorías y necesidades futuras (gasto mensual promedio, para presupuestar) ---
  const promedioMensualPorCategoria = useMemo(() => {
    const map = {};
    for (const e of ledger) {
      if (e.tipo !== "Egreso") continue;
      map[e.categoria] = (map[e.categoria] || 0) + e.monto;
    }
    return Object.entries(map)
      .map(([cat, total]) => ({ categoria: cat, promedio: total / rangoMeses }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 6);
  }, [ledger, rangoMeses]);

  // --- Estimaciones de valor (eventos, rentas) y de tiempos (tareas) ---
  const utilidadesEventos = (data.eventos || []).map((e) => e.utilidad).filter((u) => u !== null && u !== undefined && u !== "").map(Number);
  const promedioEvento = utilidadesEventos.length ? utilidadesEventos.reduce((a, b) => a + b, 0) / utilidadesEventos.length : null;
  const ordenExtremos = [...utilidadesEventos].sort((a, b) => a - b);
  const medianaEvento = ordenExtremos.length ? ordenExtremos[Math.floor(ordenExtremos.length / 2)] : null;

  const rentas = data.finanzas.filter((f) => f.categoria === "Renta Airbnb" && f.monto);
  const promedioRenta = rentas.length ? rentas.reduce((s, f) => s + montoBaseDe(f), 0) / rentas.length : null;

  const tareasConAmbos = data.pendientes.filter((t) => t.tiempoEstimado && t.tiempoReal);
  let precisionTiempo = null;
  if (tareasConAmbos.length > 0) {
    const desviaciones = tareasConAmbos.map((t) => (Number(t.tiempoReal) - Number(t.tiempoEstimado)) / Number(t.tiempoEstimado));
    const promedioDesv = desviaciones.reduce((a, b) => a + b, 0) / desviaciones.length;
    precisionTiempo = { n: tareasConAmbos.length, sesgoPct: promedioDesv * 100 };
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="gp-text-gold" />
        <h2 className="gp-serif text-2xl">Estimaciones</h2>
      </div>
      <p className="text-sm gp-text-muted mb-1">Proyecciones y señales calculadas con estadística simple sobre tu histórico ya cargado en Finanzas — sin IA externa, sin costo.</p>
      <p className="text-xs gp-text-gold mb-4">⚠️ Son cálculos derivados del histórico, no hechos confirmados. No sustituyen a Finanzas ni la modifican — entre más datos reales captures ahí, más se afinan estas cifras.</p>

      <div className="mb-6">
        <select className="gp-input sm:max-w-[220px]" value={rangoMeses} onChange={(e) => setRangoMeses(Number(e.target.value))}>
          {RANGOS_REPORTE.map((r) => <option key={r.meses} value={r.meses}>{r.label}</option>)}
        </select>
      </div>

      <div className="gp-panel p-4 mb-4">
        <h3 className="text-sm font-medium mb-1">Proyección de ingresos y egresos — próximo mes</h3>
        <p className="text-xs gp-text-muted mb-3">Promedio de los últimos {rangoMeses} meses en tu rango seleccionado.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Ingresos esperados" value={fmtMoney(promedioIngreso)} tone="teal" />
          <Stat label="Egresos esperados" value={fmtMoney(promedioEgreso)} tone="red" />
          <Stat label="Neto esperado" value={fmtMoney(promedioNeto)} tone={promedioNeto >= 0 ? "teal" : "red"} />
        </div>
      </div>

      <div className="gp-panel p-4 mb-4">
        <h3 className="text-sm font-medium mb-1">Proyección de flujo y liquidez</h3>
        {saldo ? (
          <>
            <p className="text-xs gp-text-muted mb-3">Partiendo de tu saldo actual ({fmtMoney(saldo.total)}) y el neto promedio esperado por mes.</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={proyeccionFlujo} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
                <Line type="monotone" dataKey="saldoProyectado" name="Saldo proyectado" stroke="var(--gold)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-xs gp-text-muted">Define tu saldo inicial en Centro de mando para activar la proyección de liquidez.</p>
        )}
      </div>

      <div className="gp-panel p-4 mb-4">
        <h3 className="text-sm font-medium mb-1">Tendencias de gasto</h3>
        <p className="text-xs gp-text-muted mb-3">Compara el mes más reciente del rango contra el promedio de los meses anteriores, por categoría.</p>
        {tendenciasCategoria.length === 0 ? (
          <p className="text-xs gp-text-muted">Necesitas al menos 2 meses de histórico en el rango elegido.</p>
        ) : (
          <div className="space-y-1.5">
            {tendenciasCategoria.slice(0, 8).map((c) => (
              <div key={c.categoria} className="flex items-center justify-between text-xs">
                <span className="gp-text-muted">{c.categoria}</span>
                <span className="flex items-center gap-2">
                  <span className="gp-mono">{fmtMoney(c.actual)}</span>
                  <span className={`gp-mono ${c.cambioPct > 0 ? "gp-text-red" : "gp-text-teal"}`}>{c.cambioPct > 0 ? "+" : ""}{c.cambioPct.toFixed(0)}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {anomalias.length > 0 && (
        <div className="gp-panel p-4 mb-4" style={{ borderColor: "var(--red)" }}>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="gp-text-red" /><h3 className="text-sm font-medium">Alertas — cambios fuera de lo normal</h3></div>
          <div className="space-y-1.5">
            {anomalias.map((a) => (
              <p key={a.categoria} className="text-xs">
                <span className="font-medium">{a.categoria}</span>: {a.cambioPct > 0 ? "subió" : "bajó"} <span className={`gp-mono ${a.cambioPct > 0 ? "gp-text-red" : "gp-text-teal"}`}>{Math.abs(a.cambioPct).toFixed(0)}%</span> frente a tu promedio ({fmtMoney(a.promedioPrevio)}/mes)
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Rentabilidad por proyecto</h3>
          {porProyecto.length === 0 ? <p className="text-xs gp-text-muted">Sin movimientos en este rango.</p> : (
            <div className="space-y-1.5">
              {porProyecto.slice(0, 8).map((p) => (
                <div key={p.nombre} className="flex justify-between text-xs">
                  <span className="gp-text-muted truncate">{p.nombre}</span>
                  <span className={`gp-mono ${p.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(p.neto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Rentabilidad por cliente</h3>
          {porCliente.length === 0 ? <p className="text-xs gp-text-muted">Sin cobros ligados a un contacto en este rango.</p> : (
            <div className="space-y-1.5">
              {porCliente.slice(0, 8).map((c) => (
                <div key={c.nombre} className="flex justify-between text-xs">
                  <span className="gp-text-muted truncate">{c.nombre}</span>
                  <span className={`gp-mono ${c.neto >= 0 ? "gp-text-teal" : "gp-text-red"}`}>{fmtMoney(c.neto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="gp-panel p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Comportamiento de ingresos y gastos recurrentes</h3>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Ingreso recurrente mensual activo" value={fmtMoney(recurrenteIngresoMensual)} tone="teal" />
          <Stat label="Egreso recurrente mensual activo" value={fmtMoney(recurrenteEgresoMensual)} tone="red" />
        </div>
      </div>

      {promedioMensualPorCategoria.length > 0 && (
        <div className="gp-panel p-4 mb-4">
          <h3 className="text-sm font-medium mb-3">Gasto mensual promedio por categoría (para presupuestar el mes que sigue)</h3>
          <div className="space-y-1">
            {promedioMensualPorCategoria.map((c) => (
              <div key={c.categoria} className="flex justify-between text-xs">
                <span className="gp-text-muted">{c.categoria}</span>
                <span className="gp-mono">{fmtMoney(c.promedio)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gp-panel p-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={15} className="gp-text-gold" />
          <h3 className="text-sm font-medium">Estimaciones de valor y tiempos</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div>
            <p className="text-xs gp-text-muted mb-1">Utilidad esperada por evento/show</p>
            {utilidadesEventos.length > 0 ? (
              <p className="text-sm">Promedio: <span className="gp-mono gp-text-teal">{fmtMoney(promedioEvento)}</span> · Mediana: <span className="gp-mono">{fmtMoney(medianaEvento)}</span> <span className="gp-text-muted">({utilidadesEventos.length} eventos con dato)</span></p>
            ) : <p className="text-xs gp-text-muted">Aún no hay suficientes eventos con utilidad capturada.</p>}
          </div>
          <div>
            <p className="text-xs gp-text-muted mb-1">Ingreso esperado por renta (Escápate YA)</p>
            {rentas.length > 0 ? (
              <p className="text-sm">Promedio: <span className="gp-mono gp-text-teal">{fmtMoney(promedioRenta)}</span> <span className="gp-text-muted">({rentas.length} rentas)</span></p>
            ) : <p className="text-xs gp-text-muted">Aún no hay rentas registradas.</p>}
          </div>
          <div>
            <p className="text-xs gp-text-muted mb-1">Precisión al estimar tiempos en tareas</p>
            {precisionTiempo ? (
              <p className="text-sm">
                En promedio tardas <span className={`gp-mono ${precisionTiempo.sesgoPct > 0 ? "gp-text-red" : "gp-text-teal"}`}>{precisionTiempo.sesgoPct > 0 ? "+" : ""}{precisionTiempo.sesgoPct.toFixed(0)}%</span> de lo que estimas <span className="gp-text-muted">({precisionTiempo.n} tareas con estimado y real)</span>
              </p>
            ) : <p className="text-xs gp-text-muted">Captura tiempo estimado y real en tus Pendientes para que esto se active.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
