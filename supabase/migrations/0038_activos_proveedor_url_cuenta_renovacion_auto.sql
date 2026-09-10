-- Activos digitales: agrega Proveedor, URL/identificador, Cuenta propietaria y Renovación automática (Sí/No)
-- Cierra Etapa 8 del plan de Documento Maestro v1.2 (sección 23.15)
alter table public.activos
  add column if not exists proveedor text,
  add column if not exists url_identificador text,
  add column if not exists cuenta_propietaria text,
  add column if not exists renovacion_automatica boolean not null default false;
