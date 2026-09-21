// src/components/CentroMando/CalendarioWidget.jsx
//
// Mini-calendario de mes del Centro de mando (nuevo, 21 sept 2026): de solo lectura, no
// duplica Agenda — solo pinta un punto en los días con citas (dato ya cargado, data.citas) y
// manda a Agenda al tocar un día o el título. No crea ni edita nada por sí mismo.

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';

const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function construirGrid(anio, mes) {
  // mes: 0-11. Semana empieza en lunes.
  const primerDia = new Date(anio, mes, 1);
  const offset = (primerDia.getDay() + 6) % 7; // 0=lunes
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

export default function CalendarioWidget({ citas, onVerDia }) {
  const hoy = new Date();
  const [mesVisto, setMesVisto] = useState(hoy.getMonth());
  const [anioVisto, setAnioVisto] = useState(hoy.getFullYear());

  const diasConCita = new Set(
    (citas || [])
      .filter((c) => { const f = new Date(c.fechaHora); return f.getMonth() === mesVisto && f.getFullYear() === anioVisto; })
      .map((c) => new Date(c.fechaHora).getDate())
  );
  const celdas = construirGrid(anioVisto, mesVisto);
  const esHoy = (d) => d === hoy.getDate() && mesVisto === hoy.getMonth() && anioVisto === hoy.getFullYear();

  const cambiarMes = (delta) => {
    let m = mesVisto + delta, a = anioVisto;
    if (m < 0) { m = 11; a -= 1; } else if (m > 11) { m = 0; a += 1; }
    setMesVisto(m); setAnioVisto(a);
  };

  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><CalendarClock size={14} className="gp-text-teal" /><h3 className="text-sm font-medium">Calendario</h3></div>
        <button onClick={onVerDia} className="text-xs gp-text-gold">Ver agenda →</button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => cambiarMes(-1)} className="p-1 rounded gp-btn-ghost" aria-label="Mes anterior"><ChevronLeft size={14} /></button>
        <span className="text-xs font-medium">{MESES[mesVisto]} {anioVisto}</span>
        <button onClick={() => cambiarMes(1)} className="p-1 rounded gp-btn-ghost" aria-label="Mes siguiente"><ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS_CORTOS.map((d, i) => <span key={i} className="text-[10px] gp-text-muted">{d}</span>)}
        {celdas.map((d, i) => (
          <button
            key={i}
            onClick={() => d && onVerDia()}
            disabled={!d}
            className="aspect-square flex flex-col items-center justify-center rounded text-xs relative"
            style={esHoy(d) ? { background: 'var(--gold)', color: '#161822', fontWeight: 600 } : { color: d ? 'var(--text)' : 'transparent' }}
          >
            {d || '·'}
            {d && diasConCita.has(d) && !esHoy(d) && (
              <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: 'var(--teal)' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
