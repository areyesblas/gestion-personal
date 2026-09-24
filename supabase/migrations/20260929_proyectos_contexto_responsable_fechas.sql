-- Rediseño de "Proyectos e ideas" (24 sept 2026): la lista deja de expandirse dentro de sí misma
-- y pasa al modelo LISTA → SELECCIONAR → FICHA, igual que Contactos.
--
-- Para que la lista pueda responder "¿en qué contexto está?, ¿quién es el responsable?, ¿de
-- cuándo a cuándo va?" sin abrir cada proyecto, el proyecto necesita esos campos. Hoy NO existen
-- en ninguna tabla (se verificó contra information_schema antes de escribir esto), así que se
-- agregan aquí en vez de fingirlos en el frontend.
--
-- Regla de datos: nada de esto duplica otro módulo. El responsable APUNTA a un Contacto (la
-- entidad maestra de personas) por FK, no copia su ficha; las etiquetas son del proyecto mismo.
-- El progreso NO se guarda: se sigue calculando desde las tareas del módulo Tareas.

alter table public.proyectos
  add column if not exists contexto text,                  -- Personal / Profesional / Empresarial
  add column if not exists responsable_contacto_id text,   -- null = tú, el dueño de la cuenta
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin date,
  add column if not exists etiquetas jsonb default '[]'::jsonb;

-- on delete set null: borrar un contacto no debe borrar ni romper el proyecto — simplemente
-- vuelve a quedar a tu cargo. (El borrado normal de la app es lógico —deleted_at—, así que esto
-- solo aplica en un borrado físico real, p.ej. desde la papelera.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'proyectos_responsable_contacto_id_fkey') then
    alter table public.proyectos
      add constraint proyectos_responsable_contacto_id_fkey
      foreign key (responsable_contacto_id) references public.contactos(id) on delete set null;
  end if;
end $$;

create index if not exists proyectos_responsable_contacto_id_idx
  on public.proyectos(responsable_contacto_id);

comment on column public.proyectos.contexto is
  'Contexto de vida del proyecto: Personal, Profesional o Empresarial. Es una propiedad del proyecto, no un modulo aparte.';
comment on column public.proyectos.responsable_contacto_id is
  'Contacto responsable del proyecto. NULL = el dueno de la cuenta.';
comment on column public.proyectos.fecha_inicio is 'Inicio planeado del proyecto.';
comment on column public.proyectos.fecha_fin is 'Fin planeado del proyecto.';
comment on column public.proyectos.etiquetas is
  'Etiquetas libres del proyecto (arreglo de texto guardado como jsonb).';
