-- Ejercicios "por tiempo" (circuitos tipo Planet Fitness: 1 min de fuerza, 30 seg de
-- descanso, siguiente ejercicio...), como alternativa a series/repeticiones. `tipo` decide
-- qué campos aplican: 'series' (peso/series/repeticiones, como hasta ahora) o 'tiempo'
-- (duracion_segundos/descanso_segundos). Mismas tablas de siempre — no se crea tabla nueva.

alter table public.rutina_ejercicio_items add column if not exists tipo text not null default 'series';
alter table public.rutina_ejercicio_items add column if not exists duracion_segundos integer;
alter table public.rutina_ejercicio_items add column if not exists descanso_segundos integer;

alter table public.sesion_ejercicio_items add column if not exists tipo text not null default 'series';
alter table public.sesion_ejercicio_items add column if not exists duracion_segundos integer;
alter table public.sesion_ejercicio_items add column if not exists descanso_segundos integer;

comment on column public.rutina_ejercicio_items.tipo is '''series'' (peso/series/repeticiones) o ''tiempo'' (duracion_segundos/descanso_segundos), configurable por ejercicio dentro de la rutina.';
comment on column public.sesion_ejercicio_items.tipo is 'Copiado del ejercicio de la rutina al iniciar la sesión, o elegido directo si se agrega libre.';
