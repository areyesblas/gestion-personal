-- Punto de partida de saldo real (efectivo + cuenta bancaria), redefinible en cualquier
-- momento. El saldo actual se calcula: monto del checkpoint más reciente + movimientos
-- reales (Cobrado, no Pendiente) de finanzas desde esa fecha, separados por forma de pago
-- (Efectivo va a "efectivo", Transferencia va a "cuenta").
create table if not exists saldo_inicial (
  id text primary key,
  fecha date not null,
  efectivo numeric default 0,
  cuenta numeric default 0,
  notas text,
  created_at timestamptz default now()
);
alter table saldo_inicial enable row level security;
create policy "solo_autenticados" on saldo_inicial for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
