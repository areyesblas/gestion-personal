-- Notas libres: no se ligan a ningún proyecto, tarea, subtarea ni nada — solo texto suelto.
create table public.notas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text,
  contenido text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.notas enable row level security;

create policy acceso_por_modulo on public.notas
  for all using (has_access('notas'::text, user_id)) with check (has_access('notas'::text, user_id));

create index notas_user_id_idx on public.notas(user_id);

-- Mantiene updated_at al día automáticamente en cada edición, sin depender de que el cliente lo mande.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notas_set_updated_at
  before update on public.notas
  for each row execute function public.set_updated_at();
