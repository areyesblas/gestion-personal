-- arkeyone_buscar_modulo tiene el allowlist de tablas hardcodeado dentro del propio SQL (por
-- seguridad: usa format() con %I para armar la consulta dinámica, así que la tabla NUNCA debe
-- venir de una lista editable en runtime). Para que buscar_datos del asistente Arkey pueda
-- consultar rutinas_ejercicio y recetas, hay que agregarlas aquí — no basta con tocar la Edge
-- Function. Las demás tablas nuevas de Ejercicio/Nutrición (sesiones, items, medidas, dieta_dias)
-- no tienen una columna de texto principal razonable para este buscador genérico — Arkey las
-- consulta con herramientas propias (obtener_entrenamiento_hoy, progreso_ejercicio) en vez de
-- forzarlas aquí.

CREATE OR REPLACE FUNCTION public.arkeyone_buscar_modulo(p_tabla text, p_columna text, p_user_id uuid, p_texto text, p_limite integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tablas_validas text[] := array['proyectos','pendientes','notas','finanzas','citas','contactos',
    'salud','medicamentos','habitos','actividades','documentos','patrimonio','activos','apartados',
    'eventos','campanas','regalos','metas','facturas','rutinas_ejercicio','recetas'];
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
