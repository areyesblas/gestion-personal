alter table preferencias
  add column if not exists notif_anticipacion_citas_min integer not null default 30;

comment on column preferencias.notif_anticipacion_citas_min is 'Minutos de anticipación con los que se avisa una cita (push/notificación). Configurable por el usuario en Configuración > Notificaciones. Default 30.';
