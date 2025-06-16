-- Add time_slot_type column to todolist table
alter table public.todolist add column if not exists time_slot_type text default 'standard'::text not null check (time_slot_type in ('standard', 'custom'));

-- Add time_slot_start and time_slot_end columns for custom time slots
alter table public.todolist add column if not exists time_slot_start integer;
alter table public.todolist add column if not exists time_slot_end integer;

-- Add check constraint to ensure custom time slots have start and end times
alter table public.todolist add constraint todolist_custom_time_slot_check 
  check (
    (time_slot_type = 'standard') or 
    (time_slot_type = 'custom' and time_slot_start is not null and time_slot_end is not null)
  ); 