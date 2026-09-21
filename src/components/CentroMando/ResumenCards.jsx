// src/components/CentroMando/ResumenCards.jsx
//
// Fila de tarjetas resumen del Centro de mando: Proyectos activos, Tareas pendientes, Citas de
// hoy, Gastos del mes y Hábitos — sin Ingresos (rediseño 21 sept 2026, brief de Angel: los
// indicadores financieros no deben ser el protagonista de la pantalla). Gastos del mes muestra
// el TOTAL agregado sin candado — es un total redondeado, no el detalle transaccional; el
// candado de 15 min de Finanzas se queda intacto para el módulo completo y para el detalle que
// sigue enmascarado en "Requiere tu atención" y "Saldo actual".
//
// Cada tarjeta es clicable y navega al módulo correspondiente — ícono grande en círculo de
// color propio por tarjeta.

import { FolderKanban, CheckSquare, CalendarClock, TrendingDown, Flame } from 'lucide-react';

function Card({ icon, label, value, color, onClick }) {
  return (
    <button onClick={onClick} className="gp-panel p-4 flex items-start gap-3 text-left w-full">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}26` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs gp-text-muted truncate">{label}</p>
        <p className="gp-serif text-xl mt-0.5" style={{ color }}>{value}</p>
      </div>
    </button>
  );
}

// Mismos valores que --gold/--teal/--red en Tokens (App.jsx) — esos NO cambian entre temas
// (solo bg/panel/texto se redefinen por tema), así que hardcodearlos aquí es seguro y permite
// el truco `${color}26` (agrega alpha en hex) para el círculo de fondo de cada tarjeta.
const COLOR_GOLD = '#F59E0B';
const COLOR_TEAL = '#5FBF8B';
const COLOR_RED = '#EF4444';
const COLOR_BLUE = '#087CF5';
const COLOR_VIOLETA = '#8B5CF6';

export default function ResumenCards({ activos, tareasPendientes, citasHoy, egresos, habitosPct, onVerProyectos, onVerTareas, onVerCitas, onVerFinanzas, onVerHabitos }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <Card icon={<FolderKanban size={22} style={{ color: COLOR_GOLD }} />} label="Proyectos activos" value={activos} color={COLOR_GOLD} onClick={onVerProyectos} />
      <Card icon={<CheckSquare size={22} style={{ color: COLOR_BLUE }} />} label="Tareas pendientes" value={tareasPendientes} color={COLOR_BLUE} onClick={onVerTareas} />
      <Card icon={<CalendarClock size={22} style={{ color: COLOR_TEAL }} />} label="Citas hoy" value={citasHoy} color={COLOR_TEAL} onClick={onVerCitas} />
      <Card icon={<TrendingDown size={22} style={{ color: COLOR_RED }} />} label="Gastos del mes" value={egresos} color={COLOR_RED} onClick={onVerFinanzas} />
      <Card icon={<Flame size={22} style={{ color: COLOR_VIOLETA }} />} label="Hábitos" value={habitosPct} color={COLOR_VIOLETA} onClick={onVerHabitos} />
    </div>
  );
}
