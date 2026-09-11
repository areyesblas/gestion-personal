CREATE OR REPLACE FUNCTION public.vincular_colaborador_a_tarea(p_tarea_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contacto_id text;
  v_correo text;
  v_user_id uuid;
BEGIN
  SELECT colaborador_contacto_id INTO v_contacto_id FROM public.pendientes WHERE id = p_tarea_id;
  IF v_contacto_id IS NULL THEN RETURN; END IF;

  SELECT correo INTO v_correo FROM public.contactos WHERE id = v_contacto_id;
  IF v_correo IS NULL OR v_correo = '' THEN RETURN; END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_correo) LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE public.pendientes SET asignado_a = v_user_id WHERE id = p_tarea_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.vincular_colaborador_a_tarea IS 'Si el correo del contacto-colaborador asignado a una tarea coincide con una cuenta ARKEYONE real, llena asignado_a con ese user_id — reutiliza el mismo mecanismo de "Mi trabajo" (RLS: asignado_a = auth.uid()) sin tener que duplicar reglas de acceso nuevas.';
