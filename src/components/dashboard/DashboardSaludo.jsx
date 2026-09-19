// src/components/dashboard/DashboardSaludo.jsx
//
// Saludo grande del Centro de mando: franja horaria + nombre, frase motivacional del día,
// y fecha completa. La foto de fondo (montañas) es de baja resolución nativa (495x145px),
// por eso se muestra acotada como elemento decorativo, no a pantalla completa.

import dashboardSaludoBg from '../../assets/dashboard-saludo-bg.jpg';

const FRASES = [
  'Disciplina hoy, resultados mañana.',
  'Un paso a la vez, sin perder el rumbo.',
  'Ordena tu mundo, mejora tu vida.',
  'Lo constante vence a lo intenso.',
  'Hoy también cuenta.',
  'Pequeños avances, grandes resultados.',
  'Tu enfoque de hoy define tu mañana.',
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
    <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
      <div className="min-w-0">
        <h1 className="gp-serif text-[26px] sm:text-3xl mb-1">
          {saludo}{primerNombre ? `, ${primerNombre}` : ''} <span>{emoji}</span>
        </h1>
        <p className="text-sm gp-text-muted italic">"{fraseDelDia()}"</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right leading-tight hidden md:block">
          <p className="text-sm font-medium capitalize">{fechaCompleta()}</p>
          <p className="text-[11px] gp-text-muted">Un día más cerca de tus metas.</p>
        </div>
        <img
          src={dashboardSaludoBg}
          alt=""
          className="hidden sm:block rounded-2xl object-cover shrink-0"
          style={{ width: 200, height: 96 }}
        />
      </div>
    </div>
  );
}
