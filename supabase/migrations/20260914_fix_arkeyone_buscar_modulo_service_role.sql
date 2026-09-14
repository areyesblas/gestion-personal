-- La migración fix_security_definer_functions_missing_auth_check (12-sep, ver
-- 20260912b_fix_security_definer_functions_missing_auth_check.sql) cerró un IDOR real
-- (arkeyone_buscar_modulo/arkeyone_buscar_similar no verificaban p_user_id = auth.uid()), pero
-- rompió la única llamada legítima: la Edge Function asistente-ia invoca estas RPC con el
-- cliente service_role (ya validó al usuario real con getUser(token) antes de llamar). Bajo
-- service_role, auth.uid() es NULL, así que la condición "p_user_id IS DISTINCT FROM auth.uid()"
-- siempre era verdadera y buscar_datos truena con "No autorizado" para cualquier usuario, siempre
-- (desde el 12-sep). Se deja pasar cuando el caller es service_role (confiable, servidor), y se
-- mantiene el bloqueo para llamadas directas desde el navegador con auth.uid() distinto.

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
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
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
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
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
