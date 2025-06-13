-- Remove the unique constraint on todolist
alter table public.todolist drop constraint if exists todolist_device_id_scheduled_execution_key;

-- Add a comment to verify the migration was applied
comment on table public.todolist is 'Table for storing todolists (multiple todolists allowed per device and date)'; 