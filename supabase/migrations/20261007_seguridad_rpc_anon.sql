-- 20261007_seguridad_rpc_anon.sql
--
-- Cierra un hoyo de autorizacion real y endurece las funciones expuestas por RPC.
-- Salio de revisar los avisos de seguridad del proyecto (6 oct 2026).
--
-- NOTA DE HISTORIAL: en el proyecto remoto esto quedo como TRES entradas de migracion
-- (seguridad_rpc_anon, seguridad_rpc_anon_correccion_rls, seguridad_rpc_revoke_public)
-- porque el primer intento rompio el pre-login y el segundo revoke no servia. Este
-- archivo es el estado NETO: lo que hay que aplicar en un entorno limpio. Los dos
-- errores quedan explicados abajo porque los dos son faciles de repetir.
--
-- ============================================================================
-- 1. EL HOYO: vincular_colaborador_a_tarea dejaba ESCRIBIR SIN SESION
-- ============================================================================
-- La guarda era:
--
--     IF v_propietario <> auth.uid() AND NOT public.has_access('pendientes', v_propietario)
--     THEN RAISE EXCEPTION 'No autorizado'; END IF;
--
-- Sin sesion, auth.uid() es NULL, y en SQL comparar contra NULL no da falso: da NULL.
-- `v_propietario <> NULL` es NULL; has_access tambien devuelve NULL (su
-- `p_propietario = auth.uid()` es NULL y el OR con un false deja NULL); y
-- `NULL AND NULL` es NULL. En PL/pgSQL un `IF NULL THEN` NO entra, asi que la
-- excepcion nunca se lanzaba y la funcion seguia derecho hasta el UPDATE del final.
--
-- Consecuencia: quien no habia iniciado sesion, con un id de tarea, podia cambiar el
-- `asignado_a` de esa tarea. Escritura ajena sin sesion, en una funcion publicada en
-- /rest/v1/rpc/.
--
-- Un usuario CON sesion que no fuera el dueno SI quedaba bloqueado: ahi auth.uid()
-- tiene valor, las comparaciones dan true/false de verdad y la guarda entraba. El
-- agujero era exclusivamente el camino anonimo.
--
-- Comprobado antes de arreglar, evaluando la expresion con auth.uid() = NULL: daba
-- NULL, confirmando que el IF no entra.
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
  -- Sin sesion no se sigue. Va PRIMERO y por separado: meterlo en el AND de abajo es
  -- lo que abrio el hoyo, porque con auth.uid() NULL ese AND da NULL y un IF con NULL
  -- no entra.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT colaborador_contacto_id, user_id INTO v_contacto_id, v_propietario
  FROM public.pendientes WHERE id = p_tarea_id;

  IF v_propietario IS NULL THEN RETURN; END IF;

  -- Solo el propietario de la tarea, o un colaborador activo con permiso al modulo de
  -- tareas de ese propietario, puede disparar la vinculacion.
  -- El coalesce() es por si has_access devolviera NULL: sin el, un NULL aqui vuelve a
  -- saltarse la guarda igual que antes.
  IF v_propietario <> auth.uid()
     AND NOT coalesce(public.has_access('pendientes', v_propietario), false) THEN
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

-- ============================================================================
-- 2. DEFENSA EN PROFUNDIDAD: cerrar la puerta a los anonimos
-- ============================================================================
-- Hay que revocar a PUBLIC, no a `anon`. PRIMER ERROR DE ESTA MIGRACION: empece con
-- `REVOKE ... FROM anon` y no servia de nada, porque estas funciones tambien tenian
-- EXECUTE concedido a PUBLIC (se ve como "-" al listar los permisos) y PUBLIC incluye
-- a anon. Se detecto llamando a la funcion como anon: la llamada ENTRO al cuerpo y la
-- detuvo la guarda nueva, no el permiso.
--
-- Solo se revoca en las que son exclusivamente RPC. `authenticated` tiene su propio
-- GRANT explicito en las tres, asi que la app sigue igual.
REVOKE EXECUTE ON FUNCTION public.vincular_colaborador_a_tarea(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.arkeyone_buscar_modulo(text, text, uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.arkeyone_buscar_similar(text, text, uuid, text) FROM PUBLIC, anon;

-- ============================================================================
-- 3. LO QUE NO HAY QUE REVOCAR, y por que
-- ============================================================================
-- SEGUNDO ERROR DE ESTA MIGRACION, y el mas caro: en el primer intento tambien le
-- quite el EXECUTE a has_access, es_cuidador_de y es_colaborador_beneficiario. Esas
-- tres se invocan DENTRO de politicas RLS (41, 4 y 3 politicas respectivamente), y
-- las 56 politicas del esquema estan definidas TO public, que incluye anon.
--
-- Resultado: una consulta sin sesion dejaba de devolver 0 filas y empezaba a lanzar
-- "permission denied for function has_access" — o sea, se rompia el comportamiento de
-- antes del login. Se detecto probando `SET LOCAL ROLE anon; select count(*) from
-- pendientes`.
--
-- Dejarles el permiso NO abre nada: las tres comparan contra auth.uid() o contra
-- auth.jwt()->>'email', que sin sesion no coinciden con ningun registro, asi que para
-- un anonimo siguen dando falso. Lo que protege esas tablas es la politica, no el
-- permiso sobre la funcion.
GRANT EXECUTE ON FUNCTION public.has_access(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.es_cuidador_de(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.es_colaborador_beneficiario(text) TO anon;

-- ============================================================================
-- 4. search_path fijo en las tres funciones que lo tenian mutable
-- ============================================================================
-- Las tres son SECURITY INVOKER (corren con los permisos de quien llama), asi que no
-- son el vector grave que serian siendo SECURITY DEFINER. Aun asi,
-- arkeyone_normalizar llama a unaccent() sin calificar y la extension vive en public:
-- con el search_path abierto, alguien que pudiera crear objetos en un esquema que
-- vaya antes podria sustituir esa funcion.
--
-- Verificado antes de tocarlas: NINGUN indice depende de ellas. Las dos primeras son
-- IMMUTABLE y cambiar una funcion usada en un indice obligaria a reconstruirlo.
ALTER FUNCTION public.arkeyone_normalizar(text) SET search_path TO 'public';
ALTER FUNCTION public.arkeyone_buscar_texto(text, text) SET search_path TO 'public';
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';

-- ============================================================================
-- LO QUE SIGUE SALIENDO EN EL LINTER A PROPOSITO
-- ============================================================================
-- * has_access, es_cuidador_de, es_colaborador_beneficiario como ejecutables por
--   anon: es obligatorio, ver el punto 3. El linter no puede saber que su guarda esta
--   adentro.
-- * Las siete como ejecutables por `authenticated`: asi las llama la app.
-- * public.gestion_data con RLS activo y sin politicas: NO es un hoyo. RLS activo y
--   cero politicas = nadie lee ni escribe, el estado mas cerrado posible. Son 0 filas
--   y es legado de la migracion desde localStorage. Lo que si conviene revisar aparte
--   es el codigo: migrateFromOldBlobIfNeeded en App.jsx todavia intenta leerla en
--   cada carga y nunca va a poder. Borrar la tabla es destructivo y queda a decision
--   de Angel.
-- * unaccent instalada en public: moverla de esquema romperia arkeyone_normalizar y
--   cualquier indice futuro que la use; no vale el riesgo por un aviso de higiene.
--
-- PENDIENTE QUE NO SE PUEDE HACER POR SQL: activar "Leaked Password Protection"
-- (compara contra HaveIBeenPwned). Es un interruptor del panel de Supabase, en
-- Authentication > Policies. Lo tiene que prender Angel a mano.
