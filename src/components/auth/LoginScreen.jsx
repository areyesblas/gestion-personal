// src/components/auth/LoginScreen.jsx
//
// Reemplaza a tu pantalla de Login actual en App.jsx. Decide Web vs
// Mobile por viewport real (no solo por user-agent, para cubrir PWA
// instalada / modo standalone / tablets), y dentro de Mobile,
// LoginMobile decide iOS vs Android por user-agent.
//
// Uso en App.jsx:
//   import LoginScreen from './components/auth/LoginScreen';
//   ...
//   {!session && <LoginScreen onCreateAccount={() => setVista('registro')} onForgotPassword={() => setVista('recuperar')} />}

import { useState, useEffect } from 'react';
import LoginWeb from './LoginWeb';
import LoginMobile from './LoginMobile';

const MOBILE_BREAKPOINT = 860; // por debajo de esto, composición móvil

export default function LoginScreen(props) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler);
    };
  }, []);

  return isMobile ? <LoginMobile {...props} /> : <LoginWeb {...props} />;
}
