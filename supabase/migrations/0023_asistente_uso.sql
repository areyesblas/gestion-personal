-- Control de uso mensual del asistente de IA. Un renglon por usuario por mes (año-mes como texto
-- "2026-09" para que sea trivial de leer/escribir sin lidiar con rangos de fecha).
create table if not exists public.asistente_uso (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mes text not null, -- formato "YYYY-MM"
  consultas_usadas int not null default 0,
  limite_mes int not null default 100, -- limite gratuito inicial; a futuro puede variar por plan
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mes)
);

alter table public.asistente_uso enable row level security;

create policy "asistente_uso_propio" on public.asistente_uso
  for all using (has_access('asistente', user_id)) with check (has_access('asistente', user_id));

create trigger asistente_uso_set_updated_at
  before update on public.asistente_uso
  for each row execute function set_updated_at();

-- Historial de conversacion del asistente (opcional guardarlo, pero util para que el usuario
-- pueda ver que le respondio antes, y para depurar). No se manda de vuelta como contexto al
-- modelo salvo que se decida despues; por ahora solo es bitacora visible en el modulo.
create table if not exists public.asistente_mensajes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rol text not null check (rol in ('usuario','asistente')),
  contenido text not null,
  acciones jsonb default '[]'::jsonb, -- registro de que herramientas se ejecutaron, si alguna
  created_at timestamptz not null default now()
);

alter table public.asistente_mensajes enable row level security;

create policy "asistente_mensajes_propio" on public.asistente_mensajes
  for all using (has_access('asistente', user_id)) with check (has_access('asistente', user_id));

create index if not exists idx_asistente_mensajes_user_fecha on public.asistente_mensajes(user_id, created_at desc);
