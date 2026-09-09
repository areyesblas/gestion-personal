-- Amplía los estados de Tareas (tabla pendientes) de 3 a los 7 que define el documento maestro
-- v0.1: Borrador, No iniciada, Pendiente, En proceso, En espera, Completada, Cancelada.
-- Migra los valores existentes: "Hecho" -> "Completada", "En progreso" -> "En proceso".
-- "Pendiente" se mantiene igual. No se agregan columnas, "estatus" ya era texto libre.
update public.pendientes set estatus = 'Completada' where estatus = 'Hecho';
update public.pendientes set estatus = 'En proceso' where estatus = 'En progreso';
