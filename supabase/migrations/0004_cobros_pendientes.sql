-- Fecha de vencimiento para cobros pendientes a clientes (rentas, shows, sistemas, publicidad)
alter table finanzas add column if not exists fecha_vencimiento date;
