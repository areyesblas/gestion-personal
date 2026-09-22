// src/components/CentroMando/MotivationalCard.jsx
//
// Banner motivacional al final del Centro de mando: foto de fondo (montañas al amanecer) +
// frase + wordmark oficial. Fijo (no es un widget configurable) — pedido de Angel, 22 sept
// 2026: eslogan a la izquierda, logo ARKEYONE arriba a la derecha, un solo logo (antes había
// uno chico arriba y el lockup grande junto al texto, redundante). Además, a diferencia de
// DashboardSaludo (que respeta el padding del contenedor), este banner es borde a borde: usa
// márgenes negativos para cancelar el padding horizontal del contenedor de contenido
// (`p-4 md:p-6` en App.jsx) y así llegar a los bordes reales de la pantalla — sin esquinas
// redondeadas en los lados, porque ya no se lee como tarjeta sino como franja de ancho completo.
// La foto de playa que vivía aquí se movió al banner de arriba (DashboardSaludo) — pedido de
// Angel del 21 sept 2026 de intercambiar cuál imagen va arriba y cuál abajo.

import ArkeyOneLogo from '../auth/ArkeyOneLogo';
import bannerJpg from '../../assets/dashboard-banner-montanas.jpg';

export default function MotivationalCard() {
  return (
    <div className="relative overflow-hidden -mx-4 md:-mx-6 mb-6" style={{ minHeight: 170 }}>
      <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(11,35,72,.82) 0%, rgba(11,35,72,.45) 55%, rgba(11,35,72,.2) 100%)' }} />
      <ArkeyOneLogo variant="lockup" width={130} className="absolute top-5 right-5 md:right-6 z-10" />
      <div className="relative z-10 flex items-center p-6 md:px-8" style={{ minHeight: 170 }}>
        <p className="text-white text-lg sm:text-xl font-medium leading-snug max-w-md">
          "Un mejor hoy,<br />crea un mejor mañana."
        </p>
      </div>
    </div>
  );
}
