alter table public.finanzas
  add column if not exists evento_id text;

create index if not exists idx_finanzas_evento_id on public.finanzas(evento_id) where evento_id is not null;
