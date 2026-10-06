import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

// darle a cada categoría su color. Usa el mismo patrón de menú desplegable que el "···" de cada
// fila. Cada opción trae su color y cuántos registros tiene; la cerrada muestra la seleccionada.
export function ComboFiltroColor({ opciones, valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const sel = opciones.find((o) => o.id === valor) || opciones[0];
  if (!sel) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}
        aria-haspopup="listbox" aria-expanded={abierto}
        className="gp-btn-ghost rounded-full pl-1.5 pr-2.5 py-1.5 flex items-center gap-2"
      >
        <span
          className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: sel.color, color: "#0B2341", fontWeight: 600 }}
        >
          {sel.label}
        </span>
        {sel.n !== undefined && <span className="gp-mono text-xs gp-text-muted">{sel.n}</span>}
        <ChevronDown size={14} className="gp-text-muted" />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute left-0 top-11 z-20 gp-panel py-1" style={{ minWidth: 240 }} role="listbox">
            {opciones.map((o) => {
              const activo = o.id === valor;
              return (
                <button
                  key={o.id} role="option" aria-selected={activo}
                  onClick={() => { onCambiar(o.id); setAbierto(false); }}
                  className="w-full px-2.5 py-2 gp-panel-hi flex items-center justify-between gap-3"
                >
                  <span
                    className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={activo
                      ? { background: o.color, color: "#0B2341", fontWeight: 600 }
                      : { background: `${o.color}22`, color: o.color, fontWeight: 600 }}
                  >
                    {o.label}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {o.n !== undefined && <span className="gp-mono text-xs gp-text-muted">{o.n}</span>}
                    {activo ? <Check size={13} style={{ color: o.color }} /> : <span style={{ width: 13 }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
