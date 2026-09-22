-- Módulo Nutrición, sub-sección de Salud (mismo modulo de permisos "salud"). Recetario
-- compartido de la cuenta (no se duplica por persona) + dieta por día y persona.

create table if not exists public.recetas (
  id text primary key,
  nombre text not null,
  categoria text,
  porciones numeric,
  ingredientes jsonb default '[]'::jsonb,
  instrucciones text,
  notas text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.recetas enable row level security;
create policy "acceso_por_modulo" on public.recetas for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));

create table if not exists public.dieta_dias (
  id text primary key,
  contacto_id text references public.contactos(id) on delete set null,
  fecha date not null,
  tipo_comida text not null,
  receta_id text references public.recetas(id) on delete set null,
  descripcion text,
  notas text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.dieta_dias enable row level security;
create policy "acceso_por_modulo" on public.dieta_dias for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));
