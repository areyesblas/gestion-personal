-- Cada hábito ahora puede definir su frecuencia esperada: todos los días (default, compatible con
-- los hábitos que ya existen), días específicos de la semana, o X veces por semana.
alter table public.habitos
  add column if not exists frecuencia_tipo text default 'diario',
  add column if not exists frecuencia_dias_semana int[] default null,
  add column if not exists frecuencia_veces_semana int default null;
