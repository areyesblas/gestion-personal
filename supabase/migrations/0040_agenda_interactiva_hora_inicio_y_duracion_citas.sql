-- Etapa 6 (Agenda interactiva, v1.2 secc. 23.6): permite anclar una tarea a una hora exacta
-- (arrastrar y soltar) y dar duración real a las citas (redimensionar bordes).
alter table public.pendientes
  add column if not exists hora_inicio text; -- "HH:MM", null = sigue en acomodo automático

alter table public.citas
  add column if not exists duracion_horas numeric not null default 1;
