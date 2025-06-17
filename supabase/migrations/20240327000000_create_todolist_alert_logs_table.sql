-- Create todolist_alert_logs table
create table if not exists public.todolist_alert_logs (
    id uuid default gen_random_uuid() primary key,
    todolist_id uuid references public.todolist(id) on delete cascade not null,
    alert_id uuid references public.todolist_alert(id) on delete cascade not null,
    email text not null,
    sent_at timestamptz default now() not null,
    error_message text,
    created_at timestamptz default now() not null
);

-- Add RLS policies
alter table public.todolist_alert_logs enable row level security;

-- Create policies
create policy "Users can view todolist alert logs"
    on public.todolist_alert_logs for select
    using (auth.role() = 'authenticated');

create policy "Users can insert todolist alert logs"
    on public.todolist_alert_logs for insert
    with check (auth.role() = 'authenticated');

create policy "Users can update todolist alert logs"
    on public.todolist_alert_logs for update
    using (auth.role() = 'authenticated');

create policy "Users can delete todolist alert logs"
    on public.todolist_alert_logs for delete
    using (auth.role() = 'authenticated');

-- Grant permissions
grant select, insert, update, delete on public.todolist_alert_logs to authenticated;

-- Add indexes
create index if not exists todolist_alert_logs_todolist_id_idx on public.todolist_alert_logs(todolist_id);
create index if not exists todolist_alert_logs_alert_id_idx on public.todolist_alert_logs(alert_id);
create index if not exists todolist_alert_logs_sent_at_idx on public.todolist_alert_logs(sent_at);

-- Add a comment to verify the table was created
comment on table public.todolist_alert_logs is 'Table for storing todolist alert logs'; 