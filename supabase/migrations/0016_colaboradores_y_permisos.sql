-- Niveles de acceso: invitar colaboradores a TU cuenta, con permisos por módulo específico.
-- El propietario invita por correo, elige qué módulos puede ver/editar ese colaborador,
-- y cuando esa persona se registra o inicia sesión, se vincula automáticamente.

create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid references auth.users(id) on delete cascade not null,
  propietario_email text,
  colaborador_email text not null,
  colaborador_user_id uuid references auth.users(id) on delete cascade,
  modulos text[] not null default '{}',
  estatus text not null default 'Pendiente', -- Pendiente / Activo / Revocado
  created_at timestamptz default now()
);
alter table colaboradores enable row level security;

create policy "propietario_administra" on colaboradores for all
  using (propietario_id = auth.uid()) with check (propietario_id = auth.uid());
create policy "colaborador_ve_su_acceso" on colaboradores for select
  using (colaborador_user_id = auth.uid());

create or replace function public.has_access(p_modulo text, p_propietario uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_propietario = auth.uid()
    or exists (
      select 1 from colaboradores c
      where c.propietario_id = p_propietario
        and c.colaborador_user_id = auth.uid()
        and c.estatus = 'Activo'
        and p_modulo = any(c.modulos)
    );
$$;

create or replace function public.vincular_invitaciones()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update colaboradores
  set colaborador_user_id = auth.uid(), estatus = 'Activo'
  where lower(colaborador_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and estatus = 'Pendiente';
end;
$$;

-- Reemplaza la política "solo tu propio usuario" por control fino por módulo en las 22 tablas + perfil_salud.
do $$
declare
  t text;
begin
  foreach t in array array[
    'proyectos','pendientes','equipo','finanzas','deudas','actividades','activos','metas',
    'contactos','redes_metricas','documentos','habitos','salud','apartados','eventos',
    'comentarios','saldo_inicial','regalos','facturas','campanas','patrimonio','patrimonio_valuaciones'
  ]
  loop
    execute format('drop policy if exists "solo_su_propio_usuario" on %I;', t);
    execute format('create policy "acceso_por_modulo" on %I for all using (public.has_access(%L, user_id)) with check (public.has_access(%L, user_id));', t, t, t);
  end loop;
end $$;

drop policy if exists "solo_su_propio_usuario" on perfil_salud;
create policy "acceso_por_modulo" on perfil_salud for all
  using (public.has_access('salud', user_id)) with check (public.has_access('salud', user_id));
