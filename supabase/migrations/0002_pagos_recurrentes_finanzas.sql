-- Campos de recurrencia en Finanzas (el código ya los usaba, pero la columna nunca se había creado)
alter table finanzas add column if not exists es_recurrente boolean default false;
alter table finanzas add column if not exists frecuencia text;
alter table finanzas add column if not exists fecha_fin date;
