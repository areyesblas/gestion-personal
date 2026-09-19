// src/components/dashboard/ProyectosMiniWidget.jsx
//
// Parte de la columna 3: avance de proyectos activos, en formato compacto. Reutiliza
// literalmente el cálculo de avancePorProyecto que ya existe en el Dashboard.

export default function ProyectosMiniWidget({ proyectos, onVerTodos }) {
  return (
    <div className="gp-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Proyectos</h3>
        <button onClick={onVerTodos} className="text-xs gp-text-gold">Ver todos</button>
      </div>
      {proyectos.length === 0 ? (
        <p className="text-xs gp-text-muted">Sin proyectos activos con tareas todavía.</p>
      ) : (
        <div className="space-y-3">
          {proyectos.slice(0, 4).map((p) => (
            <div key={p.nombre}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate gp-text-muted">{p.nombre}</span>
                <span className="gp-mono shrink-0">{p.pct}%</span>
              </div>
              <div className="h-1.5 rounded" style={{ background: 'var(--border)' }}>
                <div className="h-1.5 rounded" style={{ width: `${p.pct}%`, background: 'var(--teal)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
