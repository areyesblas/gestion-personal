-- Fase 8 (Campañas) del documento maestro: jerarquía Proyecto → Campaña → Actividades
-- calendarizadas, y aplicación de la regla maestra de dinero también a Marketing
-- (sección 24.7 / 24.8: "No capturar manualmente Gastado hasta ahora ni Ingreso
-- generado... costos de pauta e ingresos se registran en Finanzas y se vinculan a
-- campaña/proyecto").

-- 1) Finanzas gana relación opcional con una campaña, para vincular gasto/ingreso real
--    sin duplicar información (mismo patrón que activo_id en Activos digitales).
alter table public.finanzas add column if not exists campana_id text references public.campanas(id) on delete set null;

-- 2) Actividades calendarizadas de una campaña: fecha/hora, canal, tipo de contenido,
--    acción, responsable, prioridad, tiempo y estado — según sección 10 del documento.
create table if not exists public.campana_actividades (
  id text primary key,
  campana_id text references public.campanas(id) on delete cascade not null,
  proyecto_id text references public.proyectos(id) on delete set null,
  fecha date not null,
  hora time,
  canal text,
  tipo_contenido text,
  accion text not null,
  responsable_contacto_id text references public.contactos(id) on delete set null,
  prioridad text default 'Media',
  valor_estimado numeric,
  tiempo_estimado_horas numeric,
  tiempo_real_horas numeric,
  estado text default 'Pendiente', -- Pendiente / En proceso / Publicada / Cancelada
  notas text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
alter table public.campana_actividades enable row level security;
create policy "acceso_por_modulo" on public.campana_actividades for all
  using (public.has_access('campanas', user_id)) with check (public.has_access('campanas', user_id));
