// src/components/agenda/ToastDeshacer.jsx
//
// Aviso corto con botón "Deshacer" para acciones de un toque que no abren nada (marcar una tarea
// o una cita como realizada desde su checkbox). Dura 5 segundos y se va solo.
//
// El temporizador se reinicia cada vez que cambia `clave`: si marcas dos tareas seguidas, el aviso
// no se cierra a destiempo por culpa del primero. Va anclado abajo y respeta el área segura del
// iPhone para no quedar tapado por la barra de gestos ni por la navegación inferior de la app.

import { useEffect } from 'react';
import { Undo2 } from 'lucide-react';

export default function ToastDeshacer({ clave, texto, onDeshacer, onCerrar, duracionMs = 5000 }) {
  useEffect(() => {
    const t = setTimeout(onCerrar, duracionMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, duracionMs]);

  return (
    <div
      className="fixed z-[85] flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        left: 16,
        right: 16,
        bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 420,
        margin: '0 auto',
        background: 'var(--panel-hi)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,.28)',
      }}
      role="status"
    >
      <span className="text-sm flex-1 min-w-0 truncate">{texto}</span>
      <button
        onClick={onDeshacer}
        className="gp-btn flex items-center gap-1.5 px-3 text-xs rounded shrink-0"
        style={{ height: 40 }}
      >
        <Undo2 size={14} /> Deshacer
      </button>
    </div>
  );
}
