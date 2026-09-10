-- Activo digital con renovación automática: genera egreso recurrente en Finanzas (v1.2 secc. 23.15)
-- Sigue el mismo patrón de movimiento "espejo" usado para Eventos (evento_id -> activo_id).
alter table public.activos
  add column if not exists frecuencia_renovacion text not null default 'Anual';

alter table public.finanzas
  add column if not exists activo_id text references public.activos(id) on delete set null;
