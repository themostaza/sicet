-- Allow all authenticated users to create devices and KPIs
-- This is more appropriate for development/testing environments

-- DEVICES - Allow all authenticated users to create
drop policy if exists "Allow admin to insert devices" on public.devices;
create policy "Allow authenticated users to insert devices"
on public.devices for insert
to authenticated
with check (true);

-- Allow all authenticated users to update their own devices
drop policy if exists "Allow admin to update devices" on public.devices;
create policy "Allow authenticated users to update devices"
on public.devices for update
to authenticated
using (true);

-- Allow all authenticated users to delete devices (soft delete)
drop policy if exists "Allow admin to delete devices" on public.devices;
create policy "Allow authenticated users to delete devices"
on public.devices for delete
to authenticated
using (true);

-- KPIS - Allow all authenticated users to create
drop policy if exists "Allow admin to insert kpis" on public.kpis;
create policy "Allow authenticated users to insert kpis"
on public.kpis for insert
to authenticated
with check (true);

-- Allow all authenticated users to update KPIs
drop policy if exists "Allow admin to update kpis" on public.kpis;
create policy "Allow authenticated users to update kpis"
on public.kpis for update
to authenticated
using (true);

-- Allow all authenticated users to delete KPIs (soft delete)
drop policy if exists "Allow admin to delete kpis" on public.kpis;
create policy "Allow authenticated users to delete kpis"
on public.kpis for delete
to authenticated
using (true); 