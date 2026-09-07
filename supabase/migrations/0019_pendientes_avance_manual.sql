-- Porcentaje de avance manual para tareas finales (sin subtareas). Si es NULL, el avance se sigue
-- calculando de forma binaria a partir del estatus (Hecho=100, En progreso=50, Pendiente=0), como antes.
-- Las tareas CON subtareas nunca usan este campo: su avance sigue siendo el promedio de sus hijos.
alter table public.pendientes
  add column if not exists avance smallint check (avance is null or (avance >= 0 and avance <= 100));
