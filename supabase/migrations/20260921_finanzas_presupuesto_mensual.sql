-- Presupuesto mensual recurrente, usado por "Tu progreso" en el Centro de mando (egresos del
-- mes / presupuesto). Vive en preferencias como los demás ajustes por usuario — no es un dato
-- histórico por mes, es un número que el usuario define y puede redefinir cuando quiera.

ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS presupuesto_mensual numeric;

COMMENT ON COLUMN public.preferencias.presupuesto_mensual IS
  'Presupuesto mensual recurrente definido por el usuario, usado por el widget "Tu progreso" del Centro de mando (egresos del mes / presupuesto). Un solo número por usuario, no histórico por mes.';
