// src/components/auth/platform.js
//
// Detecta si el dispositivo/navegador actual debe recibir la composición
// "ios", "android" o "web" del Login. No decide breakpoints de layout
// (eso lo hace CSS/Tailwind) — decide qué *patrones de interacción*
// (toggle vs checkbox, ripple vs scale, input outlined vs filled) aplicar.

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'web';

  const ua = navigator.userAgent || '';
  const isTouchPrimary =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches;

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reporta UA de Mac pero con soporte multitáctil
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/.test(ua);

  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  if (!isTouchPrimary) return 'web';

  // Táctil pero no identificable (navegador de escritorio en modo device,
  // o UA no estándar): tratar como web para no asumir de más.
  return 'web';
}

// Hook simple para usar en componentes
import { useState, useEffect } from 'react';

export function usePlatform() {
  const [platform, setPlatform] = useState(detectPlatform);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return platform;
}
