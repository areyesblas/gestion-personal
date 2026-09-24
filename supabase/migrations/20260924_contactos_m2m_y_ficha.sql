-- Contactos: campos nuevos para la ficha ampliada (foto, empresa, puesto, teléfono),
-- y relación Contacto–Proyecto muchos-a-muchos (antes era un solo proyecto_id por
-- contacto). Anexo de arquitectura de Angel confirma explícitamente que esa relación
-- debe ser muchos-a-muchos. Molde de la tabla puente calcado de
-- colaborador_dependientes (migración 0041), que ya es el patrón real de M2M del
-- proyecto.

alter table public.contactos
  add column if not exists foto_url text,
  add column if not exists empresa text,
  add column if not exists puesto text,
  add column if not exists telefono text;

create table if not exists public.contacto_proyectos (
  id uuid primary key default gen_random_uuid(),
  contacto_id text not null references public.contactos(id) on delete cascade,
  proyecto_id text not null references public.proyectos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contacto_id, proyecto_id)
);

alter table public.contacto_proyectos enable row level security;

create policy acceso_por_modulo on public.contacto_proyectos
  for all using (public.has_access('contactos', user_id)) with check (public.has_access('contactos', user_id));

create index contacto_proyectos_contacto_idx on public.contacto_proyectos(contacto_id);
create index contacto_proyectos_proyecto_idx on public.contacto_proyectos(proyecto_id);

-- Migra los vínculos existentes (un proyecto por contacto) a la tabla puente antes de
-- quitar la columna vieja — sin esto se perdería el dato.
insert into public.contacto_proyectos (contacto_id, proyecto_id, user_id)
select id, proyecto_id, user_id from public.contactos
where proyecto_id is not null and proyecto_id <> ''
on conflict (contacto_id, proyecto_id) do nothing;

alter table public.contactos drop column if exists proyecto_id;

-- Notas: vínculo opcional a un contacto, para el tab "Notas" de la ficha. Nullable a
-- propósito — las notas libres que ya existen (sin ligar a nada) siguen funcionando
-- igual, ver comentario original en 0022_notas.sql.
alter table public.notas
  add column if not exists contacto_id text references public.contactos(id) on delete set null;

create index if not exists notas_contacto_id_idx on public.notas(contacto_id) where contacto_id is not null;
