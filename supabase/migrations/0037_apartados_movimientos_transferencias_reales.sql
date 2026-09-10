-- ARKEYONE v1.2, secc. 23.13: "Ya tienes ahorrado" no se captura manualmente. El saldo ahorrado
-- se calcula a partir de movimientos de transferencia hacia el apartado menos retiros. Apartar
-- dinero no es un egreso: es una transferencia interna entre fondos/bolsas.
create table public.apartados_movimientos (
  id text primary key,
  apartado_id text not null references public.apartados(id) on delete cascade,
  tipo text not null check (tipo in ('aporte', 'retiro')),
  monto numeric not null check (monto > 0),
  fecha date not null default current_date,
  concepto text,
  proyecto_id text references public.proyectos(id) on delete set null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.apartados_movimientos enable row level security;
create policy acceso_por_modulo on public.apartados_movimientos for all
  using (has_access('apartados'::text, user_id))
  with check (has_access('apartados'::text, user_id));

comment on table public.apartados_movimientos is 'Historial de transferencias hacia (aporte) y desde (retiro) un Apartado. monto_actual en apartados es un caché calculado a partir de esta tabla, nunca se captura a mano.';
