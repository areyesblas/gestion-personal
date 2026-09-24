-- Onboarding y contextos adaptativos (Personal / Profesional / Empresarial), 24 sept 2026.
--
-- MODELO DE DATOS — decisiones y por qué (secc. 28: documentar antes de implementar)
--
-- 1) Los contextos NO son tres aplicaciones ni tres copias de cada módulo. Son una CAPA
--    TRANSVERSAL: una preferencia del usuario (qué ámbitos usa) más una propiedad de las
--    entidades que de verdad pertenecen a un ámbito. Por eso aquí NO se duplica ninguna tabla.
--
-- 2) Las preferencias del onboarding viven en `preferencias`, la tabla de configuración que ya
--    existe (tema, widgets del panel, nombre, ciudad, perfil…). NO se crea un segundo sistema de
--    configuración: son tres columnas más en la fila que el usuario ya tiene.
--
-- 3) `empresas` SÍ es entidad nueva, y es la única que hacía falta. Una empresa es una cosa real
--    con nombre, logo y descripción, y otras entidades tienen que poder APUNTAR a ella (un
--    proyecto es "de la empresa A"). Eso necesita una fila con id propio; guardarlas como texto
--    dentro de preferencias haría imposible relacionarlas sin duplicar el nombre en cada lugar.
--    Se suma a la lista de tablas normales de la app, así que hereda papelera lógica, RLS por
--    módulo, exportación y respaldo sin código especial.
--
-- 4) `proyectos.empresa_id` es la relación mínima para que el filtro por empresa del Centro de
--    Mando tenga de dónde agarrarse. El proyecto ya tenía `contexto`; la empresa solo aplica
--    cuando ese contexto es Empresarial.
--
-- 5) Lo que a propósito NO se hace aquí: Finanzas todavía no distingue contexto/empresa por sí
--    misma (hoy lo hereda del proyecto del movimiento). Agregar columnas sin la UI que las llene
--    dejaría un filtro que siempre sale vacío, que es peor que no tenerlo. Queda documentado como
--    el siguiente paso.

-- ---------------------------------------------------------------------------
-- Preferencias del onboarding
-- ---------------------------------------------------------------------------
alter table public.preferencias
  add column if not exists contextos text[] not null default '{}',
  add column if not exists actividad_profesional text,
  add column if not exists onboarding_completado boolean not null default false;

comment on column public.preferencias.contextos is
  'Ambitos que el usuario dijo usar: Personal, Profesional, Empresarial. Puede traer varios. Vacio = sin configurar, la app se comporta como antes (sin filtro de contexto).';
comment on column public.preferencias.actividad_profesional is
  'Texto libre y opcional del contexto Profesional (Musico, Consultor, Disenador...). NO crea una empresa.';
comment on column public.preferencias.onboarding_completado is
  'true cuando el usuario termino o salto el onboarding. Evita volver a mostrarlo en cada sesion.';

-- Las cuentas que ya existen nunca vieron el onboarding y ya tienen su app configurada a mano:
-- se marcan como completadas para no interrumpirlas. Se quedan con contextos vacio, que es
-- justamente "sin contexto configurado" = el comportamiento actual, intacto.
update public.preferencias set onboarding_completado = true where onboarding_completado = false;

-- ---------------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------------
create table if not exists public.empresas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  descripcion text,
  logo_url text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists empresas_user_id_idx on public.empresas(user_id);

alter table public.empresas enable row level security;

-- Mismo modelo que el resto de las entidades: has_access(modulo, propietario) decide, no la UI.
-- Es security definer (ver 0016) para no caer en recursion infinita dentro de la politica.
drop policy if exists acceso_por_modulo on public.empresas;
create policy acceso_por_modulo on public.empresas
  for all
  using (has_access('empresas', user_id))
  with check (has_access('empresas', user_id));

comment on table public.empresas is
  'Empresas que administra el usuario. Es una perspectiva del contexto Empresarial, no una segunda aplicacion: los modulos (Finanzas, Contactos, Proyectos, Tareas...) NO se duplican por empresa, se relacionan con ella.';

-- ---------------------------------------------------------------------------
-- Proyecto -> empresa
-- ---------------------------------------------------------------------------
alter table public.proyectos
  add column if not exists empresa_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'proyectos_empresa_id_fkey') then
    alter table public.proyectos
      add constraint proyectos_empresa_id_fkey
      foreign key (empresa_id) references public.empresas(id) on delete set null;
  end if;
end $$;

create index if not exists proyectos_empresa_id_idx on public.proyectos(empresa_id);

comment on column public.proyectos.empresa_id is
  'Empresa dueña del proyecto. Solo aplica cuando contexto = Empresarial. NULL en proyectos personales o profesionales.';
