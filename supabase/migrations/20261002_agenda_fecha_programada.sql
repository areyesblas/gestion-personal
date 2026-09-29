-- Agenda: separar "fecha límite" de "horario programado" en las tareas.
--
-- Hasta ahora una tarea tenía una sola fecha (fecha_limite) y, si se arrastraba en la Agenda, se
-- le escribía encima: mover un bloque de día cambiaba el compromiso de entrega, que no es lo que
-- el usuario quiere decir al reacomodar su día. Se separan los dos conceptos:
--
--   fecha_limite     -> para cuándo debe estar lista (compromiso). No la toca la Agenda.
--   fecha_programada -> qué día pienso hacerla. Junto con hora_inicio y tiempo_estimado define el
--                       bloque en la cuadrícula. NULL = la tarea solo tiene fecha límite y vive en
--                       la franja "Tareas del día", no en el horario.
--
-- No destructiva: solo agrega columnas, no borra ni renombra nada, y conserva los datos. Las
-- tareas que YA estaban ancladas a una hora (hora_inicio no nulo) se consideran programadas ese
-- mismo día, que es como se venían dibujando.
--
-- No toca ninguna política de RLS: pendientes y preferencias siguen protegidas por
-- has_access('pendientes', user_id) y por las políticas del ejecutor asignado, tal cual estaban.

alter table public.pendientes add column if not exists fecha_programada date;

comment on column public.pendientes.fecha_limite is
  'Para cuándo debe estar lista la tarea (compromiso de entrega). La Agenda NUNCA la modifica al reacomodar bloques.';
comment on column public.pendientes.fecha_programada is
  'Día en el que el usuario planea hacer la tarea. Con hora_inicio y tiempo_estimado forma el bloque de la Agenda. NULL = solo tiene fecha límite.';
comment on column public.pendientes.hora_inicio is
  'Hora de inicio del bloque programado, formato HH:MM. Solo tiene sentido acompañada de fecha_programada.';

-- Backfill: lo que ya estaba anclado a una hora queda programado el día de su fecha límite,
-- que es exactamente donde la Agenda lo venía dibujando. Nada más se toca.
update public.pendientes
   set fecha_programada = fecha_limite
 where hora_inicio is not null
   and fecha_limite is not null
   and fecha_programada is null;

create index if not exists pendientes_fecha_programada_idx
  on public.pendientes (user_id, fecha_programada)
  where deleted_at is null;

-- Interruptor "Mostrar tareas" de la Agenda, por usuario. Default true: quien ya usaba la Agenda
-- con tareas la sigue viendo igual después de desplegar.
alter table public.preferencias add column if not exists agenda_mostrar_tareas boolean not null default true;

comment on column public.preferencias.agenda_mostrar_tareas is
  'Interruptor "Mostrar tareas" de la Agenda. false = solo citas y eventos en la cuadrícula.';

-- ROLLBACK (no ejecutar salvo que haya que revertir):
-- drop index if exists public.pendientes_fecha_programada_idx;
-- alter table public.pendientes drop column if exists fecha_programada;
-- alter table public.preferencias drop column if exists agenda_mostrar_tareas;

-- Una cita también se puede marcar como realizada/asistida desde la tarjeta rápida de la Agenda.
-- Antes no había dónde registrarlo (la tabla citas solo guardaba el plan, no el resultado).
alter table public.citas add column if not exists realizada_en timestamptz;

comment on column public.citas.realizada_en is
  'Cuándo se marcó la cita como realizada/asistida. NULL = todavía no se marca.';

-- ROLLBACK de este bloque:
-- alter table public.citas drop column if exists realizada_en;
