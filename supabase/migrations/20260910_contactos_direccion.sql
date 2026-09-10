ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS direccion text;
COMMENT ON COLUMN public.contactos.direccion IS 'Dirección postal en texto libre, opcional (Grupo A, ajustes rápidos).';
