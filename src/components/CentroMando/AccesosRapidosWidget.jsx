// src/components/CentroMando/AccesosRapidosWidget.jsx
//
// Parte de la columna 3: botones que navegan a un módulo y abren su formulario de "Nuevo"
// solo (ver irACrear en AppLoggedIn). Respeta los mismos permisos que ya filtra el sidebar
// (navGroupsFiltrados): un colaborador sin acceso a un módulo no ve su acceso rápido.
//
// Iconos y colores (22 sept 2026, pedido de Angel): calcados de su mockup de referencia — cada
// acción tiene su propio color (chip + ícono + etiqueta), no un solo tono dorado como antes.
// Íconos de Lucide (misma familia que el resto de la app, por diseño -- no íconos sueltos
// importados de la imagen, para no romper la consistencia con el resto del panel).
// "Tomar nota" reemplaza a "Entrenamiento" (que no salía en el mockup) — navega a Notas, mismo
// patrón de solo-navegar que ya usan "Nuevo evento"/"Registrar atención" (Agenda/Regalos no
// tienen el mecanismo crearAlEntrar de Proyectos/Pendientes/Finanzas/Salud, así que tampoco se
// le agregó aquí — es consistente con lo que ya había, no un mecanismo nuevo).
// `justify-center` (22 sept 2026, pedido de Angel): sin esto, cuando una etiqueta larga
// ("Registrar atención") envuelve a 2 líneas, esa fila del grid crece y los botones vecinos con
// etiqueta de una sola línea quedaban con el ícono pegado arriba en vez de centrado -- ahora
// cada botón centra su contenido tanto horizontal como verticalmente sin importar la altura
// que termine teniendo la fila.

import { CheckSquare, CalendarClock, BookOpen, MapPin, Heart, NotebookPen } from 'lucide-react';

const ACCESOS = [
  { modulo: 'pendientes', label: 'Nueva tarea', icon: CheckSquare, preset: {}, color: '#087CF5' },
  { modulo: 'agenda', label: 'Nuevo evento', icon: CalendarClock, preset: {}, color: '#16A36A' },
  { modulo: 'proyectos', label: 'Nuevo proyecto', icon: BookOpen, preset: {}, color: '#8B5CF6' },
  { modulo: 'finanzas', label: 'Nuevo gasto', icon: MapPin, preset: { tipo: 'Egreso' }, color: '#EF4444' },
  { modulo: 'regalos', label: 'Registrar atención', icon: Heart, preset: {}, color: '#F59E0B' },
  { modulo: 'notas', label: 'Tomar nota', icon: NotebookPen, preset: {}, color: '#475569' },
];

export default function AccesosRapidosWidget({ onCrear, modulosPermitidos }) {
  const visibles = ACCESOS.filter((a) => modulosPermitidos === null || modulosPermitidos.includes(a.modulo));
  if (visibles.length === 0) return null;

  return (
    <div className="gp-panel p-4 h-full flex flex-col">
      <h3 className="text-sm font-medium mb-3">Acciones rápidas</h3>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {visibles.map((a) => (
          <button
            key={a.modulo}
            onClick={() => onCrear(a.modulo, a.preset)}
            className="rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-xs text-center"
            style={{ background: `${a.color}17` }}
          >
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${a.color}30` }}>
              <a.icon size={18} style={{ color: a.color }} />
            </span>
            <span style={{ color: a.color }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
