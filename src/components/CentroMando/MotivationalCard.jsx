// src/components/CentroMando/MotivationalCard.jsx
//
// Banner motivacional al final del Centro de mando: foto de fondo (atardecer costero) +
// frase + wordmark oficial, reutilizando el componente de logo ya existente (sin duplicarlo).
// El ícono chico arriba a la derecha es un sello adicional (pedido por Angel, 20 sept 2026) —
// no reemplaza el lockup grande de junto al texto, que sigue siendo la firma principal.

import ArkeyOneLogo from '../auth/ArkeyOneLogo';
import bannerJpg from '../../assets/dashboard-banner-bg.jpg';
import bannerWebp from '../../assets/dashboard-banner-bg.webp';

export default function MotivationalCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden h-full" style={{ minHeight: 170 }}>
      <picture className="absolute inset-0 block">
        <source srcSet={bannerWebp} type="image/webp" />
        <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(11,35,72,.82) 0%, rgba(11,35,72,.45) 55%, rgba(11,35,72,.2) 100%)' }} />
      <ArkeyOneLogo variant="icon" width={34} className="absolute top-4 right-4 z-10" />
      <div className="relative z-10 h-full flex flex-col justify-center gap-3 p-6" style={{ minHeight: 170 }}>
        <p className="text-white text-lg sm:text-xl font-medium leading-snug max-w-md">
          "Un mejor hoy,<br />crea un mejor mañana."
        </p>
        <ArkeyOneLogo variant="lockup" width={110} />
      </div>
    </div>
  );
}
