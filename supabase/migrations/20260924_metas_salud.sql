-- Metas por indicador de Salud (peso, glucosa, presión, colesterol, triglicéridos): meta,
-- fecha objetivo y si ese indicador se muestra o no (en el formulario de registro, el
-- historial y las gráficas de Tendencias). Misma tabla perfil_salud de siempre (1 fila por
-- usuario+persona, igual que altura_cm) — no se crea tabla nueva.
--
-- Forma del jsonb (todas las claves opcionales, ausente = "mostrar" por default):
-- {
--   "peso":          { "meta": 70,  "fecha": "2027-01-01", "mostrar": true },
--   "glucosa":       { "meta": 90,  "fecha": null,          "mostrar": true },
--   "presion":       { "metaSistolica": 120, "metaDiastolica": 80, "fecha": null, "mostrar": true },
--   "colesterol":    { "meta": 180, "fecha": null,          "mostrar": true },
--   "trigliceridos": { "meta": 150, "fecha": null,          "mostrar": true }
-- }

alter table public.perfil_salud add column if not exists metas_salud jsonb default '{}'::jsonb;

comment on column public.perfil_salud.metas_salud is
  'Config por indicador de Salud (peso/glucosa/presion/colesterol/trigliceridos): meta, fecha objetivo y mostrar (default true si la clave no existe). Controla el formulario de registro, el historial y las gráficas de Tendencias.';
