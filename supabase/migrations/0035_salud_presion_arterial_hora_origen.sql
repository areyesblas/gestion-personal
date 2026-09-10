-- ARKEYONE v1.2, secc. 26/27/36: presión arterial estructurada (sistólica/diastólica), hora
-- de la medición, y origen del registro (completo vs. captura rápida desde ⚡), para permitir
-- gráficas de tendencia desde la primera versión sin inventar ni interpolar datos.
alter table public.salud add column hora time;
alter table public.salud add column sistolica integer;
alter table public.salud add column diastolica integer;
alter table public.salud add column origen text not null default 'completo' check (origen in ('completo', 'rapido'));
comment on column public.salud.origen is 'completo = capturado desde el formulario de Salud; rapido = capturado desde el botón de acciones rápidas (⚡).';
