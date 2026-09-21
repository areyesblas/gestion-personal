-- Foto de perfil: URL pública guardada en preferencias, archivo subido al bucket "adjuntos"
-- (mismo bucket que ya usan los adjuntos de otras entidades, con su política RLS de
-- autenticados) bajo avatares/{user_id}/... — no se crea bucket ni política nueva.

ALTER TABLE public.preferencias ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.preferencias.avatar_url IS
  'URL pública de la foto de perfil del usuario (bucket de Storage "adjuntos", carpeta avatares/{user_id}/...). Vacío = se muestran las iniciales del nombre en vez de una foto.';
