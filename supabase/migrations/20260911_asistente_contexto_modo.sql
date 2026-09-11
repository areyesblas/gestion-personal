-- Modo Conversación por voz del Asistente de ARKEYONE.
-- Agrega trazabilidad de en qué pantalla/entidad estaba el usuario al hablarle al asistente,
-- y si ese turno vino del chat de texto o del Modo Conversación por voz. No afecta datos
-- existentes (columnas nuevas, nullable, con default seguro).

alter table public.asistente_mensajes
  add column if not exists contexto_pantalla jsonb,
  add column if not exists modo text default 'texto';

comment on column public.asistente_mensajes.contexto_pantalla is
  'Módulo/entidad en la que estaba parado el usuario dentro de ARKEYONE al mandar este mensaje (ej. {"modulo":"proyectos","entidad_id":"..."}). Null si no se mandó o no aplica.';
comment on column public.asistente_mensajes.modo is
  'texto = chat escrito normal. voz = Modo Conversación (entrada por voz, transcrita, respuesta leída en voz alta).';
