-- Punto 3 del backlog: pipeline de proyectos (finito/continuo) y subtareas ilimitadas
-- con tiempo estimado/real, para calcular avance automático y rentabilidad.
alter table proyectos add column if not exists modo text default 'Finito';  -- Finito / Continuo
alter table pendientes add column if not exists parent_id text references pendientes(id) on delete cascade;
alter table pendientes add column if not exists tiempo_estimado numeric;  -- horas
alter table pendientes add column if not exists tiempo_real numeric;      -- horas
