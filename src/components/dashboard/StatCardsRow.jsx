// src/components/dashboard/StatCardsRow.jsx
//
// Fila de 5 tarjetas resumen del Centro de mando. Las de Ingresos/Gastos del mes respetan el
// mismo enmascarado que ya usa el resto del Dashboard cuando Finanzas está bloqueado (módulo
// sensible, candado de 15 min) — nunca se muestra el monto real sin pasar por onDesbloquear.
// La 5a tarjeta ("Personalizar panel") es solo visual por ahora: abre un aviso de "Próximamente",
// sin mostrar/ocultar ni reordenar widgets todavía (decisión de producto ya confirmada).

import { FolderKanban, CheckSquare, TrendingUp, TrendingDown, Sliders } from 'lucide-react';

function Card({ icon, label, value, tone }) {
  return (
    <div className="gp-panel p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--panel-hi)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs gp-text-muted truncate">{label}</p>
        <p className={`gp-serif text-xl mt-0.5 ${tone === 'teal' ? 'gp-text-teal' : tone === 'red' ? 'gp-text-red' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

export default function StatCardsRow({ activos, tareasPendientes, ingresos, egresos, sensibleDesbloqueado, onDesbloquear, onPersonalizarClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <Card icon={<FolderKanban size={17} className="gp-text-gold" />} label="Proyectos activos" value={activos} />
      <Card icon={<CheckSquare size={17} className="gp-text-gold" />} label="Tareas pendientes" value={tareasPendientes} />
      {sensibleDesbloqueado ? (
        <Card icon={<TrendingUp size={17} className="gp-text-teal" />} label="Ingresos del mes" value={ingresos} tone="teal" />
      ) : (
        <button onClick={onDesbloquear} className="text-left">
          <Card icon={<TrendingUp size={17} className="gp-text-teal" />} label="Ingresos del mes" value="🔒 •••••" />
        </button>
      )}
      {sensibleDesbloqueado ? (
        <Card icon={<TrendingDown size={17} className="gp-text-red" />} label="Gastos del mes" value={egresos} tone="red" />
      ) : (
        <button onClick={onDesbloquear} className="text-left">
          <Card icon={<TrendingDown size={17} className="gp-text-red" />} label="Gastos del mes" value="🔒 •••••" />
        </button>
      )}
      <button
        onClick={onPersonalizarClick}
        className="rounded-xl p-4 flex flex-col items-start justify-center gap-1.5 text-left text-white"
        style={{ background: 'linear-gradient(135deg, #087CF5, #102B55)' }}
      >
        <Sliders size={18} />
        <span className="text-sm font-semibold leading-tight">Personalizar panel</span>
        <span className="text-[11px] opacity-85 leading-tight">Elige qué ver en tu inicio</span>
      </button>
    </div>
  );
}
