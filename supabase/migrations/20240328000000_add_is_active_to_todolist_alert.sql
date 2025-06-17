-- Add is_active field to todolist_alert table
alter table public.todolist_alert 
add column if not exists is_active boolean default true not null;

-- Add index for better performance when filtering by is_active
create index if not exists todolist_alert_is_active_idx on public.todolist_alert(is_active);

-- Update existing records to be active by default
update public.todolist_alert 
set is_active = true 
where is_active is null;

-- Add comment
comment on column public.todolist_alert.is_active is 'Whether this alert is active and should send notifications'; 