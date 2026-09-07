-- Nombre de la persona invitada, aparte del correo (para identificarla más fácil en la lista).
alter table public.colaboradores
  add column if not exists colaborador_nombre text;
