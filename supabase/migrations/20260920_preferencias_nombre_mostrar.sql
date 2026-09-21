-- Nombre para mostrar (perfil): lo usan el saludo del Centro de mando y Arkey (asistente de
-- voz) en vez de derivarlo del correo. Misma tabla `preferencias` de siempre — no tabla nueva.

ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS nombre_mostrar text;

COMMENT ON COLUMN public.preferencias.nombre_mostrar IS
  'Nombre elegido por el usuario para que ARKEYONE y Arkey (asistente de voz) lo saluden por nombre, en vez de derivarlo del correo. Vacío = usar el correo.';
