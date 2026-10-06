# ARKEYONE — Contexto del proyecto

Este archivo se lee automáticamente al inicio de cada sesión de Claude Code. Contiene el contexto esencial para no tener que redescubrirlo cada vez. El detalle completo vive en el "Documento Maestro" (docx) que Angel mantiene aparte — este archivo es el resumen operativo.

## Qué es ARKEYONE

SaaS multi-tenant "sistema operativo personal" en arkeyone.com. Slogan: "Ordena tu mundo, mejora tu vida." (actualizado 21 sept 2026; antes "La llave que alinea tu mundo"). Sustituye el concepto anterior "Centro de Mando". Angel Reyes es el dueño de producto, diseñador y quien toma todas las decisiones (angelrey.mx@gmail.com, GitHub: areyesblas).

Módulos: Proyectos/tareas, Finanzas/Deudas/Apartados/Patrimonio/Activos digitales, Contactos, Salud/Medicamentos, Hábitos, Eventos/Legal/Marketing, Colaboradores, Personas relacionadas/cuidadores, Notificaciones/Push, Diario, Agenda/Calendario.

**No es una plataforma industrial/SCADA.** Centrado en vida personal, privacidad, permisos y acciones.

## Stack

- Frontend: React 18 + Vite + Tailwind CSS. Archivo principal: `src/App.jsx` (~6600+ líneas)
- Backend: Supabase (PostgreSQL + Auth + Edge Functions + pg_cron), project ref `ciczwtsgtlaosmelawse`
- Deploy: push a `main` en GitHub (`areyesblas/gestion-personal`) → Netlify auto-deploy
- Email: Resend vía SMTP en DNS de arkeyone.com
- Migraciones en `supabase/migrations/`, numeración secuencial (actualmente pasando de 0027)
- Edge Functions también guardadas en `supabase/functions/` para control de versión local

## Principio arquitectónico central: entidad vs. vista

Antes de crear un módulo nuevo, evaluar si es una entidad real o una vista/filtro/consulta especializada de una entidad existente. **"Datos nunca duplicados"**: los módulos se relacionan por FK y auto-sync (ej. Eventos → Finanzas vía `evento_id`), nunca duplicando el mismo dato.

- Finanzas = única fuente de verdad para todo importe económico real (ingreso, egreso, pago, cobro, saldo, costo, gasto)
- Deudas = vista de egresos con saldo pendiente (no entidad independiente)
- Pagos recurrentes = vista/config sobre movimientos recurrentes
- Apartados = SÍ es entidad propia (meta de ahorro); apartar dinero es transferencia interna, no gasto
- Patrimonio = entidad propia con historial de valuaciones (no campo estático de valor)
- Activos digitales = entidad propia (dominios, hosting, marcas IMPI, licencias) con vencimientos/renovaciones
- Facturas/IVA = información fiscal ligada a un movimiento, no un segundo movimiento
- Reportes = capa analítica dinámica, no almacena datos propios
- Estimaciones = proyecciones derivadas del histórico, separado de Reportes

Contactos es la entidad maestra de personas — se reutiliza transversalmente (Salud, Medicamentos, Legal, Eventos, Atenciones, etc.), nunca duplicar una ficha de persona.

## Modelo de seguridad (implementado)

- Inactividad: auto-logout a los 30 min, advertencia al min 28 (`INACTIVIDAD_AVISO_MS` en `App.jsx`)
- Sesión absoluta: 8h desde el último login real, medida con `session.user.last_sign_in_at` (dato del servidor de Supabase). **NO** con localStorage: ese fue el origen del bug de logout prematuro (ver abajo)
- Módulos sensibles (Finanzas, Salud, Medicamentos, Documentos, Deudas, Apartados, Patrimonio, Activos digitales, Reportes, Diario): ventana corta de 15 min que pide reautenticación; Diario tiene su propia ventana independiente de 10 min
- MFA/TOTP vía Supabase auth.mfa, gate AAL2 en login
- Cambiar contraseña revoca sesiones en otros dispositivos
- RLS en todas las tablas vía `has_access(modulo, propietario)` — función `security definer`
- **Gotcha importante:** `has_access()` y `vincular_invitaciones()` deben ser `security definer` para evitar recursión infinita en políticas RLS
- La UI nunca es la barrera de seguridad — el servidor/RLS decide qué identidad puede leer o modificar

## Bugs cerrados (no reabrir sin evidencia nueva)

Revisado el 6 oct 2026. Esta sección reemplaza la lista de "bugs en investigación" del 14 sept: los tres estaban resueltos o mal diagnosticados, y seguir citándolos frenaba decisiones sin razón.

- **Logout automático ~30-60 seg después del login — CERRADO.** La causa era guardar la hora de login en `localStorage`: solo se escribía en el evento `SIGNED_IN`, pero al reabrir la PWA con sesión ya persistida Supabase dispara `TOKEN_REFRESHED`/`INITIAL_SESSION`, nunca `SIGNED_IN`. El valor se quedaba pegado en la fecha del primer login del dispositivo, así que pasadas 8h **cada** reapertura entraba ya "vencida" y el chequeo la cerraba a los segundos. Ya usa `session.user.last_sign_in_at`, que viene del servidor. Ver el comentario largo junto a `SESION_MAX_MS` en `App.jsx`.
- **"Algunas entidades no cargan" — CERRADO, y no era el mismo bug.** Lo que se reportó después (Tareas, Atenciones y Movimientos en blanco, 5 oct 2026) fue un `ReferenceError`: `SelectGuardable` quedó sin su dependencia `useBorrador` al partir `App.jsx`, y React desmonta el árbol completo. Arreglado en `a2baa2f`. Un `vite build` en verde no detecta esa clase de error.
- **`gestion_data` sin política RLS — NO es un hoyo.** RLS activo y cero políticas = nadie lee ni escribe, el estado más cerrado posible. 0 filas, legado de localStorage. Lo que sí queda pendiente es código muerto: `migrateFromOldBlobIfNeeded` intenta leerla en cada carga y nunca podrá.

## Seguridad pendiente (6 oct 2026)

- **"Leaked Password Protection" — bloqueado por plan, no por olvido.** Vive en el panel de Supabase, en *Authentication → Providers → Email* (`/dashboard/project/ciczwtsgtlaosmelawse/auth/providers?provider=Email`), no en Policies. **Requiere plan Pro**; el proyecto está en Free, así que el linter va a seguir reportándolo hasta que se suba de plan. No se puede por SQL.
  - Lo que SÍ se puede en Free, en esa misma pantalla: subir la longitud mínima de contraseña (nunca menos de 8) y exigir dígitos + minúsculas + mayúsculas + símbolos. Más el MFA/TOTP que ya está implementado, que es la defensa fuerte contra una contraseña filtrada.
- El linter seguirá reportando `has_access`, `es_cuidador_de` y `es_colaborador_beneficiario` como ejecutables por `anon`: **es obligatorio**, se invocan dentro de políticas RLS que están `TO public`. Quitarles el permiso rompe el pre-login (las consultas anónimas pasan de devolver 0 filas a lanzar `permission denied`). Ver `supabase/migrations/20261007_seguridad_rpc_anon.sql`.

## Gotchas técnicos (caros de reaprender)

- **RLS insert vía MCP:** al insertar en bulk con `execute_sql`, los defaults de `auth.uid()` NO se disparan — las filas quedan con `user_id = null` e invisibles bajo RLS. Siempre seguir un insert masivo con un `UPDATE` explícito fijando `user_id`.
- **Guardas de autorización en SQL: nunca comparar contra `auth.uid()` sin descartar NULL primero.** Sin sesión `auth.uid()` es NULL, y comparar contra NULL no da falso: da NULL. Un `IF <expresión que da NULL> THEN RAISE` **no entra**, así que la guarda se salta en silencio y solo para los anónimos (con sesión funciona bien, que es lo que la hace difícil de ver). Pasó en `vincular_colaborador_a_tarea`: un anónimo con un id de tarea podía cambiar su `asignado_a`. El patrón correcto es `IF auth.uid() IS NULL THEN RAISE` aparte y antes, más `coalesce(..., false)` alrededor de cualquier función que pueda devolver NULL.
- **Revocar permisos de funciones: `REVOKE ... FROM anon` casi nunca basta.** Si la función también tiene EXECUTE concedido a `PUBLIC` (se ve como `-` al listar los permisos), `anon` lo sigue teniendo por ahí. Hay que revocar a `PUBLIC`. Y antes de revocar, revisar si la función se invoca dentro de alguna política RLS: las 56 políticas del esquema están `TO public`, así que quitarle el permiso a una función usada en una política rompe las consultas sin sesión.
- **`alertas_enviadas`:** el constraint único compuesto (user_id + tipo + entidad_id + fecha_relevante) es esencial para deduplicación — siempre usar `onConflict` en upserts.
- **iOS Web Push:** solo funciona desde la PWA instalada, no desde Safari normal. iOS ignora los botones de acción de notificación — siempre dar alternativa dentro de la app (Tomado/Posponer inline).
- **Sidebar móvil:** la preferencia de localStorage de "solo íconos" en desktop NO debe afectar mobile — requiere detección real de viewport con `matchMedia`, no una bandera compartida.
- **Botón flotante de captura:** su posición debe calcularse desde coordenadas reales de pantalla para no renderizar fuera de la vista, sin importar la esquina.
- Cargar dependencias pesadas de forma perezosa (ej. `jsPDF` en utilidades de exportación) para no inflar el bundle inicial.
- Siempre compilar/verificar antes de commitear: `npx vite build` debe pasar antes de cualquier push.

## Reglas transversales de UX

- Buscar dentro de listas = búsqueda por contenido (contiene), no solo por inicio de texto; independiente del buscador global
- Listas soportan filtros, orden y exportación a Excel/PDF respetando el estado actual de búsqueda/filtros/orden
- Orden predeterminado alfabético cuando aplique; el orden no depende de los filtros
- Toda entidad de seguimiento puede generar una Acción; recordatorios vía el motor unificado
- Todo dato resumido debe poder rastrearse hasta su registro fuente
- No duplicar entidades solo para crear una vista especializada

## Cómo trabajamos

- Angel no es programador — trabaja en VS Code con Claude Code como desarrollador full-stack: analiza el código, propone plan para cambios significativos, implementa todo (migraciones, Edge Functions, git push), y reporta qué se hizo y qué pasos manuales quedan.
- Angel se comunica en español, frecuentemente por voz a texto — mensajes informales y fragmentados. Responder siempre en español.
- Confirmar features funcionando antes de cerrar una etapa; Angel prueba en dispositivos reales (iPhone confirmado para PWA/push).
- Decisiones de alcance se documentan explícitamente con la razón — evitar scope creep.
- Antes de implementar una decisión de este documento, verificar contra el código real y las migraciones — que algo esté "diseñado" aquí no significa que ya exista en producción.

## Estado del documento maestro

Regla de continuidad: AUDITAR → DISEÑAR → MIGRAR → IMPLEMENTAR → PROBAR → ASEGURAR → DESPLEGAR. Si el código real contradice una hipótesis de este archivo, verificarla antes de cambiarla. No inventar funciones existentes ni duplicar tablas/conceptos ya presentes.
