-- รัน SQL นี้ใน Supabase Dashboard > SQL Editor

create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  barcode text,
  hosxp_icode text,
  cabinet_category integer check (cabinet_category between 1 and 10),
  min_stock integer not null default 0,
  unit text default 'เม็ด',
  current_stock integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists stock_transactions (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('IN', 'OUT')),
  quantity integer not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

-- สำหรับฐานข้อมูลที่สร้างไว้แล้ว ให้รันส่วนนี้เพิ่มคอลัมน์ใหม่
alter table medicines add column if not exists barcode text;
alter table medicines add column if not exists hosxp_icode text;
alter table medicines add column if not exists cabinet_category integer;
alter table medicines add column if not exists min_stock integer not null default 0;

create index if not exists idx_medicines_name on medicines (name);
create index if not exists idx_medicines_code on medicines (code);
create index if not exists idx_medicines_barcode on medicines (barcode);
create index if not exists idx_stock_transactions_created_at on stock_transactions (created_at desc);

alter table medicines enable row level security;
alter table stock_transactions enable row level security;

create policy "Allow public read medicines"
  on medicines for select
  using (true);

create policy "Allow public insert medicines"
  on medicines for insert
  with check (true);

create policy "Allow public update medicines"
  on medicines for update
  using (true);

create policy "Allow public read stock_transactions"
  on stock_transactions for select
  using (true);

create policy "Allow public insert stock_transactions"
  on stock_transactions for insert
  with check (true);

insert into medicines (name, code, barcode, hosxp_icode, cabinet_category, min_stock, unit, current_stock) values
  ('Paracetamol 500 mg', 'MED-001', '8850001000001', '150001', 1, 50, 'เม็ด', 100),
  ('Amoxicillin 500 mg', 'MED-002', '8850001000002', '150002', 2, 30, 'แคปซูล', 50),
  ('Omeprazole 20 mg', 'MED-003', '8850001000003', '150003', 3, 40, 'เม็ด', 75)
on conflict do nothing;
