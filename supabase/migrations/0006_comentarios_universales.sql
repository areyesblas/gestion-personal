-- Sistema universal de comentarios y adjuntos: cualquier entidad (proyecto, pendiente,
-- contacto, evento, etc.) puede tener comentarios con fotos/audio/video/documentos.
create table if not exists comentarios (
  id text primary key,
  entidad_tipo text not null,   -- ej. "proyectos", "pendientes", "contactos", "eventos"
  entidad_id text not null,     -- id del registro al que pertenece el comentario
  texto text,
  adjuntos jsonb default '[]'::jsonb,  -- [{ tipo, nombre, url }]
  created_at timestamptz default now()
);
create index if not exists idx_comentarios_entidad on comentarios (entidad_tipo, entidad_id);
alter table comentarios enable row level security;
create policy "solo_autenticados" on comentarios for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Bucket de Storage para los adjuntos universales
insert into storage.buckets (id, name, public)
values ('adjuntos', 'adjuntos', true)
on conflict (id) do nothing;

create policy "adjuntos_autenticados_insert" on storage.objects for insert
  with check (bucket_id = 'adjuntos' and auth.role() = 'authenticated');
create policy "adjuntos_autenticados_select" on storage.objects for select
  using (bucket_id = 'adjuntos' and auth.role() = 'authenticated');
create policy "adjuntos_autenticados_delete" on storage.objects for delete
  using (bucket_id = 'adjuntos' and auth.role() = 'authenticated');
