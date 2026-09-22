-- Mi Perfil: extiende preferencias (1 fila por usuario, igual que avatar_url/ciudad/nombre_mostrar
-- que ya viven ahí) en vez de crear una tabla nueva -- un perfil profesional no es una lista de
-- registros repetidos, es configuración singular por usuario.
alter table public.preferencias add column if not exists perfil_bio text;
alter table public.preferencias add column if not exists perfil_estudios jsonb not null default '[]'::jsonb;
alter table public.preferencias add column if not exists perfil_habilidades text[] not null default '{}';
alter table public.preferencias add column if not exists perfil_redes jsonb not null default '[]'::jsonb;

comment on column public.preferencias.perfil_estudios is 'Array de {institucion, titulo, anio}, orden más reciente primero (Mi Perfil).';
comment on column public.preferencias.perfil_redes is 'Array de {red, url} -- LinkedIn, Instagram, sitio web, etc (Mi Perfil).';

-- Presupuesto: SÍ es entidad propia (metas de gasto por categoría o por proyecto, con periodo
-- mensual o anual). El presupuesto GENERAL mensual ya existe (preferencias.presupuesto_mensual,
-- usado por el widget "Tu progreso") y no se duplica aquí -- esta tabla es solo para el nivel
-- granular que faltaba. Finanzas sigue siendo la única fuente de verdad del dinero real; esta
-- tabla solo guarda el objetivo, la comparación contra lo real se calcula en el cliente.
-- id es text (no uuid) para ser consistente con el resto de las tablas de entidades de la app,
-- que generan el id en el cliente (uid()) en vez de usar un default de Postgres.
create table public.presupuestos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('categoria','proyecto')),
  categoria text,
  proyecto_id text references public.proyectos(id) on delete cascade,
  periodo text not null default 'mensual' check (periodo in ('mensual','anual')),
  monto numeric not null check (monto >= 0),
  notas text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.presupuestos enable row level security;
create policy acceso_por_modulo on public.presupuestos for all
  using (public.has_access('presupuestos', user_id)) with check (public.has_access('presupuestos', user_id));

create index presupuestos_user_id_idx on public.presupuestos(user_id);
