-- Fase 6 (Dependientes) del documento maestro: rol "Cuidador" con visibilidad parcial.
-- Un colaborador puede recibir acceso a UNA persona concreta (Contacto) en Salud/Medicamentos
-- sin necesitar el módulo completo de Salud/Medicamentos/Contactos de la cuenta del propietario.
-- No duplica el permiso existente por módulo (colaboradores.modulos); lo complementa.

create table if not exists public.colaborador_dependientes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  propietario_id uuid references auth.users(id) on delete cascade not null,
  contacto_id text references public.contactos(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (colaborador_id, contacto_id)
);
alter table public.colaborador_dependientes enable row level security;

create policy "propietario_administra_dependientes" on public.colaborador_dependientes for all
  using (propietario_id = auth.uid()) with check (propietario_id = auth.uid());
create policy "colaborador_ve_sus_dependientes" on public.colaborador_dependientes for select
  using (exists (
    select 1 from public.colaboradores c
    where c.id = colaborador_dependientes.colaborador_id and c.colaborador_user_id = auth.uid()
  ));

-- true si quien consulta (auth.uid()) es cuidador activo de p_contacto_id dentro de la cuenta p_propietario.
create or replace function public.es_cuidador_de(p_propietario uuid, p_contacto_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_contacto_id is not null and exists (
    select 1 from colaborador_dependientes cd
    join colaboradores c on c.id = cd.colaborador_id
    where cd.propietario_id = p_propietario
      and cd.contacto_id = p_contacto_id
      and c.colaborador_user_id = auth.uid()
      and c.estatus = 'Activo'
  );
$$;

-- Salud, perfil_salud y medicamentos: acceso por módulo completo (como antes) O por ser
-- cuidador de la persona (contacto_id) concreta de ese registro.
drop policy if exists "acceso_por_modulo" on public.salud;
create policy "acceso_por_modulo" on public.salud for all
  using (public.has_access('salud', user_id) or public.es_cuidador_de(user_id, contacto_id))
  with check (public.has_access('salud', user_id) or public.es_cuidador_de(user_id, contacto_id));

drop policy if exists "acceso_por_modulo" on public.perfil_salud;
create policy "acceso_por_modulo" on public.perfil_salud for all
  using (public.has_access('salud', user_id) or public.es_cuidador_de(user_id, contacto_id))
  with check (public.has_access('salud', user_id) or public.es_cuidador_de(user_id, contacto_id));

drop policy if exists "acceso por módulo a medicamentos" on public.medicamentos;
create policy "acceso_por_modulo" on public.medicamentos for all
  using (public.has_access('medicamentos', user_id) or public.es_cuidador_de(user_id, contacto_id))
  with check (public.has_access('medicamentos', user_id) or public.es_cuidador_de(user_id, contacto_id));

-- Contactos: además del módulo completo, un cuidador puede LEER (no editar) la ficha del
-- contacto concreto que tiene a cargo, para poder mostrar su nombre en Salud/Medicamentos.
drop policy if exists "acceso_por_modulo" on public.contactos;
create policy "acceso_por_modulo" on public.contactos for all
  using (public.has_access('contactos', user_id) or public.es_cuidador_de(user_id, id))
  with check (public.has_access('contactos', user_id));
