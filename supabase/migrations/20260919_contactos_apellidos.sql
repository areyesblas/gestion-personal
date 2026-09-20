-- Contactos: separar el nombre en Nombre(s), Apellido paterno y Apellido materno.
-- NOTA: esta migración ya fue aplicada manualmente en el proyecto Supabase ciczwtsgtlaosmelawse.
-- Este archivo existe solo para que el repo refleje el estado real de la base de datos — NO ejecutar de nuevo.

ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS nombres text;
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS apellido_paterno text;
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS apellido_materno text;

COMMENT ON COLUMN public.contactos.nombres IS 'Nombre(s) de pila del contacto, sin apellidos.';
COMMENT ON COLUMN public.contactos.nombre IS 'Nombre completo derivado: mantenido automáticamente por el trigger trg_contactos_nombre_completo a partir de nombres + apellido_paterno + apellido_materno. No editar directamente.';

CREATE OR REPLACE FUNCTION public.contactos_nombre_completo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.nombres IS NULL THEN
      NEW.nombres := NEW.nombre;
    ELSE
      NEW.nombre := coalesce(nullif(trim(concat_ws(' ', NEW.nombres, NEW.apellido_paterno, NEW.apellido_materno)), ''), NEW.nombre);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.nombre IS DISTINCT FROM OLD.nombre
       AND NEW.nombres IS NOT DISTINCT FROM OLD.nombres
       AND NEW.apellido_paterno IS NOT DISTINCT FROM OLD.apellido_paterno
       AND NEW.apellido_materno IS NOT DISTINCT FROM OLD.apellido_materno THEN
      -- Escritor heredado: solo tocó `nombre` sin pasar por los campos nuevos.
      NEW.nombres := NEW.nombre;
      NEW.apellido_paterno := NULL;
      NEW.apellido_materno := NULL;
    ELSE
      NEW.nombre := coalesce(nullif(trim(concat_ws(' ', NEW.nombres, NEW.apellido_paterno, NEW.apellido_materno)), ''), NEW.nombre);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contactos_nombre_completo ON public.contactos;
CREATE TRIGGER trg_contactos_nombre_completo
  BEFORE INSERT OR UPDATE ON public.contactos
  FOR EACH ROW
  EXECUTE FUNCTION public.contactos_nombre_completo();

UPDATE public.contactos SET nombres = nombre WHERE nombres IS NULL;

-- ROLLBACK (ejecutar manualmente si hace falta revertir):
-- DROP TRIGGER IF EXISTS trg_contactos_nombre_completo ON public.contactos;
-- DROP FUNCTION IF EXISTS public.contactos_nombre_completo();
-- ALTER TABLE public.contactos DROP COLUMN IF EXISTS nombres;
-- ALTER TABLE public.contactos DROP COLUMN IF EXISTS apellido_paterno;
-- ALTER TABLE public.contactos DROP COLUMN IF EXISTS apellido_materno;
