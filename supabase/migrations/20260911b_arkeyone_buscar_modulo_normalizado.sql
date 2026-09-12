-- Estas tres funciones ya estaban desplegadas en producción (usadas por la Edge Function
-- asistente-ia, buscar_datos) pero nunca quedaron registradas como migración en el repo.
-- Esta migración las deja en control de versiones, sin cambiar nada de lo que ya corre.
--
create extension if not exists unaccent;

-- arkeyone_normalizar: minusculas + sin acentos, para comparar texto sin importar tildes.
create or replace function public.arkeyone_normalizar(texto text)
returns text
language sql
immutable
as $function$
  select lower(unaccent(coalesce(texto, '')));
$function$;

-- arkeyone_buscar_texto: true si TODAS las palabras de "busqueda" aparecen en "contenido",
-- sin importar acentos, mayusculas ni el orden en que se escribieron.
create or replace function public.arkeyone_buscar_texto(contenido text, busqueda text)
returns boolean
language sql
immutable
as $function$
  select coalesce(
    (
      select bool_and(public.arkeyone_normalizar(contenido) like '%' || palabra || '%')
      from unnest(string_to_array(trim(public.arkeyone_normalizar(busqueda)), ' ')) as palabra
      where palabra <> ''
    ),
    true -- si la búsqueda queda vacía tras normalizar, no filtra nada (coincide con el comportamiento anterior de texto vacío = listar todo)
  );
$function$;

-- arkeyone_buscar_modulo: RPC que usa buscar_datos en la Edge Function del asistente para
-- listar/filtrar cualquier modulo permitido con la busqueda normalizada de arriba.
create or replace function public.arkeyone_buscar_modulo(
  p_tabla text, p_columna text, p_user_id uuid, p_texto text, p_limite integer default 10
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  tablas_validas text[] := array['proyectos','pendientes','notas','finanzas','citas','contactos',
    'salud','medicamentos','habitos','actividades','documentos','patrimonio','activos','apartados',
    'eventos','campanas','regalos','metas','facturas'];
  columnas_validas text[] := array['nombre','descripcion','titulo','concepto'];
begin
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
