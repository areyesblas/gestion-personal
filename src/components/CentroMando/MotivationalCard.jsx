// src/components/CentroMando/MotivationalCard.jsx
//
// Banner motivacional al final del Centro de mando: foto de fondo (montañas al amanecer) +
// frase, borde a borde de pantalla (márgenes negativos cancelan el padding horizontal del
// contenedor de contenido, `p-4 md:p-6` en App.jsx). Fijo, no es un widget configurable.
// Pedido de Angel, 22 sept 2026 (segundo ajuste el mismo día): mitad de alto, frase centrada
// y sin el logo ARKEYONE (antes iba arriba a la derecha) — el overlay pasa de degradado
// direccional a uniforme porque ya no hay que dejar una zona clara para el logo.
// La foto de playa que vivía aquí se movió al banner de arriba (DashboardSaludo) — pedido de
// Angel del 21 sept 2026 de intercambiar cuál imagen va arriba y cuál abajo.

import bannerJpg from '../../assets/dashboard-banner-montanas.jpg';

export default function MotivationalCard() {
  return (
    <div className="relative overflow-hidden -mx-4 md:-mx-6 mb-6" style={{ minHeight: 85 }}>
      <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'rgba(11,35,72,.55)' }} />
      <div className="relative z-10 flex items-center justify-center text-center p-4" style={{ minHeight: 85 }}>
        <p className="text-white text-base sm:text-lg font-medium leading-snug">
          "Un mejor hoy, crea un mejor mañana."
        </p>
      </div>
    </div>
  );
}
