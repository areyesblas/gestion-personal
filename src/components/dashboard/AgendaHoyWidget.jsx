// src/components/dashboard/AgendaHoyWidget.jsx
//
// Columna 2 del Centro de mando: timeline de las citas de HOY (mismo dato que ya usa
// "Próximas citas" en el Dashboard, filtrado a dd === 0). Las citas no tienen un campo de
// color propio, así que el punto de cada fila se deriva por hash del id entre 4 tonos ya
// existentes en los tokens de diseño — no se agrega ninguna columna nueva a la tabla.

const TONOS = ['var(--teal)', 'var(--gold)', 'var(--red)', 'var(--muted)'];

function colorPorId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length];
}

function hora(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function AgendaHoyWidget({ citas, onVerCalendario }) {
  return (
    <div className="gp-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Mi agenda</h3>
        <button onClick={onVerCalendario} className="text-xs gp-text-gold">Ver calendario</button>
      </div>
      {citas.length === 0 ? (
        <p className="text-xs gp-text-muted">No tienes citas para hoy.</p>
      ) : (
        <p className="text-xs gp-text-muted mb-2">Hoy</p>
      )}
      <ul className="space-y-3">
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
    </div>
  );
}
