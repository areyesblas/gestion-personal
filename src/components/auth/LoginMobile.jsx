// src/components/auth/LoginMobile.jsx
//
// Una sola composición móvil que se adapta según `platform` ('ios' | 'android'):
// - iOS: switch tipo píldora, inputs rellenos, radios grandes, feedback de
//   presión por escala (convención iOS).
// - Android: checkbox cuadrado, inputs outlined con floating label
//   (convención Material), radios más cerrados, ripple al tocar.
//
// No es un escalado del diseño web: layout vertical propio, centrado,
// pensado para pantalla completa y teclado móvil.

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import ArkeyOneLogo from './ArkeyOneLogo';
import { useLoginForm, BANNER_COPY } from './useLoginForm';
import { usePlatform } from './platform';
import bgMobileJpg from '../../assets/login-bg-mobile.jpg';
import bgMobileWebp from '../../assets/login-bg-mobile.webp';

function Ripple() {
  const [ripples, setRipples] = useState([]);
  const trigger = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 550);
  };
  return {
    onPointerDown: trigger,
    nodes: ripples.map((r) => (
      <span
        key={r.id}
        className="absolute rounded-full bg-white/45 pointer-events-none"
        style={{
          left: r.x - 10, top: r.y - 10, width: 20, height: 20,
          animation: 'arkeyone-ripple .55s ease-out forwards',
        }}
      />
    )),
  };
}

export default function LoginMobile({ platform: platformProp, onCreateAccount, onForgotPassword }) {
  const detected = usePlatform();
  const platform = platformProp || (detected === 'android' ? 'android' : 'ios'); // default a iOS si es ambiguo/web angosto
  const isAndroid = platform === 'android';

  const {
    email, setEmail, password, setPassword,
    showPassword, setShowPassword, remember, setRemember,
    status, bannerType, canSubmit, handleSubmit,
  } = useLoginForm();

  const btnRipple = Ripple();
  const cardRadius = isAndroid ? 18 : 26;
  const fieldRadius = isAndroid ? 8 : 14;
  const btnRadius = isAndroid ? 10 : 16;

  return (
    <div className="min-h-screen relative flex flex-col bg-[#F8FAFF] overflow-hidden">
      <style>{`@keyframes arkeyone-ripple { to { transform: scale(3.2); opacity: 0; } }`}</style>

      <div className="absolute inset-0 z-0">
        <picture>
          <source srcSet={bgMobileWebp} type="image/webp" />
          <img
            src={bgMobileJpg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '62% 40%' }}
          />
        </picture>
        {/* Scrim: oscurece arriba (logo/tagline/idioma) y abajo (footer);
            la card queda sobre fondo blanco propio, no necesita scrim. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(180deg, rgba(4,14,34,.55) 0%, rgba(4,14,34,.18) 26%, rgba(4,14,34,0) 40%),
              linear-gradient(180deg, rgba(4,14,34,0) 62%, rgba(4,14,34,.6) 100%)
            `,
          }}
        />
      </div>

      <div
        className="relative z-10 flex-1 flex flex-col px-6"
        style={{ paddingTop: 'calc(18px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex flex-col items-center text-center mt-10 mb-6">
          <ArkeyOneLogo width={150} />
          <p className="text-xs font-medium text-white/90 mt-2 drop-shadow-sm">Ordena tu mundo, mejora tu vida.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/96 backdrop-blur-xl shadow-[0_16px_34px_-14px_rgba(10,45,107,.28)] px-7 pt-7 pb-7"
          style={{ borderRadius: cardRadius }}
        >
          {bannerType && (
            <div
              className={`flex items-start gap-1.5 text-[11px] font-medium px-2.5 py-2 rounded-[9px] mb-3 leading-snug ${
                bannerType === 'wrong' || bannerType === 'locked'
                  ? 'bg-[#FEF2F2] text-[#B42318] border border-[#FCD3D0]'
                  : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#C9DDFC]'
              }`}
            >
              {BANNER_COPY[bannerType]}
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-start gap-1.5 text-[11px] font-medium px-2.5 py-2 rounded-[9px] mb-3 bg-[#ECFDF5] text-[#067647] border border-[#BBF0D5]">
              ¡Bienvenido! Redirigiendo…
            </div>
          )}

          <h1 className="text-[18px] font-bold text-[#0A2D6B] text-center mb-0.5">Bienvenido de nuevo</h1>
          <p className="text-xs text-[#6B7280] text-center mb-7">Inicia sesión en tu centro de mando.</p>

          {/* ---- Email ---- */}
          {isAndroid ? (
            <FloatingField
              icon={<Mail size={18} className="text-[#8CA0C6] shrink-0" />}
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              radius={fieldRadius}
            />
          ) : (
            <IOSField
              icon={<Mail size={18} className="text-[#8CA0C6] shrink-0" />}
              placeholder="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              radius={fieldRadius}
            />
          )}

          {/* ---- Password ---- */}
          {isAndroid ? (
            <FloatingField
              icon={<Lock size={18} className="text-[#8CA0C6] shrink-0" />}
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              radius={fieldRadius}
              trailing={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#8CA0C6]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          ) : (
            <IOSField
              icon={<Lock size={18} className="text-[#8CA0C6] shrink-0" />}
              placeholder="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              radius={fieldRadius}
              trailing={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#8CA0C6]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          )}

          <div className="flex items-center justify-between mb-5 text-xs mt-1">
            <label className="flex items-center gap-1.5 text-[#334467] font-medium">
              {isAndroid ? (
                <button
                  type="button"
                  onClick={() => setRemember((v) => !v)}
                  className={`w-[18px] h-[18px] rounded-[4px] border-[1.6px] flex items-center justify-center transition ${
                    remember ? 'bg-[#007AFF] border-[#007AFF]' : 'bg-white border-[#C4D1EA]'
                  }`}
                >
                  {remember && <Check size={12} strokeWidth={3} className="text-white" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRemember((v) => !v)}
                  className={`w-11 h-[26px] rounded-full relative transition ${remember ? 'bg-[#007AFF]' : 'bg-[#DADFEA]'}`}
                >
                  <span
                    className="absolute top-0.5 w-[22px] h-[22px] rounded-full bg-white shadow transition-all"
                    style={{ left: remember ? 20 : 2 }}
                  />
                </button>
              )}
              Mantener sesión
            </label>
            <button type="button" onClick={onForgotPassword} className="text-[#007AFF] font-semibold text-[11.5px]">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            {...(isAndroid ? { onPointerDown: btnRipple.onPointerDown } : {})}
            className={`relative overflow-hidden w-full bg-[#007AFF] disabled:opacity-55 disabled:shadow-none text-white py-3.5 text-[13.5px] font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-[0_10px_20px_-8px_rgba(0,122,255,.55)] transition ${!isAndroid ? 'active:scale-[0.97]' : ''}`}
            style={{ borderRadius: btnRadius }}
          >
            {isAndroid && btnRipple.nodes}
            {status === 'loading' ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <>
                Iniciar sesión <ArrowRight size={15} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-[#6B7280] mb-3 mt-7">
            ¿No tienes cuenta?{' '}
            <button type="button" onClick={onCreateAccount} className="text-[#007AFF] font-semibold">
              Crear cuenta
            </button>
          </p>
          <p className="flex items-center justify-center gap-1 text-[10px] text-[#9AA7BE] text-center">
            <ShieldCheck size={11} /> Tus datos están protegidos. Privacidad · Términos
          </p>
        </form>

        <div className="mt-auto text-center py-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <span className="text-[12.5px] font-semibold text-white drop-shadow-sm">Más orden. Más vida.</span>
          <div className="w-[34px] h-[2.5px] rounded mt-2 mx-auto" style={{ background: '#60A5FA' }} />
        </div>
      </div>
    </div>
  );
}

// ---- iOS: input relleno, con borde sutil en reposo para separarse de la card blanca ----
function IOSField({ icon, placeholder, type, value, onChange, radius, trailing }) {
  return (
    <div
      className="flex items-center gap-2.5 bg-[#F6F8FD] border-[1.5px] border-[#E7EBF5] focus-within:border-[#007AFF] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#007AFF]/10 px-3.5 py-3 mb-3.5 transition"
      style={{ borderRadius: radius }}
    >
      {icon}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-base text-[#1F2937] placeholder:text-[#9AA7BE]"
      />
      {trailing}
    </div>
  );
}

// ---- Android: outlined + floating label (patrón Material) ----
function FloatingField({ icon, label, type, value, onChange, radius, trailing }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div className="relative mb-4">
      <div
        className={`flex items-center gap-2.5 bg-white border-[1.5px] px-3.5 py-3 transition ${
          focused ? 'border-[#007AFF]' : 'border-[#D7DEEC]'
        }`}
        style={{ borderRadius: radius }}
      >
        {icon}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-base text-[#1F2937] w-full"
        />
        {trailing}
      </div>
      <label
        className={`absolute px-1 pointer-events-none transition-all ${
          active
            ? '-top-2 left-3.5 text-[11px] font-semibold text-[#007AFF] bg-white'
            : 'top-1/2 -translate-y-1/2 left-[42px] text-[13px] text-[#8CA0C6]'
        }`}
      >
        {label}
      </label>
    </div>
  );
}
