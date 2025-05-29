-- Create kpi_alert_logs table
create table if not exists public.kpi_alert_logs (
  id uuid default gen_random_uuid() primary key,
  alert_id uuid not null references public.kpi_alerts(id) on delete cascade,
  kpi_id text not null references public.kpis(id) on delete cascade,
  device_id text not null references public.devices(id) on delete cascade,
  triggered_value jsonb not null,
  triggered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email_sent boolean not null default false,
  email_sent_at timestamp with time zone,
  error_message text
);

-- Add RLS policies
alter table public.kpi_alert_logs enable row level security;

create policy "Enable read access for all users" on public.kpi_alert_logs
  for select using (true);

create policy "Enable insert for authenticated users only" on public.kpi_alert_logs
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on public.kpi_alert_logs
  for update using (auth.role() = 'authenticated');

-- Add indexes for better query performance
create index if not exists kpi_alert_logs_alert_id_idx on public.kpi_alert_logs(alert_id);
create index if not exists kpi_alert_logs_kpi_id_idx on public.kpi_alert_logs(kpi_id);
create index if not exists kpi_alert_logs_device_id_idx on public.kpi_alert_logs(device_id);
create index if not exists kpi_alert_logs_triggered_at_idx on public.kpi_alert_logs(triggered_at); 