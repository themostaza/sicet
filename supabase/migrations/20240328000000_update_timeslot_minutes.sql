-- Update timeslot columns to support minutes (0-1439 range)
-- This migration updates the time_slot_start and time_slot_end columns to store minutes of the day
-- instead of just hours, allowing for more precise time slot definitions

-- Add comments to explain the new format
comment on column public.todolist.time_slot_start is 'Start time in minutes of the day (0-1439). Example: 90 = 1:30 AM';
comment on column public.todolist.time_slot_end is 'End time in minutes of the day (0-1439). Example: 1020 = 5:00 PM';

-- Update existing data to convert hours to minutes
-- For existing custom timeslots, convert hours to minutes
update public.todolist 
set 
  time_slot_start = time_slot_start * 60,
  time_slot_end = time_slot_end * 60
where time_slot_type = 'custom' 
  and time_slot_start is not null 
  and time_slot_end is not null
  and time_slot_start < 24 
  and time_slot_end < 24;

-- Add check constraint to ensure minutes are in valid range (0-1439)
alter table public.todolist drop constraint if exists todolist_custom_time_slot_check;

alter table public.todolist add constraint todolist_custom_time_slot_check 
  check (
    (time_slot_type = 'standard') or 
    (time_slot_type = 'custom' and 
     time_slot_start is not null and 
     time_slot_end is not null and
     time_slot_start >= 0 and time_slot_start <= 1439 and
     time_slot_end >= 0 and time_slot_end <= 1439)
  );

-- Add a comment to verify the migration was applied
comment on table public.todolist is 'Table for storing todolists with support for minute-precision custom time slots'; 