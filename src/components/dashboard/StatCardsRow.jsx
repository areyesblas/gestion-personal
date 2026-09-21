// src/components/dashboard/StatCardsRow.jsx
//
// Fila de tarjetas resumen del Centro de mando. Ingresos/Gastos del mes muestran el TOTAL
// agregado del mes siempre, sin candado — decisión de producto de Angel (20 sept 2026): son un
// total redondeado, no el detalle transaccional. El candado de 15 min de Finanzas se queda
// intacto para el módulo completo y para el detalle (conceptos/montos individuales) que sigue
// enmascarado en "Acciones para hoy", "Alertas importantes", "Saldo actual" y "Ganancia neta
// por proyecto" más abajo en el Dashboard.
//
// Cada tarjeta es clicable y navega al módulo correspondiente (pedido de Angel, 20 sept 2026) —
// ícono grande en círculo de color propio por tarjeta, en vez del cuadro gris uniforme de antes.

import { FolderKanban, CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';

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

// Mismos valores que --gold/--teal/--red en Tokens (App.jsx) — esos tres NO cambian entre temas
// (solo bg/panel/texto se redefinen por tema), así que hardcodearlos aquí es seguro y permite
// el truco `${color}26` (agrega alpha en hex) para el círculo de fondo de cada tarjeta.
const COLOR_GOLD = '#F59E0B';
const COLOR_TEAL = '#5FBF8B';
const COLOR_RED = '#EF4444';
const COLOR_BLUE = '#087CF5';

export default function StatCardsRow({ activos, tareasPendientes, ingresos, egresos, onVerProyectos, onVerTareas, onVerFinanzas }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <Card icon={<FolderKanban size={22} style={{ color: COLOR_GOLD }} />} label="Proyectos activos" value={activos} color={COLOR_GOLD} onClick={onVerProyectos} />
      <Card icon={<CheckSquare size={22} style={{ color: COLOR_BLUE }} />} label="Tareas pendientes" value={tareasPendientes} color={COLOR_BLUE} onClick={onVerTareas} />
      <Card icon={<TrendingUp size={22} style={{ color: COLOR_TEAL }} />} label="Ingresos del mes" value={ingresos} color={COLOR_TEAL} onClick={onVerFinanzas} />
      <Card icon={<TrendingDown size={22} style={{ color: COLOR_RED }} />} label="Gastos del mes" value={egresos} color={COLOR_RED} onClick={onVerFinanzas} />
    </div>
  );
}
