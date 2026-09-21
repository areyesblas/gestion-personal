// src/components/CentroMando/ProgresoWidget.jsx
//
// "Tu progreso" del Centro de mando (rediseño 21 sept 2026): 4 anillos circulares — Proyectos
// (tareas completadas), Tareas (igual que Proyectos hoy, mismo dato de avance general — ver
// nota en App.jsx), Hábitos (cumplidos hoy) y Finanzas (gastado del mes / presupuesto mensual,
// definido por el usuario — sin presupuesto no se puede calcular un %, así que se pide definirlo
// en vez de inventar un número).

const COLOR_GOLD = '#F59E0B';
const COLOR_TEAL = '#5FBF8B';
const COLOR_BLUE = '#087CF5';
const COLOR_VIOLETA = '#8B5CF6';

function Anillo({ pct, color, label, sub }) {
  const r = 26, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
          transform="rotate(-90 32 32)"
        />
        <text x={32} y={36} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--text)">{Math.round(p)}%</text>
      </svg>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[10px] gp-text-muted text-center">{sub}</p>
    </div>
  );
}

export default function ProgresoWidget({ proyectosPct, tareasPct, habitosPct, finanzas }) {
  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Tu progreso</h3>
        <span className="text-xs gp-text-muted">Este mes</span>
      </div>
      <div className="grid grid-cols-4 gap-2 flex-1 items-center">
        <Anillo pct={proyectosPct.pct} color={COLOR_GOLD} label="Proyectos" sub={proyectosPct.sub} />
        <Anillo pct={tareasPct.pct} color={COLOR_BLUE} label="Tareas" sub={tareasPct.sub} />
        <Anillo pct={habitosPct.pct} color={COLOR_VIOLETA} label="Hábitos" sub={habitosPct.sub} />
        {finanzas.presupuesto ? (
          <Anillo pct={finanzas.pct} color={COLOR_TEAL} label="Finanzas" sub={finanzas.sub} />
        ) : (
          <button onClick={finanzas.onDefinirPresupuesto} className="flex flex-col items-center justify-center gap-1 text-center" style={{ minHeight: 64 }}>
            <span className="text-[10px] gp-text-gold underline">Definir presupuesto</span>
            <span className="text-[10px] gp-text-muted">para ver Finanzas aquí</span>
          </button>
        )}
      </div>
    </div>
  );
}
