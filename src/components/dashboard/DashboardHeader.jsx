// src/components/dashboard/DashboardHeader.jsx
//
// Barra superior del Centro de mando: buscador, personalizar panel, notificaciones y saludo
// corto de perfil. Vive SOLO arriba del Dashboard (no reemplaza nada del sidebar global) — al
// hacer click llama a los mismos manejadores que ya abren el buscador y el panel de
// notificaciones en toda la app, así que no hay lógica de búsqueda/notificaciones duplicada aquí.
// El botón de "Personalizar panel" vivía antes como tarjeta grande en StatCardsRow — se movió
// aquí, discreto junto a Notificaciones, a pedido de Angel (20 sept 2026).

import { Search, Bell, Sliders } from 'lucide-react';

export default function DashboardHeader({ primerNombre, onBuscar, onNotificaciones, notifNoLeidas, onPersonalizarClick }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <button
        onClick={onBuscar}
        className="gp-input flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left flex-1 min-w-[220px] max-w-md"
      >
        <Search size={16} className="gp-text-muted shrink-0" />
        <span className="gp-text-muted flex-1 truncate">Buscar en ARKEYONE...</span>
        <span className="text-[10px] gp-text-muted border gp-border rounded px-1.5 py-0.5 shrink-0">⌘K</span>
      </button>

      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onPersonalizarClick} className="p-2.5 rounded-xl gp-btn-ghost" title="Personalizar panel" aria-label="Personalizar panel">
          <Sliders size={18} />
        </button>
        <button onClick={onNotificaciones} className="relative p-2.5 rounded-xl gp-btn-ghost" title="Notificaciones" aria-label="Notificaciones">
          <Bell size={18} />
          {notifNoLeidas > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
          )}
        </button>
        {primerNombre && (
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-medium">Hola, {primerNombre}</p>
            <p className="text-[11px] gp-text-muted">Tu progreso cuenta</p>
          </div>
        )}
      </div>
    </div>
  );
}
