create type public.app_role as enum ('farmer', 'operator', 'consumer');
create type public.order_status as enum ('reserved', 'milling', 'in_transit', 'delivered');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create table public.farm_lots (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id),
  variety text not null default 'Sona Masuri',
  village text not null,
  quantity_kg numeric(10, 2) not null check (quantity_kg >= 29.85),
  floor_payout_per_kg numeric(10, 2) not null check (floor_payout_per_kg >= 24.41),
  harvest_date date not null,
  quality_note text not null,
  created_at timestamptz not null default now()
);

create table public.route_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin text not null default 'Tumkur',
  destination text not null default 'Jaynagar',
  weekly_run text not null,
  distance_km numeric(10, 2),
  active boolean not null default true
);

create table public.partner_quotes (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles(id),
  route_id uuid not null references public.route_templates(id),
  milling_per_kg numeric(10, 2) not null,
  packaging_qa_per_kg numeric(10, 2) not null,
  farm_to_mill numeric(10, 2) not null,
  weekly_line_haul numeric(10, 2) not null,
  last_mile numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table public.quote_snapshots (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.farm_lots(id),
  route_id uuid not null references public.route_templates(id),
  snapshot jsonb not null,
  expires_at timestamptz not null,
  published_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_snapshot_id uuid not null unique references public.quote_snapshots(id),
  consumer_id uuid not null references public.profiles(id),
  status public.order_status not null default 'reserved',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.farm_lots enable row level security;
alter table public.route_templates enable row level security;
alter table public.partner_quotes enable row level security;
alter table public.quote_snapshots enable row level security;
alter table public.orders enable row level security;

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "farmers manage own lots" on public.farm_lots for all using (farmer_id = auth.uid()) with check (farmer_id = auth.uid());
create policy "operators manage routes" on public.route_templates for all using (public.current_role() = 'operator');
create policy "operators manage partner quotes" on public.partner_quotes for all using (public.current_role() = 'operator');
create policy "consumers read published snapshots" on public.quote_snapshots for select using (published_at is not null);
create policy "consumers manage own orders" on public.orders for all using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());