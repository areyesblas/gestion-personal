// src/components/CentroMando/MiDia.jsx
//
// "Mi día" del Centro de mando (rediseño 21 sept 2026): une en una sola tarjeta lo que antes
// eran dos widgets separados (agenda de hoy + tareas de hoy) — mismos datos que ya calculaba
// Dashboard() en App.jsx (citasHoy, accionesHoyView), sin lógica nueva.
//
// Las citas SÍ tienen hora real (fechaHora), así que van arriba en línea de tiempo. Las tareas
// de Pendientes NO guardan una hora del día (solo fecha límite) — mezclarlas con horas
// inventadas habría sido más "bonito" pero falso, así que van abajo como checklist, sin hora.

import { Check, MoreVertical } from 'lucide-react';
import { useState } from 'react';

const TONOS = ['var(--teal)', 'var(--gold)', 'var(--red)', 'var(--muted)'];
function colorPorId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}
function hora(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function Badge({ tone, children }) {
  const style = {
    red: { color: 'var(--red)', background: 'rgba(209,85,74,.14)' },
    gold: { color: 'var(--gold)', background: 'rgba(201,162,39,.14)' },
    muted: { color: 'var(--muted)', background: 'rgba(141,146,163,.12)' },
  }[tone] || {};
  return <span className="gp-badge" style={style}>{children}</span>;
}

function FilaTarea({ item, onToggle }) {
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

export default function MiDia({ citas, tareas, onToggleTarea, onVerAgenda, onAgregarTarea }) {
  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium">Mi día</h3>
        <button onClick={onVerAgenda} className="text-xs gp-text-gold">Ver agenda →</button>
      </div>
      <p className="text-xs gp-text-muted mb-3">Hoy es un gran día para avanzar.</p>

      <div className="flex-1">
      {citas.length > 0 && (
        <ul className="space-y-3 mb-3">
          {citas.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-0.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorPorId(c.id) }} />
                <span className="flex-1 w-px mt-1" style={{ background: 'var(--border)' }} />
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-xs gp-mono gp-text-muted">{hora(c.fechaHora)}</p>
                <p className="text-sm truncate">{c.titulo}</p>
                {c.lugar && <p className="text-xs gp-text-muted truncate">{c.lugar}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tareas.length === 0 && citas.length === 0 ? (
        <p className="text-xs gp-text-muted">No tienes nada agendado para hoy — buen momento para adelantar algo.</p>
      ) : tareas.length > 0 ? (
        <ul className="space-y-1 pt-2" style={{ borderTop: citas.length > 0 ? '1px solid var(--border)' : 'none' }}>
          {tareas.map((item) => <FilaTarea key={item.id} item={item} onToggle={onToggleTarea} />)}
        </ul>
      ) : null}
      </div>

      {onAgregarTarea && (
        <button onClick={onAgregarTarea} className="gp-btn w-full py-2 text-sm mt-3">+ Agregar tarea</button>
      )}
    </div>
  );
}
