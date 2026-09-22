// src/components/CentroMando/AccesosRapidosWidget.jsx
//
// Parte de la columna 3: botones que navegan a un módulo y abren su formulario de "Nuevo"
// solo (ver irACrear en AppLoggedIn). Respeta los mismos permisos que ya filtra el sidebar
// (navGroupsFiltrados): un colaborador sin acceso a un módulo no ve su acceso rápido.

import { CheckSquare, CalendarClock, FolderKanban, Receipt, Dumbbell } from 'lucide-react';

const ACCESOS = [
  { modulo: 'pendientes', label: 'Nueva tarea', icon: CheckSquare, preset: {} },
  { modulo: 'citas', label: 'Nueva cita', icon: CalendarClock, preset: {} },
  { modulo: 'proyectos', label: 'Nuevo proyecto', icon: FolderKanban, preset: {} },
  { modulo: 'finanzas', label: 'Nuevo gasto', icon: Receipt, preset: { tipo: 'Egreso' } },
  // Entrenamiento no abre un formulario de "Nuevo" — lleva directo a Salud > Ejercicio > Sesión
  // (ver Salud/Ejercicio en App.jsx, que interpretan preset.tab/preset.subtab en vez de un item).
  { modulo: 'salud', label: 'Entrenamiento', icon: Dumbbell, preset: { tab: 'ejercicio', subtab: 'sesion' } },
];

export default function AccesosRapidosWidget({ onCrear, modulosPermitidos }) {
  const visibles = ACCESOS.filter((a) => modulosPermitidos === null || modulosPermitidos.includes(a.modulo));
  if (visibles.length === 0) return null;

  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <h3 className="text-sm font-medium mb-3">Accesos rápidos</h3>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {visibles.map((a) => (
          <button
            key={a.modulo}
            onClick={() => onCrear(a.modulo, a.preset)}
            className="gp-btn-ghost rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs"
            style={{ border: '1px solid var(--border)' }}
          >
            <a.icon size={17} className="gp-text-gold" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
