-- Fix RLS policies to use profiles table for role checking
-- This resolves the issue where admin users can't create devices/KPIs

-- DEVICES - Allow admin users (from profiles table) to create/update/delete
drop policy if exists "Allow admin to insert devices" on public.devices;
create policy "Allow admin to insert devices"
on public.devices for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role = 'admin'
  )
);

drop policy if exists "Allow admin to update devices" on public.devices;
create policy "Allow admin to update devices"
on public.devices for update
to authenticated
using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role = 'admin'
  )
);

drop policy if exists "Allow admin to delete devices" on public.devices;
create policy "Allow admin to delete devices"
on public.devices for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role = 'admin'
  )
);

-- KPIS - Allow admin users (from profiles table) to create/update/delete
drop policy if exists "Allow admin to insert kpis" on public.kpis;
create policy "Allow admin to insert kpis"
on public.kpis for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role = 'admin'
  )
);

drop policy if exists "Allow admin to update kpis" on public.kpis;
create policy "Allow admin to update kpis"
on public.kpis for update
to authenticated
using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role = 'admin'
  )
);

drop policy if exists "Allow admin to delete kpis" on public.kpis;
create policy "Allow admin to delete kpis"
on public.kpis for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() 
    and p.role = 'admin'
  )
); 