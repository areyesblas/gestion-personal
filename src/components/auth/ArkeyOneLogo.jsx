// src/components/auth/ArkeyOneLogo.jsx
//
// Usa el logo OFICIAL provisto por Angel (assets/arkeyone-lockup.png,
// recortado a transparencia a partir de LogoARKEY-ONE.png) en vez de
// una recreación en SVG: el original incluye el degradado y el swoosh
// que una recreación vectorial simplificada no reproducía fielmente.
//
// `variant="lockup"` = ícono + wordmark "ARKEY·ONE" (uso principal).
// `variant="icon"`   = solo el símbolo "A", para espacios reducidos
//                      (favicon, avatar, nav compacta).

import logoLockup from '../../assets/arkeyone-lockup.png';
import logoIcon from '../../assets/arkeyone-icon.png';

export default function ArkeyOneLogo({ variant = 'lockup', width = 230, className = '' }) {
  const src = variant === 'icon' ? logoIcon : logoLockup;
  return (
    <img
      src={src}
      alt="ARKEY·ONE"
      width={width}
      className={`block ${className}`}
      style={{ filter: 'drop-shadow(0 4px 10px rgba(6,26,63,.18))' }}
    />
  );
}
