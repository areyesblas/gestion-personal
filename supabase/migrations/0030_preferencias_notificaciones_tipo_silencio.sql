-- Preferencias de notificación por categoría (Recordatorios/Finanzas/Salud/Agenda/Proyectos/
-- Colaboradores/Activos digitales/Legal) y horario de silencio. Se guarda como lista de
-- categorías DESACTIVADAS (no activadas) para que categorías nuevas que se agreguen después
-- lleguen activadas por default sin tener que migrar filas existentes.
alter table public.preferencias
  add column if not exists notif_tipos_desactivados text[] default '{}',
  add column if not exists notif_silencio_activo boolean default false,
  add column if not exists notif_silencio_inicio time default '22:00',
  add column if not exists notif_silencio_fin time default '07:00';
