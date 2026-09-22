// src/components/CentroMando/ArkiWidget.jsx
//
// Widget "ARKI" del Centro de mando: 4 botones de prompt ya armado (Resumir mi día / Crear
// tarea / Ideas para hoy / Analizar finanzas) que mandan un mensaje a la misma Edge Function
// asistente-ia que ya usa el asistente de voz — sin historial ni conversación de ida y vuelta,
// solo una respuesta de texto mostrada aquí mismo. No es un chat nuevo (eso es una función
// grande fuera de alcance de este rediseño) — es "ejecutar una acción" sobre el mismo asistente
// que ya existe. El fetch real vive en App.jsx (onPreguntar), que ya tiene el cliente supabase.

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

const PROMPTS = [
  { key: 'resumen', label: 'Resumir mi día', mensaje: 'Resume mi día de hoy: qué tareas, citas y pendientes tengo.' },
  { key: 'tarea', label: 'Crear tarea', mensaje: 'Quiero crear una tarea nueva, pregúntame qué necesitas para registrarla.' },
  { key: 'ideas', label: 'Ideas para hoy', mensaje: 'Dame 3 ideas breves y accionables para aprovechar mi día de hoy, según mis proyectos y hábitos.' },
  { key: 'finanzas', label: 'Analizar finanzas', mensaje: 'Dame un resumen breve de cómo van mis finanzas este mes.' },
];

export default function ArkiWidget({ onPreguntar }) {
  const [cargando, setCargando] = useState(null);
  const [respuesta, setRespuesta] = useState(null);

  const enviar = async (p) => {
    setCargando(p.key);
    setRespuesta(null);
    const texto = await onPreguntar(p.mensaje);
    setCargando(null);
    setRespuesta(texto || 'No pude responder, intenta de nuevo.');
  };

  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="gp-text-gold" />
        <h3 className="text-sm font-medium">ARKI</h3>
      </div>
      {respuesta ? (
        <div className="flex-1 overflow-y-auto text-sm gp-text-muted whitespace-pre-wrap mb-3">{respuesta}</div>
      ) : (
        <p className="text-xs gp-text-muted mb-3 flex-1">Pídele a ARKI un vistazo rápido de tu día.</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {PROMPTS.map((p) => (
          <button
            key={p.key}
            onClick={() => enviar(p)}
            disabled={cargando !== null}
            className="gp-btn-ghost rounded-lg px-2 py-1.5 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ border: '1px solid var(--border)' }}
          >
            {cargando === p.key ? <Loader2 size={12} className="animate-spin" /> : p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
