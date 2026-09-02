-- Punto 5 del backlog: módulo de marketing por proyecto (calendario, campañas,
-- presupuesto, métricas y retorno). El campo id_externo queda listo para cuando se
-- conecte con Meta/Google/Stripe en el futuro.
create table if not exists campanas (
  id text primary key,
  proyecto_id text references proyectos(id) on delete set null,
  nombre text,
  plataforma text default 'Meta',
  fecha_inicio date,
  fecha_fin date,
  presupuesto numeric default 0,
  gastado numeric default 0,
  alcance numeric,
  clics numeric,
  conversiones numeric,
  ingreso_generado numeric default 0,
  estatus text default 'Planeada', -- Planeada / Activa / Pausada / Finalizada
  id_externo text,
  notas text,
  created_at timestamptz default now()
);
alter table campanas enable row level security;
create policy "solo_autenticados" on campanas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
