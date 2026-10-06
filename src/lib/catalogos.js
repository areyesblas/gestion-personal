// src/lib/catalogos.js
//
// Catalogos de dominio que comparten modulos perezosos con pantallas que NO lo son. Salieron de
// App.jsx en la Fase 2 (6 oct 2026).
//
// OJO: estas dos listas conservan su orden a proposito y NO se alfabetizan. ESTATUS_TAREA es un
// pipeline (Borrador -> No iniciada -> ... -> Cancelada) y FRECUENCIA va de mas corta a mas larga:
// ahi el orden ES la informacion. Ver la nota de ordenAlfabetico en lib/listas.js.

export const ESTATUS_TAREA = ["Borrador", "No iniciada", "Pendiente", "En proceso", "En espera", "Completada", "Cancelada"];
export const FRECUENCIA = ["Semanal", "Quincenal", "Mensual", "Anual"];
