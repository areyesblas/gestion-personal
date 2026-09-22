// src/components/CentroMando/DashboardSaludo.jsx
//
// Saludo grande del Centro de mando: franja horaria + nombre, frase motivacional del día,
// fecha completa y mensaje de cierre. Segundo rediseño del 21 sept 2026 (nuevo pedido de
// Angel sobre el mismo día): vuelve a llevar foto de fondo a todo lo ancho y en todos los
// tamaños de pantalla (antes solo un acento en la esquina, solo desktop) — ahora es la foto
// de playa (antes vivía en MotivationalCard, se intercambiaron). El overlay es un degradado
// tenue en el navy de marca, solo lo necesario para que el texto blanco sea legible, no un
// velo oscuro que tape la foto. También baja a la mitad de alto que antes.

import bannerJpg from '../../assets/dashboard-banner-playa.jpg';
import bannerWebp from '../../assets/dashboard-banner-playa.webp';

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
    <div className="relative rounded-2xl overflow-hidden mb-5" style={{ minHeight: 90 }}>
      <picture className="absolute inset-0 block">
        <source srcSet={bannerWebp} type="image/webp" />
        <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(11,35,72,.72) 0%, rgba(11,35,72,.4) 55%, rgba(11,35,72,.22) 100%)' }} />

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap p-4" style={{ minHeight: 90 }}>
        <div className="min-w-0">
          <h1 className="gp-serif text-xl sm:text-2xl mb-1 text-white">
            {saludo}{primerNombre ? `, ${primerNombre}` : ''} <span>{emoji}</span>
          </h1>
          <p className="text-sm italic" style={{ color: 'rgba(255,255,255,.75)' }}>"{fraseDelDia()}"</p>
        </div>
        <div className="text-right leading-tight shrink-0 hidden sm:block">
          <p className="text-sm font-medium capitalize text-white">{fechaCompleta()}</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.75)' }}>Un día cada vez más cerca de tus metas.</p>
        </div>
      </div>
    </div>
  );
}
