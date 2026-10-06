import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { ESTATUS_TAREA_CERRADOS } from "../../lib/catalogos";
import { Modal } from "../ui/Modal";
import { ahoraISO } from "../../lib/formato";
import { descendientesDe, fmtFechaCompletado } from "../../lib/tareas";

// Cuántas tareas cuelgan de este nodo contando todos los niveles — para poder decir cuántas se
// están escondiendo al colapsar, en vez de esconderlas en silencio.
export function contarDescendientesTarea(nodo) {
  return (nodo.hijos || []).reduce((n, h) => n + 1 + contarDescendientesTarea(h), 0);
}

// Flecha de colapsar/expandir de una fila del árbol. Una tarea sin subtareas dibuja un hueco del
// mismo ancho, para que todas las descripciones de un mismo nivel queden alineadas.
export function ToggleArbolTarea({ nodo, colapsada, onToggle }) {
  const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
  if (!tieneHijos) return <span className="shrink-0" style={{ width: 16, display: "inline-block" }} />;
  const n = contarDescendientesTarea(nodo);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(nodo.id); }}
      title={colapsada ? `Expandir ${n} subtarea${n === 1 ? "" : "s"}` : "Colapsar subtareas"}
      aria-label={colapsada ? "Expandir subtareas" : "Colapsar subtareas"}
      aria-expanded={!colapsada}
      className="shrink-0 gp-text-muted"
      style={{ width: 16, lineHeight: 0 }}
    >
      {colapsada ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

// Cuántas subtareas quedaron escondidas en esta rama, para que colapsar no borre información.
export function ContadorRamaColapsada({ nodo, colapsada }) {
  if (!colapsada) return null;
  const n = contarDescendientesTarea(nodo);
  if (n === 0) return null;
  return <span className="gp-bloque gp-badge shrink-0" style={{ color: "var(--muted-bloque)" }}>+{n}</span>;
}

// "Colapsar todo / Expandir todo". Un solo botón que alterna: si ya está todo cerrado, abre; si
// no, cierra. No se dibuja cuando el árbol no tiene ninguna rama que colapsar.
export function BotonArbolTareas({ idsRamas, colapsadas, onCambiar }) {
  if (idsRamas.length === 0) return null;
  const todasColapsadas = idsRamas.every((id) => colapsadas.has(id));
  return (
    <button
      type="button"
      onClick={() => onCambiar(todasColapsadas ? new Set() : new Set(idsRamas))}
      className="text-xs px-2.5 py-1.5 rounded gp-btn-ghost flex items-center gap-1.5 whitespace-nowrap"
    >
      {todasColapsadas ? <ChevronsUpDown size={12} /> : <ChevronsDownUp size={12} />}
      {todasColapsadas ? "Expandir todo" : "Colapsar todo"}
    </button>
  );
}

// Subtareas todavía abiertas que cuelgan de una tarea.
export function subtareasAbiertas(tareaId, pendientes) {
  return descendientesDe(tareaId, pendientes)
    .map((id) => pendientes.find((t) => t.id === id))
    .filter((t) => t && !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
}

// Pregunta de confirmación para completar una tarea, con todo lo que hay que hacer si se acepta.
// Devuelve el objeto que consume ConfirmacionModal; no toca nada por su cuenta.
export function preguntaCompletarTarea({ tarea, data, onEditTarea, onEditProyecto, onAviso }) {
  const pendientes = data.pendientes || [];
  const abiertas = subtareasAbiertas(tarea.id, pendientes);
  const n = abiertas.length;
  return {
    titulo: "Completar tarea",
    mensaje: n > 0
      ? `"${tarea.descripcion}" tiene ${n} subtarea${n === 1 ? "" : "s"} sin terminar.\n\nAl completarla, esa${n === 1 ? "" : "s"} subtarea${n === 1 ? "" : "s"} también quedará${n === 1 ? "" : "n"} como completada${n === 1 ? "" : "s"}, con la fecha de hoy.`
      : `Se va a marcar "${tarea.descripcion}" como completada y se va a guardar la fecha de hoy.`,
    etiqueta: "Sí, completar",
    onConfirmar: () => {
      const ahora = ahoraISO();
      // El avance se fija en 100 junto con el estatus: calcAvanceTarea() usa el avance manual
      // cuando está capturado, así que sin esto una tarea "completada" al 40% dejaría a su tarea
      // padre en un porcentaje que no cuadra con tener todo cerrado.
      onEditTarea(tarea.id, { estatus: "Completada", completadaEn: ahora, avance: 100 });
      for (const h of abiertas) onEditTarea(h.id, { estatus: "Completada", completadaEn: ahora, avance: 100 });

      // ¿Fue la última tarea abierta del proyecto? Entonces el proyecto se cierra solo.
      const cerradasAhora = new Set([tarea.id, ...abiertas.map((h) => h.id)]);
      const delProyecto = pendientes.filter((t) => t.proyectoId === tarea.proyectoId);
      const quedaAlgoAbierto = delProyecto.some((t) => !cerradasAhora.has(t.id) && !ESTATUS_TAREA_CERRADOS.includes(t.estatus));
      const proyecto = (data.proyectos || []).find((pr) => pr.id === tarea.proyectoId);
      if (proyecto && delProyecto.length > 0 && !quedaAlgoAbierto && proyecto.estatus !== "Finalizado") {
        onEditProyecto?.(proyecto.id, { estatus: "Finalizado", completadoEn: ahora });
        // Diferido para que el aviso salga con el modal de confirmación ya cerrado, no encima.
        setTimeout(() => onAviso?.(`Era la última tarea abierta de "${proyecto.nombre}", así que el proyecto se marcó como Finalizado. Si el proyecto sigue vivo, puedes reabrirlo desde su ficha.`), 60);
      }
    },
  };
}

// Modal de confirmación reutilizable. `pregunta` es null cuando no hay nada que preguntar.
export function ConfirmacionModal({ pregunta, onCerrar }) {
  if (!pregunta) return null;
  return (
    <Modal title={pregunta.titulo} onClose={onCerrar}>
      <p className="text-sm gp-text-muted mb-4" style={{ whiteSpace: "pre-line" }}>{pregunta.mensaje}</p>
      <div className="flex gap-2">
        <button onClick={onCerrar} className="gp-btn-ghost flex-1 py-2 text-sm">Cancelar</button>
        <button onClick={() => { pregunta.onConfirmar(); onCerrar(); }} className="gp-btn flex-1 py-2 text-sm">{pregunta.etiqueta || "Confirmar"}</button>
      </div>
    </Modal>
  );
}

// Check de "completada" de una fila de tareas. Completar pasa por confirmación (lo pide el flujo);
// reabrir es directo, porque deshacer un clic no debería costar otro clic.
export function CheckTareaHecha({ tarea, onCompletar, onReabrir, size = 17 }) {
  const hecha = tarea.estatus === "Completada";
  return (
    <input
      type="checkbox"
      checked={hecha}
      title={hecha ? `Completada${tarea.completadaEn ? ` el ${fmtFechaCompletado(tarea.completadaEn)}` : ""} — clic para reabrirla` : "Marcar como completada"}
      aria-label={hecha ? "Reabrir tarea" : "Marcar tarea como completada"}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => (e.target.checked ? onCompletar(tarea) : onReabrir(tarea))}
      style={{ width: size, height: size, accentColor: "var(--teal)", cursor: "pointer" }}
    />
  );
}
