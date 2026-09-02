-- Punto 4 del backlog: facturas emitidas/recibidas y control de IVA (trasladado/acreditable).
create table if not exists facturas (
  id text primary key,
  tipo text not null default 'Recibida', -- Emitida / Recibida
  proyecto_id text references proyectos(id) on delete set null,
  contacto_id text references contactos(id) on delete set null,
  folio text,
  fecha date,
  concepto text,
  subtotal numeric default 0,
  iva numeric default 0,
  total numeric default 0,
  estatus text default 'Pendiente', -- Pendiente / Pagada / Cancelada
  notas text,
  created_at timestamptz default now()
);
alter table facturas enable row level security;
create policy "solo_autenticados" on facturas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
