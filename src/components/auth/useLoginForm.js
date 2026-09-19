// src/components/auth/useLoginForm.js
//
// Lógica compartida entre LoginWeb y LoginMobile: validación, estados
// (idle/loading/success/error variants) y la llamada real a Supabase Auth.
// Mantiene la UI (Web/iOS/Android) separada de la lógica, evitando
// duplicar el flujo de autenticación en tres archivos.

import { useState, useEffect, useCallback } from 'react';
// Ajusta esta ruta al path real de tu cliente Supabase en el proyecto.
import { supabase } from '../../supabaseClient';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// status: 'idle' | 'loading' | 'success'
// bannerType: null | 'wrong' | 'locked' | 'offline' | 'expired'
export function useLoginForm({ onSuccess } = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [status, setStatus] = useState('idle');
  const [bannerType, setBannerType] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // Detecta "sesión expirada" vía query param (?motivo=sesion_expirada),
  // el mismo patrón que ya usan tus redirects de sesión.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('motivo') === 'sesion_expirada') {
      setBannerType('expired');
    }
  }, []);

  // Detecta pérdida de conexión en tiempo real.
  useEffect(() => {
    const goOffline = () => setBannerType('offline');
    const goOnline = () => setBannerType((b) => (b === 'offline' ? null : b));
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const emailValid = email === '' || EMAIL_RE.test(email);
  const canSubmit = email.length > 0 && password.length > 0 && emailValid && status !== 'loading';

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (!canSubmit) return;

      if (!navigator.onLine) {
        setBannerType('offline');
        return;
      }
      if (attempts >= 5) {
        setBannerType('locked');
        return;
      }

      setStatus('loading');
      setBannerType(null);

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setStatus('idle');
        setAttempts((a) => a + 1);
        // Supabase devuelve "Invalid login credentials" para credenciales
        // incorrectas; ajusta este check si tu backend distingue otros casos.
        if (error.status === 429) {
          setBannerType('locked');
        } else {
          setBannerType('wrong');
        }
        return;
      }

      if (remember) {
        localStorage.setItem('arkeyone_login_at', String(Date.now()));
      }

      setStatus('success');
      setBannerType(null);
      if (onSuccess) onSuccess();
    },
    [email, password, remember, canSubmit, attempts, onSuccess]
  );

  return {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    remember, setRemember,
    emailTouched, setEmailTouched,
    emailValid,
    status,
    bannerType, setBannerType,
    canSubmit,
    handleSubmit,
  };
}

export const BANNER_COPY = {
  wrong: 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
  locked: 'Demasiados intentos. Vuelve a intentarlo en 15 minutos.',
  offline: 'Sin conexión. Verifica tu internet e intenta de nuevo.',
  expired: 'Tu sesión anterior expiró. Vuelve a iniciar sesión.',
};
