-- Permite que una Tarea se cree como "acción relacionada" de otra entidad (Cita, Deuda,
-- Documento o Activo digital), conservando de dónde vino — sin duplicar información, solo
-- trazabilidad. origen_tabla/origen_id son opcionales; una tarea capturada normalmente
-- (sin pasar por el prompt "¿Deseas crear una acción relacionada?") los deja en null.
alter table public.pendientes
  add column if not exists origen_tabla text default null,
  add column if not exists origen_id text default null;
