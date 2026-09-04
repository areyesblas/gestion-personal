-- Transformación a multiusuario: cada usuario ve solo su propia información.
-- Antes: RLS solo verificaba "¿estás autenticado?" (cualquier usuario veía todo).
-- Ahora: cada tabla tiene user_id, y la política exige user_id = auth.uid().

do $$
declare
  t text;
begin
  foreach t in array array[
    'proyectos','pendientes','equipo','finanzas','deudas','actividades','activos','metas',
    'contactos','redes_metricas','documentos','habitos','salud','apartados','eventos',
    'comentarios','saldo_inicial','regalos','facturas','campanas','patrimonio','patrimonio_valuaciones'
  ]
  loop
    execute format('alter table %I add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();', t);
    execute format('drop policy if exists "solo_autenticados" on %I;', t);
    execute format('create policy "solo_su_propio_usuario" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- perfil_salud: de fila única "main" a una fila por usuario
alter table perfil_salud add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table perfil_salud alter column id set default gen_random_uuid()::text;
create unique index if not exists perfil_salud_user_id_idx on perfil_salud(user_id);
drop policy if exists "solo_autenticados" on perfil_salud;
create policy "solo_su_propio_usuario" on perfil_salud for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- NOTA: después de aplicar esto en un proyecto con datos existentes, hay que rellenar
-- user_id en las filas viejas (que quedan en NULL) con un UPDATE manual, o esas filas
-- quedan invisibles para todos. En este proyecto ya se hizo para la cuenta de Angel.
