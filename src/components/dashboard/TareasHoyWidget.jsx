// src/components/dashboard/TareasHoyWidget.jsx
//
// Columna 1 del Centro de mando: tareas/seguimientos/cobros de hoy, mismo dato que ya arma
// "Acciones para hoy" en el Dashboard (accionesHoy) — aquí solo se muestra en formato de lista
// con checkbox + badge de estado, recibiendo los datos ya calculados como props.

import { Check, MoreVertical } from 'lucide-react';
import { useState } from 'react';

function Badge({ tone, children }) {
  const style = {
    red: { color: 'var(--red)', background: 'rgba(209,85,74,.14)' },
    gold: { color: 'var(--gold)', background: 'rgba(201,162,39,.14)' },
    muted: { color: 'var(--muted)', background: 'rgba(141,146,163,.12)' },
  }[tone] || {};
  return <span className="gp-badge" style={style}>{children}</span>;
}

function Fila({ item, onToggle }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  return (
    <li className="flex items-center gap-2 relative">
      {item.pendienteId ? (
        <button
          onClick={() => onToggle(item.pendienteId, item.hecha)}
          title={item.hecha ? 'Deshacer' : 'Marcar como hecho'}
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ border: '1px solid var(--border)', background: item.hecha ? 'var(--teal)' : 'transparent' }}
        >
          {item.hecha && <Check size={13} color="#fff" />}
        </button>
      ) : <span className="w-5 shrink-0" />}
      <button onClick={item.irA} className="flex-1 text-left min-w-0 py-1">
        <span className={`text-sm truncate block ${item.hecha ? 'line-through gp-text-muted' : ''}`}>{item.texto}</span>
        {item.sub && <span className="text-xs gp-text-muted truncate block">{item.sub}</span>}
      </button>
      <Badge tone={item.tono}>{item.estado}</Badge>
      <button onClick={() => setMenuAbierto((v) => !v)} className="p-1 rounded gp-btn-ghost shrink-0" aria-label="Más opciones">
        <MoreVertical size={14} />
      </button>
      {menuAbierto && (
        <div className="absolute right-0 top-7 z-10 gp-panel py-1 text-sm" style={{ minWidth: 160 }} onMouseLeave={() => setMenuAbierto(false)}>
          {item.pendienteId && (
            <button onClick={() => { onToggle(item.pendienteId, item.hecha); setMenuAbierto(false); }} className="w-full text-left px-3 py-1.5 gp-panel-hi">
              {item.hecha ? 'Marcar como pendiente' : 'Marcar como hecho'}
            </button>
          )}
          <button onClick={() => { item.irA(); setMenuAbierto(false); }} className="w-full text-left px-3 py-1.5 gp-panel-hi">Ir al detalle</button>
        </div>
      )}
    </li>
  );
}

export default function TareasHoyWidget({ items, onToggle, onVerTodas }) {
  return (
    <div className="gp-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Mis tareas de hoy</h3>
        <button onClick={onVerTodas} className="text-xs gp-text-gold">Ver todas</button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs gp-text-muted">No tienes tareas para hoy — buen momento para adelantar algo.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => <Fila key={item.id} item={item} onToggle={onToggle} />)}
        </ul>
      )}
    </div>
  );
}
