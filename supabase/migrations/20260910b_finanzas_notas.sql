ALTER TABLE public.finanzas ADD COLUMN IF NOT EXISTS notas text;
COMMENT ON COLUMN public.finanzas.notas IS 'Nota libre del movimiento — usada primero desde Deudas (Grupo B).';
