// src/components/CentroMando/RequiereAtencion.jsx
//
// "Requiere tu atención" del Centro de mando (rediseño 21 sept 2026): une en una sola tarjeta,
// con un badge de conteo, lo que antes eran 3-4 widgets sueltos (próximas acciones, alertas de
// documentos/activos/facturas, proyectos en atención, medicamentos de hoy) — mismos datos que
// ya calculaba Dashboard() en App.jsx, sin lógica nueva. Cada fila ya trae su propio ir-a-destino.

import { AlertTriangle } from 'lucide-react';

function Badge({ tone, children }) {
  const style = {
    red: { color: 'var(--red)', background: 'rgba(209,85,74,.14)' },
    gold: { color: 'var(--gold)', background: 'rgba(201,162,39,.14)' },
    muted: { color: 'var(--muted)', background: 'rgba(141,146,163,.12)' },
  }[tone] || {};
  return <span className="gp-badge" style={style}>{children}</span>;
}

export default function RequiereAtencion({ items }) {
  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={15} className="gp-text-red" />
        <h3 className="text-sm font-medium flex-1">Requiere tu atención</h3>
        {items.length > 0 && <Badge tone="red">{items.length}</Badge>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs gp-text-muted">Nada urgente por ahora — buen momento para revisar lo que viene.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <button onClick={it.irA} className="w-full text-left flex items-center justify-between gap-2 text-sm py-0.5">
                <span className="truncate">{it.texto}{it.sub ? <span className="gp-text-muted text-xs"> — {it.sub}</span> : ''}</span>
                <Badge tone={it.tono || 'muted'}>{it.etiqueta}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
