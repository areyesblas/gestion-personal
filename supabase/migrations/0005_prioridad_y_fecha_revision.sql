-- Prioridad y fecha de revisión (fecha aparte de la fecha de entrega, para marcar cuándo
-- revisar el avance) en Proyectos, Metas y Pendientes.
alter table proyectos add column if not exists prioridad text default 'Media';
alter table proyectos add column if not exists fecha_revision date;
alter table metas add column if not exists prioridad text default 'Media';
alter table metas add column if not exists fecha_revision date;
alter table pendientes add column if not exists fecha_revision date;
