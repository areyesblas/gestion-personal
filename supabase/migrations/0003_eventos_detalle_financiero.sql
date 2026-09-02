-- Detalle financiero y de logística para Eventos (lugar, horario, costo, gastos, utilidad, cliente)
alter table eventos add column if not exists lugar text;
alter table eventos add column if not exists horario text;
alter table eventos add column if not exists costo numeric;
alter table eventos add column if not exists gastos numeric;
alter table eventos add column if not exists utilidad numeric;
alter table eventos add column if not exists contacto_id text references contactos(id) on delete set null;
