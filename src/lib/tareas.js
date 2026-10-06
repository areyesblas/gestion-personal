import { fmtFechaCorta } from "./formato";

// Arma el árbol de subtareas (sin límite de profundidad) a partir de la lista plana.
export function buildTareaTree(items) {
  const byParent = {};
  for (const it of items) {
    const key = it.parentId || "_root";
    (byParent[key] = byParent[key] || []).push(it);
  }
  const attach = (key) => (byParent[key] || []).map((it) => ({ ...it, hijos: attach(it.id) }));
  return attach("_root");
}

// `colapsadas` (opcional) es un Set con los ids de las tareas cuya rama está cerrada: la tarea
// sigue apareciendo, pero sus subtareas no se incluyen en el resultado.
export function flattenTareas(tree, nivel = 0, colapsadas = null) {
  const out = [];
  for (const nodo of tree) {
    out.push({ item: nodo, nivel });
    if (colapsadas && colapsadas.has(nodo.id)) continue;
    out.push(...flattenTareas(nodo.hijos, nivel + 1, colapsadas));
  }
  return out;
}

// ids de todas las tareas que tienen al menos una subtarea, en cualquier nivel del árbol. Es lo
// que necesita "Colapsar todo" para saber qué ramas existen.
export function idsRamasTareas(tree) {
  const out = [];
  for (const nodo of tree) {
    if (nodo.hijos && nodo.hijos.length > 0) {
      out.push(nodo.id);
      out.push(...idsRamasTareas(nodo.hijos));
    }
  }
  return out;
}

// % de avance: si la tarea tiene subtareas, es el promedio del avance de sus hijos (recursivo);
// si es una tarea final (sin hijos), es binario según su estatus.
export function calcAvanceTarea(nodo) {
  if (!nodo.hijos || nodo.hijos.length === 0) {
    if (nodo.avance !== null && nodo.avance !== undefined && nodo.avance !== "") return Number(nodo.avance);
    return nodo.estatus === "Completada" ? 100 : nodo.estatus === "En proceso" ? 50 : 0;
  }
  const suma = nodo.hijos.reduce((s, h) => s + calcAvanceTarea(h), 0);
  return suma / nodo.hijos.length;
}

// "2026-09-24T18:30:00Z" -> "24 Sep 2026". Para mostrar cuándo se completó algo. (Aparte de
// fmtFechaHora(), que es el de Citas y no lleva año.)
export const fmtFechaCompletado = (iso) => (iso ? fmtFechaCorta(String(iso).slice(0, 10)) : "");

// de verdad se terminó, no la de un clic que se deshizo. No pide confirmación porque no destruye
// nada más que ese dato y se vuelve a generar al completarla otra vez.
export function reabrirTarea(tarea, onEditTarea) {
  onEditTarea(tarea.id, { estatus: "Pendiente", completadaEn: null, avance: null });
}

// ids de todos los descendientes de una tarea (para no permitir que se vuelva subtarea de sí misma).
export function descendientesDe(id, items) {
  const hijos = items.filter((t) => t.parentId === id);
  return hijos.reduce((acc, h) => [...acc, h.id, ...descendientesDe(h.id, items)], []);
}
