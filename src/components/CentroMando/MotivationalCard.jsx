// src/components/CentroMando/MotivationalCard.jsx
//
// Banner motivacional al final del Centro de mando: foto de fondo + frase, borde a borde de
// pantalla (márgenes negativos cancelan el padding horizontal del contenedor de contenido,
// `p-4 md:p-6` en App.jsx). Fijo, no es un widget configurable. Mitad de alto, frase centrada,
// sin logo ARKEYONE — overlay uniforme (pedido de Angel, 22 sept 2026).
// Foto: valle verde con colinas (Măgura, Rumania, Unsplash License, uso comercial libre) —
// reemplaza la de montañas con niebla porque a esta altura tan corta se veía sobre todo la
// franja plana de niebla en vez de algo interesante; Angel eligió esta entre 3 opciones
// propuestas el 22 sept 2026. object-position baja el encuadre para mostrar colinas y casas,
// no el cielo nublado de arriba.

import bannerJpg from '../../assets/dashboard-banner-valle.jpg';

export default function MotivationalCard() {
  return (
    <div className="relative overflow-hidden -mx-4 md:-mx-6 mb-6" style={{ minHeight: 85 }}>
      <img src={bannerJpg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 40%' }} />
      <div className="absolute inset-0" style={{ background: 'rgba(11,35,72,.55)' }} />
      <div className="relative z-10 flex items-center justify-center text-center p-4" style={{ minHeight: 85 }}>
        <p className="text-white text-base sm:text-lg font-medium leading-snug">
          "Un mejor hoy, crea un mejor mañana."
        </p>
      </div>
    </div>
  );
}
