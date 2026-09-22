-- Ciudad para el clima del Centro de mando: se guarda ya geocodificada (lat/lon) para no
-- tener que resolver el nombre en cada carga del dashboard. Misma tabla `preferencias` de
-- siempre — mismo patrón que nombre_mostrar/avatar_url.

ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS clima_lat numeric;
ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS clima_lon numeric;

COMMENT ON COLUMN public.preferencias.ciudad IS
  'Nombre de ciudad elegido por el usuario para el widget de clima del Centro de mando (texto para mostrar).';
COMMENT ON COLUMN public.preferencias.clima_lat IS
  'Latitud de la ciudad elegida (de la API de geocodificación de Open-Meteo), para no volver a geocodificar en cada carga.';
COMMENT ON COLUMN public.preferencias.clima_lon IS
  'Longitud de la ciudad elegida (de la API de geocodificación de Open-Meteo), para no volver a geocodificar en cada carga.';
