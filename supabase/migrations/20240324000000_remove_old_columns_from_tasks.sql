-- Remove old columns from tasks table
do $$ 
begin
    -- Drop old columns if they exist
    alter table public.tasks drop column if exists device_id;
    alter table public.tasks drop column if exists scheduled_execution;
    alter table public.tasks drop column if exists completion_date;
    
    -- Ensure todolist_id is not null
    alter table public.tasks alter column todolist_id set not null;
end $$;

-- Add a comment to verify the migration was applied
comment on table public.tasks is 'Table for storing tasks, linked to todolists'; 