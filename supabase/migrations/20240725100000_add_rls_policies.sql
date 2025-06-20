-- DEVICES
alter table public.devices enable row level security;

drop policy if exists "Allow select access on devices" on public.devices;
create policy "Allow select access on devices"
on public.devices for select
to authenticated
using (
  (deleted = false)
  or
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

drop policy if exists "Allow admin to insert devices" on public.devices;
create policy "Allow admin to insert devices"
on public.devices for insert
to authenticated
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow admin to update devices" on public.devices;
create policy "Allow admin to update devices"
on public.devices for update
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow admin to delete devices" on public.devices;
create policy "Allow admin to delete devices"
on public.devices for delete
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- KPIS
alter table public.kpis enable row level security;

drop policy if exists "Allow select access on kpis" on public.kpis;
create policy "Allow select access on kpis"
on public.kpis for select
to authenticated
using (
  (deleted = false)
  or
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
);

drop policy if exists "Allow admin to insert kpis" on public.kpis;
create policy "Allow admin to insert kpis"
on public.kpis for insert
to authenticated
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow admin to update kpis" on public.kpis;
create policy "Allow admin to update kpis"
on public.kpis for update
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow admin to delete kpis" on public.kpis;
create policy "Allow admin to delete kpis"
on public.kpis for delete
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- PROFILES
alter table public.profiles enable row level security;

drop policy if exists "Allow users to see their own profile" on public.profiles;
create policy "Allow users to see their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Allow admin to see all profiles" on public.profiles;
create policy "Allow admin to see all profiles"
on public.profiles for select
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow users to update their own profile" on public.profiles;
create policy "Allow users to update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Allow admin to update any profile" on public.profiles;
create policy "Allow admin to update any profile"
on public.profiles for update
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow admin to insert profiles" on public.profiles;
create policy "Allow admin to insert profiles"
on public.profiles for insert
to authenticated
with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "Allow admin to delete profiles" on public.profiles;
create policy "Allow admin to delete profiles"
on public.profiles for delete
to authenticated
using (((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin') and (auth.uid() <> id));

-- TODOLIST
alter table public.todolist enable row level security;

drop policy if exists "Users can view todolists" on public.todolist;
drop policy if exists "Users can insert todolists" on public.todolist;
drop policy if exists "Users can update todolists" on public.todolist;
drop policy if exists "Users can delete todolists" on public.todolist;
drop policy if exists "Allow authenticated users to access todolists" on public.todolist;

create policy "Allow authenticated users to access todolists"
on public.todolist for all
to authenticated
using (true)
with check (true);

-- TASKS
alter table public.tasks enable row level security;

drop policy if exists "Users can view tasks" on public.tasks;
drop policy if exists "Users can insert tasks" on public.tasks;
drop policy if exists "Users can update tasks" on public.tasks;
drop policy if exists "Users can delete tasks" on public.tasks;
drop policy if exists "Allow authenticated users to access tasks" on public.tasks;

create policy "Allow authenticated users to access tasks"
on public.tasks for all
to authenticated
using (true)
with check (true); 