-- Contactos: título de trato y etiquetas de clasificación.
--
-- Son dos ejes distintos y por eso son dos columnas, no una:
--
--   titulo    -> cómo te diriges a la persona: Dr., Arq., Lic., Ing., C.P. Un solo valor, corto,
--                sirve para redactar ("Estimado Arq. Quintana"), no para filtrar.
--   etiquetas -> qué ES la persona o a qué mundo pertenece: Médicos, Gobierno, ExGobierno,
--                Arquitectos… VARIAS por contacto, a propósito: alguien puede ser médico y de
--                gobierno a la vez, y "ExGobierno" es justo el caso en que un campo de un solo
--                valor obligaría a elegir entre lo que la persona es hoy y lo que fue antes.
--
-- Ninguna de las dos sustituye a `tipos`, que ya existe y describe TU RELACIÓN con la persona
-- (Cliente, Proveedor, Colaborador…). Si "Médico" se metiera ahí, el filtro de Clientes dejaría
-- de servir: son ejes que no se deben mezclar.
--
-- Las etiquetas son un catálogo abierto, igual que los tags de Citas y las etiquetas de
-- Proyectos: se crean al escribirlas y las opciones se deducen de lo que ya está capturado. No
-- hay tabla de catálogo que mantener ni que pueda quedarse huérfana.
--
-- No destructiva: dos columnas nuevas con valores por omisión que dejan todo lo existente igual.
-- No toca ninguna política de RLS.

alter table public.contactos add column if not exists titulo text;
alter table public.contactos add column if not exists etiquetas jsonb not null default '[]'::jsonb;

comment on column public.contactos.titulo is
  'Título de trato: Dr., Arq., Lic., Ing., C.P. Un solo valor. Es para dirigirse a la persona, no para filtrar.';
comment on column public.contactos.etiquetas is
  'Clasificación libre y múltiple del contacto (Médicos, Gobierno, ExGobierno…). Arreglo JSON de texto. Distinto de `tipos`, que es la relación comercial.';

-- Índice GIN: buscar "todos los de Gobierno" es justo para lo que se agregaron.
create index if not exists contactos_etiquetas_idx
  on public.contactos using gin (etiquetas)
  where deleted_at is null;

-- ROLLBACK (no ejecutar salvo que haya que revertir):
-- drop index if exists public.contactos_etiquetas_idx;
-- alter table public.contactos drop column if exists etiquetas;
-- alter table public.contactos drop column if exists titulo;
