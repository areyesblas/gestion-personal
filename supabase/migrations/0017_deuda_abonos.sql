-- Historial de abonos a deudas: cada vez que pagas algo a una deuda, queda un registro
-- con monto, fecha, comentario, documento adjunto (comprobante) y fecha compromiso opcional.
create table if not exists deuda_abonos (
  id text primary key,
  deuda_id text references deudas(id) on delete cascade,
  fecha date not null,
  monto numeric not null,
  comentario text,
  adjunto_nombre text,
  adjunto_url text,
  fecha_compromiso date,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  deleted_at timestamptz,
  created_at timestamptz default now()
);
alter table deuda_abonos enable row level security;
create policy "acceso_por_modulo" on deuda_abonos for all
  using (public.has_access('deuda_abonos', user_id)) with check (public.has_access('deuda_abonos', user_id));
