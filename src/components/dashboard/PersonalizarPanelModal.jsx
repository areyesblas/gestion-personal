// src/components/dashboard/PersonalizarPanelModal.jsx
//
// Contenido del modal "Personalizar panel" del Centro de mando: lista de widgets reordenable
// (arrastrar por el ícono de agarre) con un checkbox por widget para mostrarlo/ocultarlo. El
// arrastre ocurre aquí adentro del modal, no sobre las tarjetas en vivo del dashboard — así no
// choca con el scroll de la página, sobre todo en celular.
//
// Usa @dnd-kit (no el drag-and-drop nativo de HTML5 que ya usa el sidebar en App.jsx, que solo
// funciona con mouse) porque su PointerSensor/TouchSensor sí soportan arrastre táctil de verdad.
// Este archivo se carga con React.lazy desde App.jsx, así que @dnd-kit no pesa en el arranque
// normal de la app — solo cuando el usuario abre este modal.
//
// Sigue el mismo patrón que el resto de los formularios de preferencias del Modal genérico
// (ej. PreferenciasNotifForm en App.jsx): cambios en estado local + botón "Guardar" explícito,
// para que el "¿Descartar cambios?" del Modal funcione igual que en el resto de la app —
// nada se persiste hasta que el usuario toca Guardar.

import { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function Fila({ widget, onToggleVisible }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="gp-panel p-3 flex items-center gap-3">
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing gp-text-muted"
        style={{ touchAction: 'none' }}
        aria-label={`Arrastrar para reordenar ${widget.label}`}
      >
        <GripVertical size={18} />
      </button>
      <span className="flex-1 text-sm">{widget.label}</span>
      <input
        type="checkbox"
        checked={widget.visible}
        onChange={() => onToggleVisible(widget.id)}
        style={{ width: 16, height: 16, accentColor: 'var(--gold)' }}
        aria-label={`Mostrar ${widget.label} en el Centro de mando`}
      />
    </div>
  );
}

export default function PersonalizarPanelModal({ widgetsIniciales, onSave, onSaved }) {
  const [widgets, setWidgets] = useState(widgetsIniciales);
  const [estadoGuardado, setEstadoGuardado] = useState('idle'); // idle | guardando | guardado
  // El Modal genérico (App.jsx) detecta cambios sin guardar escuchando eventos change/input
  // nativos para ofrecer "¿Descartar cambios?" al cerrar — funciona solo con inputs de verdad
  // (checkbox aquí abajo). El arrastre no dispara ninguno, así que se dispara uno a mano cuando
  // sí cambia el orden, para que cerrar sin Guardar después de reordenar también avise.
  const raizRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setWidgets((prev) => {
      const desde = prev.findIndex((w) => w.id === active.id);
      const hasta = prev.findIndex((w) => w.id === over.id);
      if (desde === -1 || hasta === -1) return prev;
      return arrayMove(prev, desde, hasta);
    });
    raizRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const toggleVisible = (id) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  return (
    <div ref={raizRef}>
      <p className="text-sm gp-text-muted mb-4">Arrastra el ícono para reordenar, o desmarca un widget para ocultarlo de tu Centro de mando. Te sigue entre dispositivos.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto gp-scroll pr-1 mb-4">
            {widgets.map((w) => (
              <Fila key={w.id} widget={w} onToggleVisible={toggleVisible} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        className="gp-btn w-full py-2 text-sm disabled:opacity-70"
        disabled={estadoGuardado === 'guardando'}
        onClick={async () => {
          setEstadoGuardado('guardando');
          await onSave(widgets.map(({ id, visible }) => ({ id, visible })));
          setEstadoGuardado('guardado');
          setTimeout(() => onSaved?.(), 900);
        }}
      >
        {estadoGuardado === 'guardando' ? 'Guardando…' : estadoGuardado === 'guardado' ? 'Guardado ✓' : 'Guardar'}
      </button>
    </div>
  );
}
