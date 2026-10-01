-- Finanzas en varias monedas, sin que el histórico se mueva.
--
-- El problema que resuelve: si un movimiento solo guarda "1,200 USD", cualquier pantalla que
-- quiera sumarlo tiene que convertirlo, y si convierte con el tipo de cambio de HOY, un gasto de
-- hace dos años cambia de valor cada vez que se abre la pantalla. Los reportes del año pasado
-- dejan de cuadrar con lo que realmente pasó.
--
-- La regla: un movimiento se congela en el momento en que ocurre. Tres datos por movimiento:
--
--   monto       -> lo que de verdad se movió, en SU moneda            (1200)
--   moneda      -> en qué moneda fue                                   ('USD')
--   tipo_cambio -> a cuánto estaba ESE DÍA, contra la moneda base      (17.85)
--   monto_base  -> monto × tipo_cambio, ya congelado                   (21420)
--
-- Todo lo que suma, reporta o compara usa monto_base. Ese número no se vuelve a tocar nunca:
-- si mañana el dólar se va a 20, el gasto de ayer sigue valiendo lo que costó ayer.
--
-- La moneda base de la cuenta es MXN. monto_base NO es una columna generada a propósito: el
-- frontend la calcula y la escribe, porque una columna generada no se puede mandar en un UPDATE
-- y los formularios de la app mandan la fila completa al editar.
--
-- No destructiva: solo agrega columnas con valores por omisión que dejan todo lo existente
-- exactamente como estaba (MXN a tipo de cambio 1). No toca ninguna política de RLS.

alter table public.finanzas add column if not exists moneda text not null default 'MXN';
alter table public.finanzas add column if not exists tipo_cambio numeric not null default 1;
alter table public.finanzas add column if not exists monto_base numeric;

comment on column public.finanzas.monto is
  'Lo que se movió, en la moneda del movimiento (ver columna moneda). NO sumar esta columna entre movimientos de monedas distintas.';
comment on column public.finanzas.moneda is
  'Código ISO de la moneda del movimiento: MXN, USD, EUR… Por omisión MXN, que es la moneda base de la cuenta.';
comment on column public.finanzas.tipo_cambio is
  'Cuántos pesos valía una unidad de `moneda` el día del movimiento. 1 cuando el movimiento ya es en MXN. Se sugiere desde una API y se puede corregir a mano, porque el tipo que cobra el banco casi nunca es el oficial.';
comment on column public.finanzas.monto_base is
  'monto × tipo_cambio, congelado al capturar. Es la columna que se suma y se reporta. Nunca se recalcula con tipos de cambio posteriores.';

-- Backfill: todo lo que ya existía era MXN, así que su monto base es su propio monto.
update public.finanzas
   set monto_base = monto
 where monto_base is null;

create index if not exists finanzas_moneda_idx
  on public.finanzas (user_id, moneda)
  where deleted_at is null and moneda <> 'MXN';

-- ROLLBACK (no ejecutar salvo que haya que revertir):
-- drop index if exists public.finanzas_moneda_idx;
-- alter table public.finanzas drop column if exists monto_base;
-- alter table public.finanzas drop column if exists tipo_cambio;
-- alter table public.finanzas drop column if exists moneda;
