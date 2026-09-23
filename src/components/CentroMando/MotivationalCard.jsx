// src/components/CentroMando/MotivationalCard.jsx
//
// Banner motivacional al final del Centro de mando: foto de fondo + frase + logo, borde a
// borde de pantalla (márgenes negativos cancelan el padding horizontal del contenedor de
// contenido, `p-4 md:p-6` en App.jsx). Fijo, no es un widget configurable.
// Layout pedido por Angel el 22 sept 2026 sobre un mockup de referencia: eslogan a la
// izquierda y logo ARKEYONE a la derecha, ambos centrados verticalmente en la franja; texto
// más grueso/contrastado (font-bold + sombra) que la versión centrada/sin-logo anterior.
// Foto: valle verde con colinas (Măgura, Rumania, Unsplash License, uso comercial libre) —
// object-position baja el encuadre para mostrar colinas y casas, no el cielo nublado de arriba.

import ArkeyOneLogo from '../auth/ArkeyOneLogo';
import bannerJpg from '../../assets/dashboard-banner-valle.jpg';

export default function MotivationalCard() {
  return (
    <div className="relative overflow-hidden -mx-4 md:-mx-6 mb-6" style={{ minHeight: 85 }}>
      <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 40%' }} />
      <div className="absolute inset-0" style={{ background: 'rgba(11,35,72,.6)' }} />
      <div className="relative z-10 flex items-center justify-between gap-4 p-4 md:px-6" style={{ minHeight: 85 }}>
        <p
          className="text-white text-lg sm:text-xl font-bold leading-snug"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,.35)' }}
        >
          "Un mejor hoy, crea un mejor mañana."
        </p>
        <ArkeyOneLogo variant="lockup" width={100} className="shrink-0" />
      </div>
    </div>
  );
}
