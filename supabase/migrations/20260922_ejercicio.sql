-- Módulo Ejercicio, sub-sección de Salud (mismo modulo de permisos "salud" — no se crea uno
-- nuevo). Rutinas configuradas con vigencia, sesiones (siguiendo una rutina o entrenamiento
-- libre) marcando avance, y medidas corporales.

create table if not exists public.rutinas_ejercicio (
  id text primary key,
  contacto_id text references public.contactos(id) on delete set null,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date,
  notas text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.rutinas_ejercicio enable row level security;
create policy "acceso_por_modulo" on public.rutinas_ejercicio for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));

create table if not exists public.rutina_ejercicio_items (
  id text primary key,
  rutina_id text references public.rutinas_ejercicio(id) on delete cascade not null,
  ejercicio text not null,
  peso numeric,
  series integer,
  repeticiones integer,
  orden integer default 0,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.rutina_ejercicio_items enable row level security;
create policy "acceso_por_modulo" on public.rutina_ejercicio_items for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));

create table if not exists public.sesiones_ejercicio (
  id text primary key,
  contacto_id text references public.contactos(id) on delete set null,
  rutina_id text references public.rutinas_ejercicio(id) on delete set null,
  fecha date not null,
  hora time,
  duracion_min numeric,
  notas text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.sesiones_ejercicio enable row level security;
create policy "acceso_por_modulo" on public.sesiones_ejercicio for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));

create table if not exists public.sesion_ejercicio_items (
  id text primary key,
  sesion_id text references public.sesiones_ejercicio(id) on delete cascade not null,
  rutina_item_id text references public.rutina_ejercicio_items(id) on delete set null,
  ejercicio text not null,
  peso numeric,
  series integer,
  repeticiones integer,
  hecho boolean default false,
  orden integer default 0,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.sesion_ejercicio_items enable row level security;
create policy "acceso_por_modulo" on public.sesion_ejercicio_items for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));

create table if not exists public.medidas_corporales (
  id text primary key,
  contacto_id text references public.contactos(id) on delete set null,
  fecha date not null,
  cintura_cm numeric,
  cadera_cm numeric,
  pecho_cm numeric,
  biceps_cm numeric,
  muslo_cm numeric,
  pantorrilla_cm numeric,
  cuello_cm numeric,
  notas text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.medidas_corporales enable row level security;
create policy "acceso_por_modulo" on public.medidas_corporales for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));
