// src/components/agenda/TarjetaRapidaAgenda.jsx
//
// Tarjeta rápida de la Agenda: lo que se abre al tocar un bloque (una cita o una tarea) sin tocar
// su checkbox. En escritorio sale como popover anclado al bloque; en celular como hoja inferior
// (bottom sheet), que es el gesto natural del sistema y deja los botones al alcance del pulgar.
//
// No edita nada por su cuenta ni conoce Supabase: solo muestra lo que el padre le pasa y avisa qué
// botón se tocó. El formulario completo, el borrado y los recordatorios los sigue manejando la
// Agenda, que es quien tiene el contexto.
//
// "Abrir registro origen" solo aparece cuando la tarea nació en otro módulo (Finanzas, Eventos,
// Medicamentos, Activos digitales…). No duplica el dato: manda a ver el registro real.

import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Clock, ExternalLink, X } from 'lucide-react';

const ANCHO = 300;

// El ancho mínimo de un objetivo táctil en iPhone son 44 px (guía de Apple). En escritorio con
// mouse no hace falta y 36 se ve mejor proporcionado.
const altoBoton = (esMovil) => (esMovil ? 44 : 36);

function Dato({ etiqueta, valor }) {
  if (!valor) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="gp-text-muted shrink-0" style={{ width: 74 }}>{etiqueta}</span>
      <span className="min-w-0 break-words">{valor}</span>
    </div>
  );
}

export default function TarjetaRapidaAgenda({
  tipo, titulo, cuando, proyecto, contacto, responsable, completada, esMovil, rect,
  onCerrar, onRealizada, onEditar, onReprogramar, onAbrirOrigen, etiquetaOrigen,
}) {
  const [eligiendoFecha, setEligiendoFecha] = useState(false);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('09:00');
  const cajaRef = useRef(null);

  // Cerrar con Escape — en escritorio es lo que espera cualquiera que abra un popover.
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // Posición del popover en escritorio: pegado al bloque, pero recortado contra los bordes de la
  // ventana para que nunca se dibuje fuera de la vista (mismo criterio que el botón flotante de
  // captura). En celular no aplica: la hoja va siempre abajo, de lado a lado.
  const estiloCaja = esMovil
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, borderRadius: '16px 16px 0 0', paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }
    : (() => {
        const margen = 8;
        const izq = Math.min(Math.max(margen, (rect?.right ?? 0) + margen), window.innerWidth - ANCHO - margen);
        const arriba = Math.min(Math.max(margen, rect?.top ?? 0), window.innerHeight - 320);
        return { position: 'fixed', left: izq, top: arriba, width: ANCHO, borderRadius: 14 };
      })();

  const botonFila = 'w-full flex items-center gap-2 px-3 text-sm rounded text-left';

  return (
    <div className="fixed inset-0 z-[80]" onPointerDown={onCerrar} style={{ background: esMovil ? 'rgba(0,0,0,.45)' : 'transparent' }}>
      <div
        ref={cajaRef}
        className="gp-panel p-4"
        style={estiloCaja}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide gp-text-muted">{tipo === 'cita' ? 'Cita' : 'Tarea'}</p>
            <p className="text-sm font-medium break-words" style={{ textDecoration: completada ? 'line-through' : 'none' }}>{titulo}</p>
          </div>
          <button onClick={onCerrar} className="gp-text-muted shrink-0 flex items-center justify-center" style={{ width: esMovil ? 44 : 28, height: esMovil ? 44 : 28 }} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1 mb-3">
          <Dato etiqueta="Cuándo" valor={cuando} />
          <Dato etiqueta="Proyecto" valor={proyecto} />
          <Dato etiqueta="Contacto" valor={contacto} />
          <Dato etiqueta="Responsable" valor={responsable} />
        </div>

        {!eligiendoFecha ? (
          <div className="flex flex-col gap-1.5">
            <button className={`gp-btn ${botonFila}`} style={{ height: altoBoton(esMovil) }} onClick={onRealizada}>
              <Check size={16} /> {completada ? 'Marcar como pendiente' : tipo === 'cita' ? 'Realizada / asistí' : 'Realizada'}
            </button>
            <button className={`gp-btn-ghost ${botonFila}`} style={{ height: altoBoton(esMovil) }} onClick={onEditar}>
              <Pencil size={16} /> Editar
            </button>

            <p className="text-[10px] uppercase tracking-wide gp-text-muted mt-1.5">Reprogramar</p>
            <div className="flex gap-1.5">
              <button className="gp-btn-ghost flex-1 text-xs rounded" style={{ height: altoBoton(esMovil) }} onClick={() => onReprogramar({ tipo: 'mas1h' })}>+1 hora</button>
              <button className="gp-btn-ghost flex-1 text-xs rounded" style={{ height: altoBoton(esMovil) }} onClick={() => onReprogramar({ tipo: 'manana' })}>Mañana</button>
              <button className="gp-btn-ghost flex-1 text-xs rounded" style={{ height: altoBoton(esMovil) }} onClick={() => setEligiendoFecha(true)}>Elegir…</button>
            </div>

            {onAbrirOrigen && (
              <button className={`gp-btn-ghost ${botonFila} mt-1.5`} style={{ height: altoBoton(esMovil) }} onClick={onAbrirOrigen}>
                <ExternalLink size={16} /> Abrir {etiquetaOrigen || 'registro origen'}
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase tracking-wide gp-text-muted mb-1.5 flex items-center gap-1"><Clock size={11} /> Nueva fecha y hora</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="gp-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <input type="time" className="gp-input" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <div className="flex gap-1.5 mt-2">
              <button className="gp-btn-ghost flex-1 text-xs rounded" style={{ height: altoBoton(esMovil) }} onClick={() => setEligiendoFecha(false)}>Cancelar</button>
              <button className="gp-btn flex-1 text-xs rounded" style={{ height: altoBoton(esMovil) }} disabled={!fecha}
                onClick={() => onReprogramar({ tipo: 'fecha', fecha, hora })}>
                Reprogramar
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] gp-text-muted mt-3">Para eliminar, entra a Editar.</p>
      </div>
    </div>
  );
}
