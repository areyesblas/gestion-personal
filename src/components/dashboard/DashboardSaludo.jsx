// src/components/dashboard/DashboardSaludo.jsx
//
// Saludo grande del Centro de mando: franja horaria + nombre, frase motivacional del día,
// fecha completa y mensaje de cierre — todo sobre un banner de foto a todo lo ancho de la
// sección (rediseño pedido por Angel, 20 sept 2026; antes la foto era un recuadro chico
// decorativo de 495x145px, ahora es el fondo completo en alta resolución).

import dashboardSaludoBg from '../../assets/dashboard-saludo-bg.jpg';

const FRASES = [
  'Disciplina hoy, resultados mañana.',
  'Un paso a la vez, sin perder el rumbo.',
  'Ordena tu mundo, mejora tu vida.',
  'Lo constante vence a lo intenso.',
  'Cada nuevo día, es una nueva oportunidad para mejorar.',
  'Pequeños avances, grandes resultados.',
  'Tu enfoque de hoy define tu mañana.',
  'No se trata de ser perfecto, se trata de ser constante.',
  'Cada acción de hoy construye el mañana que quieres.',
  'El progreso, aunque sea pequeño, sigue siendo progreso.',
];

function fraseDelDia() {
  const dia = Math.floor(Date.now() / 86400000);
  return FRASES[dia % FRASES.length];
}

function fechaCompleta() {
  const txt = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export default function DashboardSaludo({ primerNombre }) {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const emoji = h < 12 ? '☀️' : h < 19 ? '🌤️' : '🌙';

  return (
    <div className="relative rounded-2xl overflow-hidden mb-5" style={{ minHeight: 200 }}>
      <img src={dashboardSaludoBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(120deg, rgba(11,35,72,.85) 0%, rgba(11,35,72,.55) 55%, rgba(11,35,72,.3) 100%)' }}
      />
      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap p-6" style={{ minHeight: 200 }}>
        <div className="min-w-0">
          <h1 className="gp-serif text-[26px] sm:text-3xl mb-1 text-white">
            {saludo}{primerNombre ? `, ${primerNombre}` : ''} <span>{emoji}</span>
          </h1>
          <p className="text-sm text-white italic" style={{ opacity: .85 }}>"{fraseDelDia()}"</p>
        </div>
        <div className="text-right leading-tight shrink-0 hidden sm:block">
          <p className="text-sm font-medium capitalize text-white">{fechaCompleta()}</p>
          <p className="text-[11px] text-white" style={{ opacity: .75 }}>Un día cada vez más cerca de tus metas.</p>
        </div>
      </div>
    </div>
  );
}
