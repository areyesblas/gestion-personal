// src/components/auth/LoginWeb.jsx
//
// Composición de escritorio: panel izquierdo de marca (hero + features)
// y panel derecho con la tarjeta de login. NO es una versión reducida
// de la vista móvil — usa el espacio horizontal para vender el producto
// antes de pedir credenciales.

import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import ArkeyOneLogo from './ArkeyOneLogo';
import { useLoginForm, BANNER_COPY } from './useLoginForm';
import bgWebJpg from '../../assets/login-bg-web.jpg';
import bgWebWebp from '../../assets/login-bg-web.webp';

const FEATURES = [
  'Agenda', 'Tareas', 'Proyectos', 'Finanzas',
  'Salud', 'Contactos', 'Hábitos', 'Notas', 'IA Asistente', 'Y más...',
];

export default function LoginWeb({ onCreateAccount, onForgotPassword }) {
  const {
    email, setEmail, password, setPassword,
    showPassword, setShowPassword, remember, setRemember,
    emailTouched, setEmailTouched, emailValid,
    status, bannerType, canSubmit, handleSubmit,
  } = useLoginForm();

  return (
    <div className="min-h-screen relative flex overflow-hidden bg-[#0B2341]">
      {/* Foto de fondo a pantalla completa -- antes solo vivía dentro del panel de marca,
          ahora se comparte con el panel de login también (ver el cuadro azul pastel abajo). */}
      <picture className="absolute inset-0 block z-0">
        <source srcSet={bgWebWebp} type="image/webp" />
        <img
          src={bgWebJpg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '68% 42%' }}
        />
      </picture>
      {/* Scrim: sombra a la izquierda (legibilidad del texto de marca), abajo (pie de página)
          y un refuerzo extra detrás del logo — la foto es clara y cambia de brillo según la
          zona, así que no basta un degradado plano. El lado derecho (donde flota el cuadro de
          login) no necesita scrim propio: el cuadro es opaco y lo cubre por completo. */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage: `
            radial-gradient(560px 300px at 0% 0%, rgba(4,14,34,.62) 0%, rgba(4,14,34,0) 72%),
            linear-gradient(100deg, rgba(4,14,34,.78) 0%, rgba(4,14,34,.48) 26%, rgba(4,14,34,.12) 52%, rgba(4,14,34,0) 66%),
            linear-gradient(180deg, rgba(4,14,34,0) 50%, rgba(4,14,34,.6) 82%, rgba(4,14,34,.82) 100%)
          `,
        }}
      />

      {/* ---- Panel de marca ---- */}
      <div className="hidden lg:flex flex-col relative z-10 flex-1 min-w-[420px] px-14 py-11 text-white">
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="w-full max-w-[420px] flex flex-col items-center mb-7">
            <ArkeyOneLogo width={230} />
            <p className="mt-2.5 text-base font-medium text-white/90 text-center">
              Ordena tu mundo, mejora tu vida.
            </p>
          </div>

          <h2 className="text-[36px] leading-tight font-bold max-w-[420px] mb-6 text-white text-center drop-shadow-sm">
            Todo en un solo lugar,<br />
            para una vida con más{' '}
            <span style={{ color: '#7cc4ff' }}>claridad.</span>
          </h2>

          <ul className="grid grid-cols-2 gap-x-7 gap-y-3.5 max-w-[420px] list-none p-0">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[16px] font-medium text-white/95">
                <Check size={17} strokeWidth={2.2} className="text-[#7cc4ff]" />
                {f}
              </li>
            ))}
          </ul>

          <p className="text-[17px] italic font-medium text-white text-center drop-shadow-sm mt-7">
            "Organiza hoy, vive un mejor mañana."
          </p>

          <p className="text-[10.5px] tracking-[.14em] font-semibold text-white/70 text-center mt-5">
            TECNOLOGÍA PARA UNA VIDA CON SENTIDO
          </p>
        </div>
      </div>

      {/* ---- Panel de login ---- */}
      <div className="flex-1 min-w-[420px] flex flex-col relative z-10">
        <div className="flex-1 flex items-center justify-start pl-16">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[400px] bg-[#EAF1FC] rounded-[18px] shadow-[0_20px_50px_-18px_rgba(10,45,107,.28)] px-8 pt-9 pb-7"
          >
            {bannerType && (
              <div
                className={`flex items-start gap-2 text-[12.5px] font-medium px-3 py-2.5 rounded-[10px] mb-4 leading-snug ${
                  bannerType === 'wrong' || bannerType === 'locked'
                    ? 'bg-[#FEF2F2] text-[#B42318] border border-[#FCD3D0]'
                    : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#C9DDFC]'
                }`}
              >
                {BANNER_COPY[bannerType]}
              </div>
            )}
            {status === 'success' && (
              <div className="flex items-start gap-2 text-[12.5px] font-medium px-3 py-2.5 rounded-[10px] mb-4 bg-[#ECFDF5] text-[#067647] border border-[#BBF0D5]">
                ¡Bienvenido! Redirigiendo a tu centro de mando…
              </div>
            )}

            <h1 className="text-[22px] font-bold text-[#0A2D6B] text-center mb-1">Bienvenido de nuevo</h1>
            <p className="text-[13.5px] text-[#6B7280] text-center mb-6">
              Inicia sesión en tu centro de mando.
            </p>

            <label className="block text-xs font-semibold text-[#0A2D6B] mb-1.5">Correo electrónico</label>
            <div
              className={`flex items-center gap-2.5 border-[1.5px] rounded-xl px-3.5 py-2.5 mb-1 bg-[#FBFCFF] transition ${
                !emailValid && emailTouched ? 'border-[#EF4444] bg-[#FFF9F9]' : 'border-[#E1E8F7] focus-within:border-[#007AFF] focus-within:ring-4 focus-within:ring-[#007AFF]/10'
              }`}
            >
              <Mail size={18} className="text-[#8CA0C6] shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="Correo electrónico"
                autoComplete="email"
                className="flex-1 bg-transparent outline-none text-sm text-[#1F2937] placeholder:text-[#9AA7BE]"
              />
            </div>
            {!emailValid && emailTouched && (
              <p className="text-[11.5px] text-[#EF4444] mb-3">Ingresa un correo electrónico válido.</p>
            )}
            {(emailValid || !emailTouched) && <div className="mb-3.5" />}

            <label className="block text-xs font-semibold text-[#0A2D6B] mb-1.5">Contraseña</label>
            <div className="flex items-center gap-2.5 border-[1.5px] border-[#E1E8F7] rounded-xl px-3.5 py-2.5 mb-3.5 bg-[#FBFCFF] focus-within:border-[#007AFF] focus-within:ring-4 focus-within:ring-[#007AFF]/10 transition">
              <Lock size={18} className="text-[#8CA0C6] shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="flex-1 bg-transparent outline-none text-sm text-[#1F2937] placeholder:text-[#9AA7BE]"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#8CA0C6]" aria-label="Mostrar u ocultar contraseña">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <div className="flex items-center justify-between mb-5 text-[12.5px]">
              <label className="flex items-center gap-1.5 text-[#334467] font-medium cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setRemember((v) => !v)}
                  className={`w-[17px] h-[17px] rounded-[5px] border-[1.6px] flex items-center justify-center transition ${
                    remember ? 'bg-[#007AFF] border-[#007AFF]' : 'bg-white border-[#C4D1EA]'
                  }`}
                >
                  {remember && <Check size={11} strokeWidth={3} className="text-white" />}
                </button>
                Mantener sesión iniciada
              </label>
              <button type="button" onClick={onForgotPassword} className="text-[#007AFF] font-semibold hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#007AFF] disabled:opacity-55 disabled:cursor-not-allowed hover:bg-[#0069DB] text-white rounded-xl py-3.5 text-[14.5px] font-bold flex items-center justify-center gap-2 transition"
            >
              {status === 'loading' ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <>
                  Iniciar sesión <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-[13px] text-[#6B7280] mb-3.5 mt-5">
              ¿No tienes una cuenta?{' '}
              <button type="button" onClick={onCreateAccount} className="text-[#007AFF] font-semibold hover:underline">
                Crear cuenta
              </button>
            </p>

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#9AA7BE] text-center flex-wrap">
              <ShieldCheck size={13} />
              Tus datos están protegidos.{' '}
              <a href="/privacidad" className="underline">Privacidad</a> ·{' '}
              <a href="/terminos" className="underline">Términos</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
