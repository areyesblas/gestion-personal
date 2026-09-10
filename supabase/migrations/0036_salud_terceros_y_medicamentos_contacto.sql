-- ARKEYONE v1.2, secc. 28/29/30/36.4/36.5: Salud y Medicamentos deben poder llevar seguimiento
-- de terceros (personas vinculadas), reutilizando siempre la entidad Contactos (nunca una ficha
-- personal duplicada). "Yo" se representa como contacto_id = NULL.

-- 1) Salud: agrega contacto_id (NULL = el propio usuario).
alter table public.salud add column contacto_id text references public.contactos(id) on delete set null;
comment on column public.salud.contacto_id is 'NULL = registro del propio usuario. No nulo = seguimiento de un tercero (familiar, persona bajo cuidado), referenciando Contactos.';

-- 2) perfil_salud: hoy es 1 fila por usuario (altura propia). Pasa a ser 1 fila por
--    usuario+persona, para que cada persona vinculada tenga su propia estatura/IMC.
alter table public.perfil_salud add column contacto_id text references public.contactos(id) on delete set null;
create unique index perfil_salud_propio_uniq on public.perfil_salud(user_id) where contacto_id is null;
create unique index perfil_salud_contacto_uniq on public.perfil_salud(user_id, contacto_id) where contacto_id is not null;

-- 3) Medicamentos: para_quien deja de ser el campo real; se sustituye por contacto_id
--    (NULL = Yo). Se agregan los campos complementarios de la secc. 30, todos opcionales.
alter table public.medicamentos add column contacto_id text references public.contactos(id) on delete set null;
alter table public.medicamentos add column motivo text;
alter table public.medicamentos add column medico text;
alter table public.medicamentos add column via_administracion text;
alter table public.medicamentos add column observaciones text;

-- 4) Dato real existente: los 2 medicamentos de "Papá" no tenían un Contacto vinculado.
insert into public.contactos (id, nombre, parentesco, tipo, user_id)
select 'contacto_papa_migrado', 'Papá', 'Padre', 'Familiar', m.user_id
from public.medicamentos m
where m.para_quien = 'Papá'
  and not exists (select 1 from public.contactos c where c.nombre = 'Papá')
limit 1;

update public.medicamentos set contacto_id = (select id from public.contactos where nombre = 'Papá' limit 1)
where para_quien = 'Papá';

comment on column public.medicamentos.contacto_id is 'NULL = Yo (el propio usuario). No nulo = referencia a Contactos. Sustituye a para_quien, que se conserva solo por compatibilidad histórica.';
