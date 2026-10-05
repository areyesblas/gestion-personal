-- Notas: etiquetas y notas fijadas.
--
-- Hasta ahora una nota solo tenía título y contenido, y con dos docenas encima la única forma de
-- encontrar algo era buscar por texto. Dos columnas resuelven lo que faltaba:
--
--   etiquetas -> cómo se agrupan (Personal, Trabajo, Salud, Ideas…). Varias por nota, igual que
--                en contactos y proyectos. Catálogo abierto: se crean al escribirlas y las
--                opciones salen de lo ya capturado, así que no hay tabla que mantener.
--   fijada    -> las que se quieren tener siempre a la vista, hasta arriba de la lista.
--
-- El color de cada etiqueta NO se guarda: se deduce del propio nombre con una función del
-- frontend, de modo que la misma etiqueta siempre sale del mismo color en cualquier pantalla y
-- sin tener que mantener una paleta en la base.
--
-- No destructiva: dos columnas con valores por omisión que dejan todo lo existente igual.
-- No toca ninguna política de RLS.

alter table public.notas add column if not exists etiquetas jsonb not null default '[]'::jsonb;
alter table public.notas add column if not exists fijada boolean not null default false;

comment on column public.notas.etiquetas is
  'Etiquetas de la nota (Personal, Trabajo, Salud…). Arreglo JSON de texto, catálogo abierto. El color se deduce del nombre en el frontend, no se guarda.';
comment on column public.notas.fijada is
  'true = la nota se queda hasta arriba de la lista, antes que las demás.';

create index if not exists notas_etiquetas_idx
  on public.notas using gin (etiquetas)
  where deleted_at is null;

-- ROLLBACK (no ejecutar salvo que haya que revertir):
-- drop index if exists public.notas_etiquetas_idx;
-- alter table public.notas drop column if exists fijada;
-- alter table public.notas drop column if exists etiquetas;
