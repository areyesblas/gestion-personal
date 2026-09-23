// src/components/CentroMando/MotivationalCard.jsx
//
// Banner motivacional al final del Centro de mando: foto de fondo + frase + logo. Contenido
// dentro del padding del área de contenido, con esquinas redondeadas — como las demás tarjetas
// y como el mockup de referencia de Angel (22 sept 2026), NO borde a borde (eso era un intento
// anterior, revertido al comparar contra el mockup real). Fijo, no es un widget configurable.
// Layout: eslogan a la izquierda y logo ARKEYONE a la derecha, ambos centrados verticalmente.
// Foto: panorámica de montaña nevada al atardecer que Angel proporcionó directamente (ya
// recortada a formato de banner, con relleno transparente arriba/abajo que se quitó con un
// crop al bbox del canal alfa — ver commit de este cambio). Reemplaza al valle verde: Angel
// pidió explícitamente "usa esta imagen".
// Contraste del texto (22 sept 2026, segunda vuelta -- Angel: "se ven muy tenues... más
// chica la letra, comparala bien"): el mockup no usa un overlay parejo, usa un degradado
// direccional (oscuro donde va el texto, transparente hacia el pico/sol/logo) — replicado
// aquí en vez del rgba plano que se usaba antes. Texto subido a text-2xl/font-extrabold para
// igualar el peso visual del mockup.

import ArkeyOneLogo from '../auth/ArkeyOneLogo';
import bannerJpg from '../../assets/dashboard-banner-montanas-nevadas.jpg';

export default function MotivationalCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 min-h-[90px] sm:min-h-[110px]">
      <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 45%' }} />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(100deg, rgba(11,35,72,.78) 0%, rgba(11,35,72,.5) 35%, rgba(11,35,72,.15) 65%, rgba(11,35,72,0) 85%)' }}
      />
      <div className="relative z-10 flex items-center justify-between gap-3 md:gap-4 p-4 md:p-5 md:px-8 min-h-[90px] sm:min-h-[110px]">
        <p
          className="text-white text-base sm:text-xl md:text-2xl font-extrabold leading-snug"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,.45)' }}
        >
          "Un mejor hoy, crea un mejor mañana."
        </p>
        <ArkeyOneLogo variant="lockup" width={130} className="w-20 sm:w-28 md:w-32 shrink-0" />
      </div>
    </div>
  );
}
