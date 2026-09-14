-- Esta migración ya estaba aplicada en producción (12-sep) pero nunca quedó registrada en el
-- repo -- se deja aquí en control de versiones, sin cambiar nada de lo que ya corre.
--
-- Fix: arkeyone_buscar_modulo permitía leer filas completas de CUALQUIER usuario porque nunca
-- verificaba que p_user_id fuera igual a auth.uid().
CREATE OR REPLACE FUNCTION public.arkeyone_buscar_modulo(p_tabla text, p_columna text, p_user_id uuid, p_texto text, p_limite integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tablas_validas text[] := array['proyectos','pendientes','notas','finanzas','citas','contactos',
    'salud','medicamentos','habitos','actividades','documentos','patrimonio','activos','apartados',
    'eventos','campanas','regalos','metas','facturas'];
  columnas_validas text[] := array['nombre','descripcion','titulo','concepto'];
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'No autorizado';
  end if;

  if not (p_tabla = any(tablas_validas)) then
    raise exception 'Tabla no permitida: %', p_tabla;
  end if;
  if not (p_columna = any(columnas_validas)) then
    raise exception 'Columna no permitida: %', p_columna;
  end if;

  return query execute format(
    'select to_jsonb(t) from %I t where t.user_id = $1 and t.deleted_at is null
     and public.arkeyone_buscar_texto(t.%I, $2) order by t.created_at desc limit $3',
    p_tabla, p_columna
  ) using p_user_id, p_texto, p_limite;
end;
$function$;

-- Fix: mismo problema en arkeyone_buscar_similar
CREATE OR REPLACE FUNCTION public.arkeyone_buscar_similar(p_tabla text, p_columna text, p_user_id uuid, p_texto text)
 RETURNS TABLE(id text, valor text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tablas_validas text[] := array['pendientes','proyectos','notas','contactos','habitos',
    'patrimonio','apartados','metas','eventos','medicamentos'];
  columnas_validas text[] := array['nombre','descripcion','titulo'];
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'No autorizado';
  end if;

  if not (p_tabla = any(tablas_validas)) then
    raise exception 'Tabla no permitida: %', p_tabla;
  end if;
  if not (p_columna = any(columnas_validas)) then
    raise exception 'Columna no permitida: %', p_columna;
  end if;
  if coalesce(trim(p_texto), '') = '' then
    return;
  end if;

  return query execute format(
    'select t.id::text, t.%I from %I t
     where t.user_id = $1 and t.deleted_at is null
       and public.arkeyone_normalizar(t.%I) = public.arkeyone_normalizar($2)
     limit 1',
    p_columna, p_tabla, p_columna
  ) using p_user_id, p_texto;
end;
$function$;

-- Fix: vincular_colaborador_a_tarea reasignaba una tarea de CUALQUIER usuario sin verificar que
-- quien llama sea el dueño de la tarea o un colaborador autorizado.
CREATE OR REPLACE FUNCTION public.vincular_colaborador_a_tarea(p_tarea_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contacto_id text;
  v_correo text;
  v_user_id uuid;
  v_propietario uuid;
BEGIN
  SELECT colaborador_contacto_id, user_id INTO v_contacto_id, v_propietario
  FROM public.pendientes WHERE id = p_tarea_id;

  IF v_propietario IS NULL THEN RETURN; END IF;

  -- Solo el propietario de la tarea, o un colaborador activo con permiso al
  -- módulo de tareas de ese propietario, puede disparar la vinculación.
  IF v_propietario <> auth.uid() AND NOT public.has_access('pendientes', v_propietario) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_contacto_id IS NULL THEN RETURN; END IF;

  SELECT correo INTO v_correo FROM public.contactos WHERE id = v_contacto_id;
  IF v_correo IS NULL OR v_correo = '' THEN RETURN; END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_correo) LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    UPDATE public.pendientes SET asignado_a = v_user_id WHERE id = p_tarea_id;
  END IF;
END;
$function$;
