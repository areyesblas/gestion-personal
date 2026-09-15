# ARKEYONE — Contexto del proyecto

Este archivo se lee automáticamente al inicio de cada sesión de Claude Code. Contiene el contexto esencial para no tener que redescubrirlo cada vez. El detalle completo vive en el "Documento Maestro" (docx) que Angel mantiene aparte — este archivo es el resumen operativo.

## Qué es ARKEYONE

SaaS multi-tenant "sistema operativo personal" en arkeyone.com. Slogan: "La llave que alinea tu mundo". Sustituye el concepto anterior "Centro de Mando". Angel Reyes es el dueño de producto, diseñador y quien toma todas las decisiones (angelrey.mx@gmail.com, GitHub: areyesblas).

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

- Inactividad: auto-logout a los 30 min, advertencia al min 29
- Sesión absoluta: 8h desde login, trackeada vía `localStorage arkeyone_login_at`
- Módulos sensibles (Finanzas, Salud, Medicamentos, Documentos, Deudas, Apartados, Patrimonio, Activos digitales, Reportes, Diario): ventana corta de 15 min que pide reautenticación; Diario tiene su propia ventana independiente de 10 min
- MFA/TOTP vía Supabase auth.mfa, gate AAL2 en login
- Cambiar contraseña revoca sesiones en otros dispositivos
- RLS en todas las tablas vía `has_access(modulo, propietario)` — función `security definer`
- **Gotcha importante:** `has_access()` y `vincular_invitaciones()` deben ser `security definer` para evitar recursión infinita en políticas RLS
- La UI nunca es la barrera de seguridad — el servidor/RLS decide qué identidad puede leer o modificar

## Bugs conocidos / en investigación (14 sept 2026)

- **Logout automático ~30-60 seg después del login**, confirmado en logs de Supabase (Auth + REST): el refresh de token y las lecturas de tablas responden 200 correctamente, así que NO es un problema de RLS ni de permisos backend. La causa está en el frontend — probablemente en la lógica de inactividad/sesión absoluta de `App.jsx` forzando un `signOut()` prematuro.
- Reporte de que algunas entidades "no cargan" en la UI aunque el fetch a Supabase sea exitoso — sospecha de que es el mismo bug raíz (el estado se limpia por el signOut antes de que el usuario vea los datos ya cargados).
- Todas las tablas de entidades reales tienen al menos una política RLS de SELECT activa (verificado). La única tabla sin política es `gestion_data`, que es legado de la migración de localStorage y no la usa ninguna entidad actual.

## Gotchas técnicos (caros de reaprender)

- **RLS insert vía MCP:** al insertar en bulk con `execute_sql`, los defaults de `auth.uid()` NO se disparan — las filas quedan con `user_id = null` e invisibles bajo RLS. Siempre seguir un insert masivo con un `UPDATE` explícito fijando `user_id`.
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
