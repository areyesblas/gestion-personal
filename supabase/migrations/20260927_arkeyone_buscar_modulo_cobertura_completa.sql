-- Amplía el allowlist hardcodeado de arkeyone_buscar_modulo (usado por buscar_datos del
-- asistente Arkey) para que también pueda listar/buscar equipo, activos, campañas,
-- documentos y facturas por su columna "nombre"/"concepto" (ya permitidas). El resto de las
-- tablas nuevas (redes_metricas, campana_actividades, medidas_corporales, dieta_dias,
-- sesiones/items de ejercicio) no tienen una columna de texto principal razonable para este
-- buscador genérico y se consultan con herramientas propias del asistente.

CREATE OR REPLACE FUNCTION public.arkeyone_buscar_modulo(p_tabla text, p_columna text, p_user_id uuid, p_texto text, p_limite integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tablas_validas text[] := array['proyectos','pendientes','notas','finanzas','citas','contactos',
    'salud','medicamentos','habitos','actividades','documentos','patrimonio','activos','apartados',
    'eventos','campanas','regalos','metas','facturas','rutinas_ejercicio','recetas','equipo'];
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
