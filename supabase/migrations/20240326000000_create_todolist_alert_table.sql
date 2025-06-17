-- Create todolist_alert table
create table if not exists public.todolist_alert (
    id uuid default gen_random_uuid() primary key,
    todolist_id uuid references public.todolist(id) on delete cascade not null,
    email text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Add RLS policies
alter table public.todolist_alert enable row level security;

-- Create policies
create policy "Users can view todolist alerts"
    on public.todolist_alert for select
    using (auth.role() = 'authenticated');

create policy "Users can insert todolist alerts"
    on public.todolist_alert for insert
    with check (auth.role() = 'authenticated');

create policy "Users can update todolist alerts"
    on public.todolist_alert for update
    using (auth.role() = 'authenticated');

create policy "Users can delete todolist alerts"
    on public.todolist_alert for delete
    using (auth.role() = 'authenticated');

-- Grant permissions
grant select, insert, update, delete on public.todolist_alert to authenticated;

-- Add indexes
create index if not exists todolist_alert_todolist_id_idx on public.todolist_alert(todolist_id);
create index if not exists todolist_alert_email_idx on public.todolist_alert(email);

-- Add a comment to verify the table was created
comment on table public.todolist_alert is 'Table for storing todolist alerts'; 