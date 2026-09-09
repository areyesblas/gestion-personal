-- Renombre funcional de "Regalos" a "Atenciones": se agrega un campo "tipo" para distinguir
-- QUÉ clase de atención se dio (Regalo, Felicitación, Condolencia, Agradecimiento, Otro),
-- separado de la ocasión (Cumpleaños, Navidad, Aniversario, etc., que sigue siendo CUÁNDO/POR QUÉ).
-- No se elimina ni migra ninguna columna existente.
alter table public.regalos add column if not exists tipo text default 'Regalo';
