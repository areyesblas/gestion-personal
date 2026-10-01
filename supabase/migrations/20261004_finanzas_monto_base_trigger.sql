-- monto_base siempre lleno, lo escriba quien lo escriba.
--
-- La columna monto_base (migración 20261003) es la que suman todas las pantallas. La llena el
-- formulario de Finanzas, pero hay varios caminos que insertan movimientos sin pasar por ahí:
-- la sincronización de Eventos, la de Activos digitales, el alta de deudas, los pagos a
-- colaboradores y la captura rápida. Esos dejaban monto_base en NULL.
--
-- Hoy no se nota porque el frontend hace `montoBase ?? monto`, pero esa red de seguridad solo
-- funciona mientras el movimiento sea en pesos: el día que uno de esos caminos registre algo en
-- dólares, la suma tomaría el monto sin convertir y el total quedaría mal sin que nada avise.
--
-- En vez de parchar cada camino —y acordarse de parchar el siguiente que se escriba—, la regla
-- vive en la base: si llega un movimiento sin monto_base, se calcula solo. Si viene con uno
-- explícito, se respeta tal cual, porque ese es el valor congelado del día de la operación y
-- nadie lo debe recalcular después.

create or replace function public.finanzas_set_monto_base()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.monto_base is null then
    new.monto_base := coalesce(new.monto, 0) * coalesce(new.tipo_cambio, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists finanzas_monto_base on public.finanzas;
create trigger finanzas_monto_base
  before insert or update on public.finanzas
  for each row execute function public.finanzas_set_monto_base();

-- Los que ya quedaron sin monto_base desde que existe la columna. Todos son MXN, así que su
-- monto base es su propio monto.
update public.finanzas
   set monto_base = coalesce(monto, 0) * coalesce(tipo_cambio, 1)
 where monto_base is null;

-- ROLLBACK (no ejecutar salvo que haya que revertir):
-- drop trigger if exists finanzas_monto_base on public.finanzas;
-- drop function if exists public.finanzas_set_monto_base();
