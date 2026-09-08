alter table public.preferencias
  add column if not exists hora_inicio_comida time,
  add column if not exists duracion_comida_min integer;
