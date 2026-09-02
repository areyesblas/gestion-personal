-- Agrega el campo "concepto" a Finanzas, y conecta Contactos con Pendientes y Finanzas
alter table finanzas add column if not exists concepto text;
alter table contactos add column if not exists tipo text default 'Otro';
alter table pendientes add column if not exists contacto_id text references contactos(id) on delete set null;
alter table finanzas add column if not exists contacto_id text references contactos(id) on delete set null;
