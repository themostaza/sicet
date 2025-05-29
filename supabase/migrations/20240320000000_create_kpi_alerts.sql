-- Create kpi_alerts table
create table if not exists public.kpi_alerts (
  id uuid default gen_random_uuid() primary key,
  kpi_id text not null references public.kpis(id) on delete cascade,
  device_id text not null references public.devices(id) on delete cascade,
  is_active boolean not null default true,
  email text not null,
  conditions jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.kpi_alerts enable row level security;

create policy "Enable read access for all users" on public.kpi_alerts
  for select using (true);

create policy "Enable insert for authenticated users only" on public.kpi_alerts
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on public.kpi_alerts
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" on public.kpi_alerts
  for delete using (auth.role() = 'authenticated');

-- Add updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_kpi_alerts_updated_at
  before update on public.kpi_alerts
  for each row
  execute function public.handle_updated_at(); 