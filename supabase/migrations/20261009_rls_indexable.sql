-- 20261009_rls_indexable.sql
--
-- Segunda vuelta del RLS. La primera (20261008) quito la llamada por fila; esta deja que el
-- planner USE EL INDICE, que es lo que faltaba para escalar de verdad.
--
-- ============================================================================
-- EL PROBLEMA QUE QUEDABA
-- ============================================================================
-- La politica era `(SELECT auth.uid()) = user_id OR has_access('modulo', user_id)`. El OR con una
-- llamada a funcion impide que Postgres use el indice de user_id: siempre Seq Scan. Con una
-- cuenta da igual; con muchos usuarios compartiendo tabla, es barrer millones de filas para
-- devolver las de uno.
--
-- MEDIDO sobre 200 mil filas de 5 mil usuarios (tabla TEMPORAL, sin tocar produccion):
--
--     forma anterior (funcion por fila):  1,967 ms   Seq Scan, 200,000 llamadas
--     forma nueva (IN + indice):              0.756 ms   Index Scan
--
-- ============================================================================
-- EL CAMBIO: LA MISMA REGLA, AL REVES
-- ============================================================================
-- has_access() responde "¿puedo ver ESTA fila?" y hay que llamarla una vez por fila.
-- propietarios_con_acceso() responde "¿de QUIENES puedo ver filas?" una sola vez, y deja la
-- politica como `user_id IN (...)`, que si es indexable.
--
--     has_access(m,u)          = (u = auth.uid()) OR exists(colaborador activo con permiso a m)
--     propietarios_con_acceso(m) = { auth.uid() } U { propietarios que me compartieron m }
--     politica nueva           = user_id IN propietarios_con_acceso(m)
--
-- Es el mismo conjunto. Sin sesion, auth.uid() es NULL, el UNION devuelve solo NULL y
-- `user_id IN (NULL)` da NULL — que no es TRUE, asi que no pasa ninguna fila. Igual que antes.
--
-- Las cuatro politicas que ademas tenian `OR es_cuidador_de(...)` (salud, perfil_salud,
-- medicamentos, contactos) lo conservan.
--
-- ============================================================================
-- COMPROBADO CONTRA LA BASE
-- ============================================================================
--   * foto de cuantas filas ve el dueño en 17 tablas, antes y despues: identica en 16. La unica
--     diferencia fue recordatorios 37 -> 38, y se rastreo: es un recordatorio de "regalo" creado
--     por el cron de las 9am entre una foto y otra, con user_id del propio dueño. No es fuga.
--   * un usuario INVENTADO sigue viendo CERO en finanzas, contactos, eventos, salud,
--     medicamentos, pendientes, proyectos, notas y citas.
--   * propietarios_con_acceso('finanzas') para el dueño devuelve exactamente su propio uuid,
--     igual que has_access.
--
-- ============================================================================
-- LO QUE NO MEJORA, Y POR QUE
-- ============================================================================
-- Las tablas con MAS DE UNA politica permisiva siguen con Seq Scan: Postgres une las politicas
-- de un mismo rol y accion con OR, y ese OR vuelve a bloquear el indice. Son finanzas (tiene
-- ademas colaborador_ve_sus_pagos), pendientes, proyectos, facturas, colaboradores y
-- colaborador_dependientes. Es el aviso "multiple_permissive_policies" del linter. Arreglarlo es
-- fusionar politicas, que cambia el modelo de permisos y necesita su propia revision.
--
-- OJO AL MEDIR: la primera corrida sobre una tabla chica dio 7 ms y parecia un retroceso frente
-- a los 0.35 ms de la version anterior. Era cache en frio. Repitiendo con cache caliente da
-- 0.545 ms — o sea, el rediseño NO cuesta nada en tablas pequeñas y gana 2,600x en grandes.
-- Vale repetir cualquier medicion antes de concluir de una sola muestra.

CREATE OR REPLACE FUNCTION public.propietarios_con_acceso(p_modulo text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid()
  UNION
  SELECT c.propietario_id
  FROM colaboradores c
  WHERE c.colaborador_user_id = auth.uid()
    AND c.estatus = 'Activo'
    AND p_modulo = ANY(c.modulos);
$function$;

-- anon necesita EXECUTE: las 56 politicas estan TO public, y sin el permiso una consulta sin
-- sesion lanzaria "permission denied" en vez de devolver 0 filas. Misma razon que has_access.
GRANT EXECUTE ON FUNCTION public.propietarios_con_acceso(text) TO anon, authenticated;

-- Las 41 politicas `acceso_por_modulo` pasan de
--     (SELECT auth.uid()) = user_id OR has_access('<modulo>', user_id)
-- a
--     user_id IN ( SELECT propietarios_con_acceso('<modulo>') )
-- conservando el `OR es_cuidador_de(...)` donde lo habia. El SQL completo esta en la migracion
-- remota `rls_politicas_indexables`; regenerarlo es leer pg_policies y aplicar esa sustitucion.
--
-- has_access() NO se borra: la sigue usando vincular_colaborador_a_tarea.
