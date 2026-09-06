-- Preferencia de tema (Azul Claro / Azul Oscuro) guardada por usuario, para que te siga
-- entre dispositivos en vez de solo quedarse en el navegador.
create table if not exists preferencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tema text default 'oscuro',
  created_at timestamptz default now()
);
alter table preferencias enable row level security;
create policy "solo_su_propio_usuario" on preferencias for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
