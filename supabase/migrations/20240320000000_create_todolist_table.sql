-- Create todolist table if it doesn't exist
create table if not exists public.todolist (
    id uuid default gen_random_uuid() primary key,
    device_id uuid references public.devices(id) on delete cascade not null,
    scheduled_execution timestamptz not null,
    status text default 'pending'::text not null check (status in ('pending', 'in_progress', 'completed')),
    completion_date timestamptz,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint todolist_device_id_scheduled_execution_key unique (device_id, scheduled_execution)
);

-- Add completion_date column if it doesn't exist
do $$ 
begin
    if not exists (
        select 1 
        from information_schema.columns 
        where table_name = 'todolist' 
        and column_name = 'completion_date'
    ) then
        alter table public.todolist add column completion_date timestamptz;
    end if;
end $$;

-- Modify tasks table to use todolist_id
do $$ 
begin
    -- First check if todolist_id column exists
    if not exists (
        select 1 
        from information_schema.columns 
        where table_name = 'tasks' 
        and column_name = 'todolist_id'
    ) then
        -- Add todolist_id column
        alter table public.tasks add column todolist_id uuid references public.todolist(id) on delete cascade;
        
        -- Migrate existing data
        update public.tasks t
        set todolist_id = tl.id
        from public.todolist tl
        where t.device_id = tl.device_id 
        and t.scheduled_execution = tl.scheduled_execution;
        
        -- Make todolist_id not null after migration
        alter table public.tasks alter column todolist_id set not null;
        
        -- Drop old columns
        alter table public.tasks drop column if exists device_id;
        alter table public.tasks drop column if exists scheduled_execution;
        alter table public.tasks drop column if exists completion_date;
    end if;
end $$;

-- Create tasks table if it doesn't exist with the correct structure
create table if not exists public.tasks (
    id uuid default gen_random_uuid() primary key,
    todolist_id uuid references public.todolist(id) on delete cascade not null,
    kpi_id uuid references public.kpis(id) on delete cascade not null,
    status text default 'pending'::text not null check (status in ('pending', 'in_progress', 'completed')),
    value jsonb,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    alert_checked boolean default false not null
);

-- Add RLS policies for tasks
alter table public.tasks enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view tasks" on public.tasks;
drop policy if exists "Users can insert tasks" on public.tasks;
drop policy if exists "Users can update tasks" on public.tasks;
drop policy if exists "Users can delete tasks" on public.tasks;

-- Create new policies
create policy "Users can view tasks"
    on public.tasks for select
    using (auth.role() = 'authenticated');

create policy "Users can insert tasks"
    on public.tasks for insert
    with check (auth.role() = 'authenticated');

create policy "Users can update tasks"
    on public.tasks for update
    using (auth.role() = 'authenticated');

create policy "Users can delete tasks"
    on public.tasks for delete
    using (auth.role() = 'authenticated');

-- Create trigger to update todolist status
create or replace function public.update_todolist_status()
returns trigger as $$
begin
    -- If all tasks are completed, mark todolist as completed
    if not exists (
        select 1 
        from public.tasks 
        where todolist_id = new.todolist_id 
        and status != 'completed'
    ) then
        update public.todolist 
        set status = 'completed',
            completion_date = now(),
            updated_at = now()
        where id = new.todolist_id;
    -- If any task is in progress, mark todolist as in progress
    elsif exists (
        select 1 
        from public.tasks 
        where todolist_id = new.todolist_id 
        and status = 'in_progress'
    ) then
        update public.todolist 
        set status = 'in_progress',
            updated_at = now()
        where id = new.todolist_id;
    -- Otherwise mark as pending
    else
        update public.todolist 
        set status = 'pending',
            updated_at = now()
        where id = new.todolist_id;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists
drop trigger if exists update_todolist_status_trigger on public.tasks;

-- Create trigger
create trigger update_todolist_status_trigger
    after insert or update of status
    on public.tasks
    for each row
    execute function public.update_todolist_status();

-- Add RLS policies
alter table public.todolist enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view todolists" on public.todolist;
drop policy if exists "Users can insert todolists" on public.todolist;
drop policy if exists "Users can update todolists" on public.todolist;
drop policy if exists "Users can delete todolists" on public.todolist;
drop policy if exists "Users can view todolists for their devices" on public.todolist;
drop policy if exists "Referrers and admins can view all todolists" on public.todolist;
drop policy if exists "Users can insert todolists for their devices" on public.todolist;
drop policy if exists "Referrers and admins can insert todolists" on public.todolist;
drop policy if exists "Users can update todolists for their devices" on public.todolist;
drop policy if exists "Referrers and admins can update todolists" on public.todolist;
drop policy if exists "Users can delete todolists for their devices" on public.todolist;
drop policy if exists "Referrers and admins can delete todolists" on public.todolist;

-- Create new policies
create policy "Users can view todolists"
    on public.todolist for select
    using (auth.role() = 'authenticated');

create policy "Users can insert todolists"
    on public.todolist for insert
    with check (auth.role() = 'authenticated');

create policy "Users can update todolists"
    on public.todolist for update
    using (auth.role() = 'authenticated');

create policy "Users can delete todolists"
    on public.todolist for delete
    using (auth.role() = 'authenticated');

-- Grant necessary permissions
grant usage on type public.user_action_type to authenticated;
grant usage on type public.entity_type to authenticated;
grant select, insert, update, delete on public.todolist to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

-- Add a comment to verify the table was created
comment on table public.todolist is 'Table for storing todolists'; 