-- Papelera lógica (soft delete): en vez de borrar un registro para siempre, se marca
-- con deleted_at y se puede recuperar. Aplica a las 22 tablas gestionadas por la app
-- (se excluye perfil_salud, que es una fila de configuración única, no una lista).
alter table proyectos add column if not exists deleted_at timestamptz;
alter table pendientes add column if not exists deleted_at timestamptz;
alter table equipo add column if not exists deleted_at timestamptz;
alter table finanzas add column if not exists deleted_at timestamptz;
alter table deudas add column if not exists deleted_at timestamptz;
alter table actividades add column if not exists deleted_at timestamptz;
alter table activos add column if not exists deleted_at timestamptz;
alter table metas add column if not exists deleted_at timestamptz;
alter table contactos add column if not exists deleted_at timestamptz;
alter table redes_metricas add column if not exists deleted_at timestamptz;
alter table documentos add column if not exists deleted_at timestamptz;
alter table habitos add column if not exists deleted_at timestamptz;
alter table salud add column if not exists deleted_at timestamptz;
alter table apartados add column if not exists deleted_at timestamptz;
alter table eventos add column if not exists deleted_at timestamptz;
alter table comentarios add column if not exists deleted_at timestamptz;
alter table saldo_inicial add column if not exists deleted_at timestamptz;
alter table regalos add column if not exists deleted_at timestamptz;
alter table facturas add column if not exists deleted_at timestamptz;
alter table campanas add column if not exists deleted_at timestamptz;
alter table patrimonio add column if not exists deleted_at timestamptz;
alter table patrimonio_valuaciones add column if not exists deleted_at timestamptz;
