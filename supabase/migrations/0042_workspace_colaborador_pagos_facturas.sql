-- Fase 7 (Economía) del documento maestro: workspace del colaborador — "Mis pagos" y
-- "Mis facturas". Reutiliza el mismo principio que "Mi trabajo": el colaborador ve, sin
-- necesitar el módulo completo de Finanzas/Facturas del dueño, solo las filas donde ÉL es
-- el beneficiario — identificado porque su correo coincide con el Contacto al que se
-- ligó ese pago/factura en la cuenta del dueño.

create or replace function public.es_colaborador_beneficiario(p_contacto_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_contacto_id is not null and exists (
    select 1 from contactos c
    where c.id = p_contacto_id
      and c.correo is not null and c.correo <> ''
      and lower(c.correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Finanzas: además del acceso por módulo completo, el colaborador puede LEER (no editar)
-- los egresos "Pago a colaborador" donde él es el beneficiario.
create policy "colaborador_ve_sus_pagos" on public.finanzas for select
  using (categoria = 'Pago a colaborador' and public.es_colaborador_beneficiario(contacto_id));

-- Facturas: el colaborador puede leer y actualizar (folio, notas) las facturas que el
-- dueño le solicitó por un pago — para "entregar" su factura sin ver el resto de Facturas.
create policy "colaborador_ve_sus_facturas" on public.facturas for select
  using (public.es_colaborador_beneficiario(contacto_id));
create policy "colaborador_actualiza_sus_facturas" on public.facturas for update
  using (public.es_colaborador_beneficiario(contacto_id))
  with check (public.es_colaborador_beneficiario(contacto_id));
