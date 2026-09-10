ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS contacto_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Migra el contacto único existente (si lo hay) al nuevo arreglo, sin perder datos.
UPDATE public.citas SET contacto_ids = ARRAY[contacto_id] WHERE contacto_id IS NOT NULL AND contacto_ids = '{}';

COMMENT ON COLUMN public.citas.contacto_ids IS 'Multi-contacto (Grupo C). Reemplaza a contacto_id en la UI; contacto_id se conserva sin usar por compatibilidad histórica.';
COMMENT ON COLUMN public.citas.tags IS 'Tags libres a nivel cita, uno-a-muchos (Grupo C). Catálogo abierto: se sugieren los ya usados pero se puede escribir uno nuevo.';
