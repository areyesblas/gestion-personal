-- Parentesco en Contactos, y tabla de Regalos (histórico de regalos/felicitaciones,
-- incluyendo control específico de regalos de Navidad por año).
alter table contactos add column if not exists parentesco text;

create table if not exists regalos (
  id text primary key,
  contacto_id text references contactos(id) on delete set null,
  ocasion text default 'Otro',      -- Cumpleaños / Navidad / Aniversario / Felicitación / Otro
  anio integer,
  fecha date,
  descripcion text,
  costo numeric,
  estatus text default 'Por comprar',  -- Por comprar / Comprado / Envuelto / Entregado
  notas text,
  created_at timestamptz default now()
);
alter table regalos enable row level security;
create policy "solo_autenticados" on regalos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
