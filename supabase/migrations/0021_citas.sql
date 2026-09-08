-- Módulo nuevo "Citas": agenda ligera con hora, distinto de Eventos (shows del negocio) y
-- Actividades (bitácora personal). Se conecta al motor de recordatorios push ya existente.
create table public.citas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  fecha_hora timestamptz not null,
  lugar text,
  contacto_id text references public.contactos(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.citas enable row level security;

create policy acceso_por_modulo on public.citas
  for all using (has_access('citas'::text, user_id)) with check (has_access('citas'::text, user_id));

create index citas_user_id_idx on public.citas(user_id);
create index citas_fecha_hora_idx on public.citas(fecha_hora);
