// src/components/CentroMando/HabitosHoyWidget.jsx
//
// Hábitos de hoy: reutiliza el mismo cálculo que ya usa el módulo Habitos (aplicaHoy,
// fechas cumplidas), resuelto en Dashboard y pasado ya calculado — evita import cruzado
// entre App.jsx y src/components/dashboard/*.

import { Check, Flame } from 'lucide-react';

export default function HabitosHoyWidget({ habitos, onToggle, onVerTodos }) {
  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Hábitos de hoy</h3>
        <button onClick={onVerTodos} className="text-xs gp-text-gold">Ver hábitos</button>
      </div>
      {habitos.length === 0 ? (
        <p className="text-xs gp-text-muted">No tienes hábitos programados para hoy.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {habitos.map((h) => (
            <button key={h.id} onClick={() => onToggle(h)} className="flex flex-col items-center gap-1.5 w-16">
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center border-2"
                style={{ borderColor: h.hecho ? 'var(--teal)' : 'var(--border)', background: h.hecho ? 'rgba(79,168,143,.14)' : 'transparent' }}
              >
                {h.hecho ? <Check size={18} className="gp-text-teal" /> : <Flame size={16} className="gp-text-muted" />}
              </span>
              <span className="text-[11px] gp-text-muted truncate w-full text-center">{h.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
