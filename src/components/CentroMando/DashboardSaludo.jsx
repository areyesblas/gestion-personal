// src/components/CentroMando/DashboardSaludo.jsx
//
// Saludo grande del Centro de mando: franja horaria + nombre, frase motivacional del día,
// fecha completa y mensaje de cierre. Rediseño 21 sept 2026 (feedback de Angel sobre el
// prototipo): el panel vuelve a usar el fondo normal del tema (--panel, claro u oscuro según
// corresponda) en vez de una foto de fondo a todo lo ancho — la foto de montaña queda como un
// acento degradado en la esquina superior derecha, que se desvanece hacia el color del panel
// en vez de cubrirlo con un overlay oscuro. El texto usa los colores normales del tema, no
// blanco forzado, porque ya no hay foto oscura debajo.

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
    <div className="gp-panel relative overflow-hidden mb-5" style={{ minHeight: 180 }}>
      {/* Foto degradada, solo esquina superior derecha — no cubre el panel completo. */}
      <img
        src={dashboardSaludoBg}
        alt=""
        className="hidden sm:block absolute top-0 right-0 h-full object-cover"
        style={{ width: '48%' }}
      />
      <div
        className="hidden sm:block absolute top-0 right-0 h-full"
        style={{ width: '48%', background: 'linear-gradient(to left, transparent 35%, var(--panel) 92%)' }}
      />
      <div
        className="hidden sm:block absolute top-0 right-0 h-full"
        style={{ width: '48%', background: 'linear-gradient(to top, var(--panel) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap p-6" style={{ minHeight: 180 }}>
        <div className="min-w-0">
          <h1 className="gp-serif text-[26px] sm:text-3xl mb-1">
            {saludo}{primerNombre ? `, ${primerNombre}` : ''} <span>{emoji}</span>
          </h1>
          <p className="text-sm gp-text-muted italic">"{fraseDelDia()}"</p>
        </div>
        {/* padding-right para que el texto no quede encima de la parte visible de la foto (la
            franja de la derecha, donde el degradado ya no la tapa) */}
        <div className="text-right leading-tight shrink-0 hidden sm:block" style={{ paddingRight: '18%' }}>
          <p className="text-sm font-medium capitalize">{fechaCompleta()}</p>
          <p className="text-[11px] gp-text-muted">Un día cada vez más cerca de tus metas.</p>
        </div>
      </div>
    </div>
  );
}
