// src/components/nav/BottomNav.jsx
//
// Nav inferior fija de móvil (rediseño de navegación, 22 sept 2026) — antes el único acceso al
// menú en móvil era el cajón deslizante (hamburguesa). Este componente no lo reemplaza: agrega
// 4 accesos directos a las vistas más usadas + un botón "Más" que abre ese mismo cajón
// (mobileNavOpen/setMobileNavOpen, ya existentes en App.jsx) para todo lo demás.
//
// Solo visible en móvil (md:hidden, mismo breakpoint que ya usa el cajón). Se posiciona fijo al
// fondo de la pantalla, respetando el safe-area-inset-bottom de iOS (igual que el resto de la UI).

import { LayoutDashboard, CalendarRange, CheckSquare, FolderKanban, Menu } from 'lucide-react';

const ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: CalendarRange },
  { id: 'pendientes', label: 'Tareas', icon: CheckSquare },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
];

export default function BottomNav({ view, setView, onAbrirMas }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t gp-border"
      style={{ background: 'var(--bg)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map((it) => {
        const activo = view === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className="flex flex-col items-center justify-center gap-0.5 py-2 gp-btn-ghost"
            style={{ color: activo ? 'var(--gold)' : undefined }}
          >
            <it.icon size={19} />
            <span className="text-[10px]">{it.label}</span>
          </button>
        );
      })}
      <button onClick={onAbrirMas} className="flex flex-col items-center justify-center gap-0.5 py-2 gp-btn-ghost">
        <Menu size={19} />
        <span className="text-[10px]">Más</span>
      </button>
    </nav>
  );
}
