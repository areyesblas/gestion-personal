-- Centro de mando configurable: orden y visibilidad de widgets, guardado por usuario en
-- `preferencias` (misma tabla que ya guarda tema, notificaciones, etc. — no se crea tabla nueva).

ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS dashboard_widgets jsonb;

COMMENT ON COLUMN public.preferencias.dashboard_widgets IS
  'Orden y visibilidad de los widgets del Centro de mando: array de {id, visible} en el orden elegido por el usuario. Widgets del catálogo que no estén en el array se muestran al final, visibles por default.';
