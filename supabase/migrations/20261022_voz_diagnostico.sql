-- Traza temporal del Modo Conversación (Arkey) para diagnosticar por qué en iPhone deja de
-- escuchar después de la primera respuesta. Cada usuario solo puede insertar y leer lo suyo.
-- Temporal: borrar la tabla cuando el bug quede resuelto.
create table if not exists public.voz_diagnostico (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sesion text not null,
  t timestamptz not null default now(),
  ms_cliente bigint,
  evento text not null,
  datos jsonb
);
alter table public.voz_diagnostico enable row level security;
create policy voz_diag_insert on public.voz_diagnostico for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy voz_diag_select on public.voz_diagnostico for select to authenticated
  using (user_id = (select auth.uid()));
create index if not exists voz_diagnostico_user_t on public.voz_diagnostico (user_id, t desc);
