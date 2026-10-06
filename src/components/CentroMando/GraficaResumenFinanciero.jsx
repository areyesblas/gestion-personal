// src/components/CentroMando/GraficaResumenFinanciero.jsx
//
// La barra de ingresos vs egresos del widget "Resumen financiero" del Centro de mando.
//
// POR QUE VIVE SOLA Y PEREZOSA (Fase 3, 6 oct 2026). Era la ULTIMA cosa del bundle principal que
// importaba `recharts`: todas las demas pantallas con graficas (Reportes, Estimaciones, Resumen de
// Finanzas, Salud, Proyectos) ya son modulos perezosos. Mientras esta grafica viviera dentro de
// App.jsx, recharts entraba en el arranque — y recharts pesa 160 KB gzip, medido aislandolo en su
// propio trozo: mas de la mitad del arranque de entonces.
//
// Sacarla de aqui es lo que deja que recharts solo se descargue cuando de verdad hay una grafica
// en pantalla. El costo es que la grafica del Centro de mando aparece un instante despues que el
// resto del panel; por eso el fallback reserva su altura, para que nada salte de lugar.

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { fmtMoney } from "../../lib/formato";

export default function GraficaResumenFinanciero({ serie }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={serie} margin={{ left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
        <Bar dataKey="ingresos" name="Ingresos" fill="var(--teal)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="egresos" name="Egresos" fill="var(--red)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
