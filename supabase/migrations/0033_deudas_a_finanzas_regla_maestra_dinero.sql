-- ARKEYONE v1.2, sección 23.11 / 40: "Deudas no es una entidad independiente. Es una vista
-- especializada de egresos que tienen saldo pendiente de pago." Migramos las deudas reales
-- existentes a Finanzas como Egresos con estatus='Pendiente', y dejamos la tabla vieja como
-- respaldo histórico (renombrada, ya no se usa desde el código).

-- 1) Migrar las deudas reales a Finanzas, conservando el mismo id para que cualquier
--    referencia futura (recordatorios, alertas_enviadas) siga apuntando al mismo registro.
insert into public.finanzas
  (id, tipo, proyecto_id, fecha, monto, categoria, forma, estatus, created_at, concepto, contacto_id, es_recurrente, fecha_vencimiento, user_id, deleted_at)
select
  id, 'Egreso', proyecto_id, created_at::date, monto, 'Deuda', 'Transferencia', 'Pendiente', created_at, acreedor, null, false, fecha_vencimiento, user_id, deleted_at
from public.deudas
where not exists (select 1 from public.finanzas f where f.id = deudas.id);

-- 2) Repropósito de deuda_abonos: pasa a ser la tabla de pagos/abonos parciales de CUALQUIER
--    movimiento de Finanzas (no solo lo que antes era "deuda"), acorde a 23.9.
alter table public.deuda_abonos drop constraint if exists deuda_abonos_deuda_id_fkey;
alter table public.deuda_abonos rename column deuda_id to finanzas_id;
alter table public.deuda_abonos add constraint pagos_finanzas_finanzas_id_fkey
  foreign key (finanzas_id) references public.finanzas(id) on delete cascade;
alter table public.deuda_abonos rename to pagos_finanzas;

-- 3) La tabla deudas queda como respaldo histórico, fuera de uso.
alter table public.deudas rename to deudas_legado_migrado_a_finanzas;

comment on table public.deudas_legado_migrado_a_finanzas is
  'Tabla desactivada el 9-sep-2026: Deudas se fusionó con Finanzas (regla maestra de dinero, Documento Maestro v1.2 secc. 23.11/40). Se conserva solo como respaldo histórico, el código ya no la usa.';
comment on table public.pagos_finanzas is
  'Pagos/abonos parciales sobre un movimiento de finanzas. Antes se llamaba deuda_abonos y solo aplicaba a deudas; ahora aplica a cualquier movimiento (ingreso o egreso).';
