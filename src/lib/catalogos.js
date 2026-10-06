// src/lib/catalogos.js
//
// Catalogos y constantes de dominio que comparten modulos perezosos con pantallas que NO lo son.
// Salieron de App.jsx en la Fase 2 (6 oct 2026).
//
// OJO: estas dos listas conservan su orden a proposito y NO se alfabetizan. ESTATUS_TAREA es un
// pipeline (Borrador -> No iniciada -> ... -> Cancelada) y FRECUENCIA va de mas corta a mas larga:
// ahi el orden ES la informacion. Ver la nota de ordenAlfabetico en lib/listas.js.

import { ordenAlfabetico } from "./listas";

export const ESTATUS_TAREA = ["Borrador", "No iniciada", "Pendiente", "En proceso", "En espera", "Completada", "Cancelada"];
export const FRECUENCIA = ["Semanal", "Quincenal", "Mensual", "Anual"];

/* ---------- Proyectos ---------- */
// Etiqueta corta SOLO para dibujar (chips de filtro, badges): el valor guardado en Supabase sigue
// siendo el de ESTATUS_PROYECTO. No son estados nuevos — es el mismo estado escrito más corto para
// que la fila de filtros no se convierta en una barra gigantesca (secc. 7 del rediseño).
const ETIQUETA_ESTATUS_PROYECTO = { "En validación": "Validación", "En desarrollo": "Desarrollo", "Pausado": "En pausa" };
export const etiquetaEstatusProyecto = (e) => ETIQUETA_ESTATUS_PROYECTO[e] || e;

// Colores semánticos del pipeline: de la idea (ámbar, todavía sin compromiso) al activo (verde,
// produciendo), con el archivado en gris. Son los mismos colores que ya usa el resto de ARKEYONE.
export const COLOR_ESTATUS_PROYECTO = {
  "Idea": "#F59E0B",
  "En validación": "#8B5CF6",
  "En desarrollo": "#087CF5",
  "Activo": "#16A36A",
  "Finalizado": "#5FBF8B",
  "Pausado": "#F97316",
  "Archivado": "#64748B",
};

// Color de cada contexto de vida del proyecto. El contexto es una propiedad del proyecto, no un
// módulo aparte (secc. 12 del rediseño).
export const COLOR_CONTEXTO_PROYECTO = { Personal: "#8B5CF6", Profesional: "#087CF5", Empresarial: "#16A36A" };

/* ---------- Tareas ---------- */
export const PRIORIDADES = ["Alta", "Media", "Baja"];

// 7 estados según el documento maestro v0.1 (antes eran solo 3: Pendiente/En progreso/Hecho).
// Estados que cuentan como "ya no requiere trabajo activo" (para filtros de "abiertas" vs archivadas).
export const ESTATUS_TAREA_CERRADOS = ["Completada", "Cancelada"];

export const toneEstatusTarea = (estatus) => (
  estatus === "Completada" ? "teal" :
  estatus === "Cancelada" ? "muted" :
  estatus === "En proceso" ? "gold" :
  estatus === "En espera" ? "red" :
  "muted" // Borrador, No iniciada, Pendiente
);

/* ---------- Finanzas ---------- */
export const FORMA_PAGO = ordenAlfabetico(["Efectivo", "Transferencia", "Especie", "Intercambio"]);

export const ESTATUS_META = ["No iniciada", "En progreso", "Cumplida"];

// Colores de la dona de gastos, en orden. Son los acentos de la app, no una paleta nueva.
export const COLORES_DESGLOSE = ["#087CF5", "#F59E0B", "#8B5CF6", "#16A36A", "#EC4899", "#64748B"];

// Candados de reautenticación de los módulos sensibles. Apagados a propósito el 1 oct 2026
// (Angel: "de momento quítalos, al final vemos a qué se los ponemos y el mecanismo más
// práctico"). Toda la maquinaria sigue intacta —las listas de vistas, el modal de contraseña,
// las ventanas de 15 y 10 minutos—: volver a encenderlos es poner esta constante en true.
// Mientras esté en false, la app NO pide contraseña para entrar a Finanzas, Salud, Documentos,
// etc. Eso baja el nivel de protección a propósito y es una decisión del dueño del producto.
export const CANDADO_SENSIBLE_ACTIVO = false;

// Los dos lados del dinero. Orden con significado (entra / sale), no alfabetico.
export const TIPO_FIN = ["Ingreso", "Egreso"];
