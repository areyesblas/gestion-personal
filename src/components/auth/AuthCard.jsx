// src/components/auth/AuthCard.jsx
//
// Envoltura visual compartida para las pantallas secundarias de autenticación
// (crear cuenta, recuperar contraseña, poner contraseña nueva) -- mismo estilo
// que LoginWeb/LoginMobile (foto de fondo, scrim, tarjeta azul pastel, logo),
// pero en un solo layout responsivo (sin panel de marca aparte) porque son
// pantallas secundarias, no la puerta principal de venta del producto.

import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import ArkeyOneLogo from './ArkeyOneLogo';
import bgJpg from '../../assets/login-bg-web.jpg';
import bgWebp from '../../assets/login-bg-web.webp';

export default function AuthCard({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0B2341] px-6 py-12">
      <picture className="absolute inset-0 block z-0">
        <source srcSet={bgWebp} type="image/webp" />
        <img
          src={bgJpg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '68% 42%' }}
        />
      </picture>
      <div
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(4,14,34,.5) 0%, rgba(4,14,34,.3) 45%, rgba(4,14,34,.3) 60%, rgba(4,14,34,.6) 100%)`,
        }}
      />
      <div className="relative z-10 w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center mb-6">
          <ArkeyOneLogo width={190} />
          <p className="text-sm font-medium text-white/90 mt-2.5 drop-shadow-sm">Ordena tu mundo, mejora tu vida.</p>
        </div>
        <div className="bg-[#EAF1FC] rounded-[18px] shadow-[0_20px_50px_-18px_rgba(10,45,107,.28)] px-8 pt-9 pb-7">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthField({ icon, label, ...inputProps }) {
  return (
    <div className="mb-3.5">
      {label && <label className="block text-xs font-semibold text-[#0A2D6B] mb-1.5">{label}</label>}
      <div className="flex items-center gap-2.5 border-[1.5px] border-[#E1E8F7] rounded-xl px-3.5 py-2.5 bg-[#FBFCFF] focus-within:border-[#007AFF] focus-within:ring-4 focus-within:ring-[#007AFF]/10 transition">
        {icon}
        <input
          {...inputProps}
          className="flex-1 bg-transparent outline-none text-sm text-[#1F2937] placeholder:text-[#9AA7BE]"
        />
      </div>
    </div>
  );
}

export function AuthPasswordField({ label, value, onChange, required, autoFocus, autoComplete, placeholder, onKeyDown }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="mb-3.5">
      {label && <label className="block text-xs font-semibold text-[#0A2D6B] mb-1.5">{label}</label>}
      <div className="flex items-center gap-2.5 border-[1.5px] border-[#E1E8F7] rounded-xl px-3.5 py-2.5 bg-[#FBFCFF] focus-within:border-[#007AFF] focus-within:ring-4 focus-within:ring-[#007AFF]/10 transition">
        <Lock size={18} className="text-[#8CA0C6] shrink-0" />
        <input
          type={visible ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-[#1F2937] placeholder:text-[#9AA7BE]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="text-[#8CA0C6]"
          aria-label="Mostrar u ocultar contraseña"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

export function AuthButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full bg-[#007AFF] disabled:opacity-55 disabled:cursor-not-allowed hover:bg-[#0069DB] text-white rounded-xl py-3.5 text-[14.5px] font-bold flex items-center justify-center gap-2 transition"
    >
      {children}
    </button>
  );
}

export function AuthBanner({ type = 'error', children }) {
  const cls = type === 'error'
    ? 'bg-[#FEF2F2] text-[#B42318] border border-[#FCD3D0]'
    : 'bg-[#ECFDF5] text-[#067647] border border-[#BBF0D5]';
  return (
    <div className={`text-[12.5px] font-medium px-3 py-2.5 rounded-[10px] mb-4 leading-snug ${cls}`}>
      {children}
    </div>
  );
}

export function AuthBackLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[13px] text-[#007AFF] font-semibold w-full text-center mt-4 hover:underline"
    >
      {children}
    </button>
  );
}
