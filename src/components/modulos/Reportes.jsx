// src/components/modulos/Reportes.jsx
//
// Capa analitica: lee el historico de Finanzas y lo grafica. No almacena datos propios — todo sale
// de los movimientos, y cualquier cifra de aqui se puede rastrear hasta su registro fuente.
//
// Primer modulo perezoso de la Fase 1 (5 oct 2026): solo recibe `data`, sin un callback, asi que
// era el corte mas barato para estrenar el patron.

import { useState, useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { fmtMoney, todayISO } from "../../lib/formato";
import { ordenadosPorNombre } from "../../lib/listas";
import { CHART_COLORS, RANGOS_REPORTE, buildMonthlyLedger, lastNMonthKeys, monthLabel } from "../../lib/finanzas";
import { Stat } from "../ui/basicos";

export default function Reportes({ data }) {
  const [rangoMeses, setRangoMeses] = useState(6);
  const [proyectoFiltro, setProyectoFiltro] = useState("");

  const finanzasFiltradas = useMemo(
    () => (proyectoFiltro ? data.finanzas.filter((f) => f.proyectoId === proyectoFiltro) : data.finanzas),
    [data.finanzas, proyectoFiltro]
  );

  const monthKeys = useMemo(() => lastNMonthKeys(rangoMeses), [rangoMeses]);
  const ledger = useMemo(() => buildMonthlyLedger(finanzasFiltradas, monthKeys), [finanzasFiltradas, monthKeys]);

  const nombreProyecto = (id) => data.proyectos.find((p) => p.id === id)?.nombre || "Sin proyecto";

  // serie mensual: ingresos vs egresos
  const serieMensual = useMemo(() => monthKeys.map((m) => {
    const delMes = ledger.filter((e) => e.mes === m);
    const ingresos = delMes.filter((e) => e.tipo === "Ingreso").reduce((s, e) => s + e.monto, 0);
    const egresos = delMes.filter((e) => e.tipo === "Egreso").reduce((s, e) => s + e.monto, 0);
    return { mes: monthLabel(m), ingresos, egresos, neto: ingresos - egresos };
  }), [ledger, monthKeys]);

  // acumulado neto
  const serieAcumulada = useMemo(() => {
    let acc = 0;
    return serieMensual.map((p) => { acc += p.neto; return { mes: p.mes, acumulado: acc }; });
  }, [serieMensual]);

  // egresos por categoría (todo el rango)
  const porCategoria = useMemo(() => {
    const map = {};
    for (const e of ledger) {
      if (e.tipo !== "Egreso") continue;
      map[e.categoria] = (map[e.categoria] || 0) + e.monto;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [ledger]);

  // por proyecto (neto, todo el rango)
  const porProyecto = useMemo(() => {
    const map = {};
    for (const e of ledger) {
      const key = e.proyectoId || "sin-proyecto";
      if (!map[key]) map[key] = { ingresos: 0, egresos: 0 };
      map[key][e.tipo === "Ingreso" ? "ingresos" : "egresos"] += e.monto;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ nombre: id === "sin-proyecto" ? "Sin proyecto" : nombreProyecto(id), neto: v.ingresos - v.egresos }))
      .sort((a, b) => b.neto - a.neto);
  }, [ledger, data.proyectos]);

  const totalIngresos = serieMensual.reduce((s, m) => s + m.ingresos, 0);
  const totalEgresos = serieMensual.reduce((s, m) => s + m.egresos, 0);
  const gastoRecurrenteMensual = useMemo(() => {
    const hoy = todayISO().slice(0, 7);
    return finanzasFiltradas
      .filter((f) => f.esRecurrente && f.tipo === "Egreso" && f.frecuencia !== "Anual" && (!f.fechaFin || f.fechaFin.slice(0, 7) >= hoy) && (f.fecha || "").slice(0, 7) <= hoy)
      .reduce((s, f) => s + Number(f.monto || 0), 0);
  }, [finanzasFiltradas]);

  return (
    <div>
      <h2 className="gp-serif text-2xl mb-1">Reportes</h2>
      <p className="text-sm gp-text-muted mb-4">Ingresos, egresos y pagos recurrentes, todos mezclados en un mismo panorama. ¿Buscas proyecciones y tendencias? Eso vive en Estimaciones.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select className="gp-input sm:max-w-[200px]" value={rangoMeses} onChange={(e) => setRangoMeses(Number(e.target.value))}>
          {RANGOS_REPORTE.map((r) => <option key={r.meses} value={r.meses}>{r.label}</option>)}
        </select>
        <select className="gp-input sm:max-w-[220px]" value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {ordenadosPorNombre(data.proyectos).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Ingresos del periodo" value={fmtMoney(totalIngresos)} tone="teal" />
        <Stat label="Egresos del periodo" value={fmtMoney(totalEgresos)} tone="red" />
        <Stat label="Neto del periodo" value={fmtMoney(totalIngresos - totalEgresos)} />
        <Stat label="Recurrente mensual activo" value={fmtMoney(gastoRecurrenteMensual)} tone="gold" />
      </div>

      <div className="gp-panel p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Ingresos vs egresos por mes</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={serieMensual} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="var(--teal)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="var(--red)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Ganancia neta acumulada</h3>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={serieAcumulada} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
              <Line type="monotone" dataKey="acumulado" name="Neto acumulado" stroke="var(--gold)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="gp-panel p-4">
          <h3 className="text-sm font-medium mb-3">Egresos por categoría</h3>
          {porCategoria.length === 0 ? (
            <p className="text-xs gp-text-muted">Sin egresos en este periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {porCategoria.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="gp-panel p-4">
        <h3 className="text-sm font-medium mb-3">Neto por proyecto</h3>
        {porProyecto.length === 0 ? (
          <p className="text-xs gp-text-muted">Sin movimientos en este periodo.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, porProyecto.length * 40)}>
            <BarChart data={porProyecto} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
              <Bar dataKey="neto" radius={[0, 3, 3, 0]}>
                {porProyecto.map((p, i) => <Cell key={i} fill={p.neto >= 0 ? "var(--teal)" : "var(--red)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
