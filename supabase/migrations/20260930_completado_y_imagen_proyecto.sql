-- Completar tareas y proyectos dejando constancia de CUÁNDO (24 sept 2026), e imagen propia del
-- proyecto.
--
-- Hasta ahora "Completada"/"Finalizado" eran solo un estatus: se sabía QUÉ estaba terminado pero
-- no CUÁNDO, así que no había forma de responder "¿qué cerré este mes?" ni de medir cuánto tardó
-- algo. Estas dos columnas guardan ese dato una sola vez, en la entidad a la que pertenece.
--
-- Ojo con las fechas: un proyecto puede no tener fecha_fin (los continuos/recurrentes no terminan
-- en una fecha planeada). Por eso completado_en es independiente de fecha_fin y nada obliga a
-- llenar la una para poder llenar la otra.

alter table public.pendientes
  add column if not exists completada_en timestamptz;

alter table public.proyectos
  add column if not exists completado_en timestamptz,
  add column if not exists imagen_url text;

-- Las filas que YA estaban completadas se quedan con completada_en/completado_en en null a
-- propósito: nadie registró esa fecha en su momento e inventarla (usando created_at, por ejemplo)
-- sería guardar un dato falso. La pantalla muestra "—" cuando no se sabe.

comment on column public.pendientes.completada_en is
  'Momento en que la tarea se marco como completada. NULL = no completada, o completada antes de que existiera este registro.';
comment on column public.proyectos.completado_en is
  'Momento en que el proyecto se marco como finalizado. Independiente de fecha_fin: un proyecto continuo no tiene fecha de fin planeada y aun asi se puede completar.';
comment on column public.proyectos.imagen_url is
  'Imagen propia del proyecto. NULL = se dibuja un icono derivado de su categoria.';
