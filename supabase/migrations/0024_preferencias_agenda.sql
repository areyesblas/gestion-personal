-- Configuración de la agenda visual: cuántas horas laborales tiene el día (default 8), a qué
-- hora empieza la jornada, y qué días de la semana se consideran laborales (1=lunes .. 7=domingo,
-- ISO). Todo vive en la misma tabla de preferencias que ya existe (una fila por usuario).
alter table public.preferencias
  add column if not exists horas_laborales_diarias numeric not null default 8,
  add column if not exists hora_inicio_laboral time not null default '09:00',
  add column if not exists dias_laborales int[] not null default '{1,2,3,4,5}';
