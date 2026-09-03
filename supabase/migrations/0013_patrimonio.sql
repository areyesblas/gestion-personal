-- Módulo de Patrimonio: bienes (inmuebles, autos, joyería, equipo de audio, etc.) con
-- historial de valuaciones a lo largo del tiempo, para poder registrar plusvalía o
-- minusvalía en vez de guardar solo un valor fijo.
create table if not exists patrimonio (
  id text primary key,
  nombre text not null,
  categoria text default 'Otro',  -- Inmueble / Auto / Joyería / Equipo de audio / Electrónica / Otro
  fecha_adquisicion date,
  valor_adquisicion numeric default 0,
  notas text,
  created_at timestamptz default now()
);
create table if not exists patrimonio_valuaciones (
  id text primary key,
  patrimonio_id text references patrimonio(id) on delete cascade,
  fecha date not null,
  valor numeric not null,
  notas text,
  created_at timestamptz default now()
);
alter table patrimonio enable row level security;
alter table patrimonio_valuaciones enable row level security;
create policy "solo_autenticados" on patrimonio for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "solo_autenticados" on patrimonio_valuaciones for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
