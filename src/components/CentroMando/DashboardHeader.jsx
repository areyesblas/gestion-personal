// src/components/CentroMando/DashboardHeader.jsx
//
// Barra superior del Centro de mando: buscador, personalizar panel, notificaciones y avatar de
// cuenta. Vive SOLO arriba del Dashboard (no reemplaza nada del sidebar global) — al hacer
// click llama a los mismos manejadores que ya abren el buscador y el panel de notificaciones en
// toda la app, así que no hay lógica de búsqueda/notificaciones duplicada aquí.
// El avatar (foto o iniciales + menú Configuración/Cerrar sesión) se agregó en el rediseño del
// 21 sept 2026, a pedido de Angel — subir la foto se hace desde Configuración, aquí solo se
// muestra y da acceso rápido a la cuenta.

import { useState } from 'react';
import { Search, Bell, Sliders, Settings, LogOut } from 'lucide-react';
import WeatherWidget from './WeatherWidget';

export default function DashboardHeader({ primerNombre, avatarUrl, onBuscar, onNotificaciones, notifNoLeidas, onPersonalizarClick, onAbrirConfiguracion, onCerrarSesion, ciudad, climaLat, climaLon }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const iniciales = (primerNombre || '').slice(0, 2).toUpperCase();
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
        <WeatherWidget ciudad={ciudad} lat={climaLat} lon={climaLon} onConfigurarCiudad={onAbrirConfiguracion} />
        <button onClick={onPersonalizarClick} className="p-2.5 rounded-xl gp-btn-ghost" title="Personalizar panel" aria-label="Personalizar panel">
          <Sliders size={18} />
        </button>
        <button onClick={onNotificaciones} className="relative p-2.5 rounded-xl gp-btn-ghost" title="Notificaciones" aria-label="Notificaciones">
          <Bell size={18} />
          {notifNoLeidas > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
          )}
        </button>

        <div className="relative">
          <button onClick={() => setMenuAbierto((v) => !v)} className="flex items-center gap-2" aria-label="Cuenta">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" style={{ border: '1px solid var(--border)' }} />
            ) : (
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shrink-0"
                style={{ background: 'var(--panel-hi)', color: 'var(--gold)' }}
              >
                {iniciales || '·'}
              </span>
            )}
            {primerNombre && (
              <span className="text-right leading-tight hidden sm:block">
                <span className="text-sm font-medium block">Hola, {primerNombre}</span>
                <span className="text-[11px] gp-text-muted block">Tu progreso cuenta</span>
              </span>
            )}
          </button>
          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
              <div className="absolute right-0 top-11 z-20 gp-panel py-1 text-sm" style={{ minWidth: 180 }}>
                <button onClick={() => { setMenuAbierto(false); onAbrirConfiguracion(); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2">
                  <Settings size={14} /> Configuración
                </button>
                <button onClick={() => { setMenuAbierto(false); onCerrarSesion(); }} className="w-full text-left px-3 py-2 gp-panel-hi flex items-center gap-2 gp-text-red">
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
