-- ARKEYONE v1.2, sección 23.10: "Una factura/documento fiscal se liga a un movimiento
-- financiero... El movimiento financiero existe por sí mismo; la factura es información
-- fiscal relacionada y no debe crear un segundo movimiento por duplicación."
alter table public.facturas add column finanzas_id text references public.finanzas(id) on delete set null;
comment on column public.facturas.finanzas_id is
  'Movimiento de Finanzas al que se liga esta factura (opcional). La factura es información fiscal relacionada; el importe real vive en Finanzas, no aquí.';
