-- Fecha de nacimiento en Contactos, para poder incluir cumpleaños en el sistema de alertas.
alter table contactos add column if not exists fecha_nacimiento date;
