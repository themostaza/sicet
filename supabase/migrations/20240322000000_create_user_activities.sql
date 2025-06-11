-- Drop existing table and types if they exist
drop table if exists public.user_activities;
drop type if exists public.user_action_type cascade;
drop type if exists public.entity_type cascade;

-- Create enum for action types
create type public.user_action_type as enum (
    'create_device',
    'create_kpi',
    'create_todolist',
    'complete_task',
    'update_device',
    'update_kpi',
    'update_todolist',
    'delete_device',
    'delete_kpi',
    'delete_todolist'
);

-- Create enum for entity types
create type public.entity_type as enum (
    'device',
    'kpi',
    'todolist',
    'task'
);

-- Create user_activities table
create table if not exists public.user_activities (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    action_type user_action_type not null,
    entity_type entity_type not null,
    entity_id uuid not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- Create indexes for better query performance
create index if not exists user_activities_user_id_idx on public.user_activities(user_id);
create index if not exists user_activities_entity_idx on public.user_activities(entity_type, entity_id);
create index if not exists user_activities_created_at_idx on public.user_activities(created_at);

-- Add RLS policies
alter table public.user_activities enable row level security;

-- Policy to allow users to view their own activities
create policy "Users can view their own activities"
    on public.user_activities for select
    using (auth.uid() = user_id);

-- Policy to allow referrers and admins to view all activities
create policy "Referrers and admins can view all activities"
    on public.user_activities for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.email = auth.jwt()->>'email'
            and profiles.role in ('referrer', 'admin')
        )
    );

-- Policy to allow system to insert activities
create policy "System can insert activities"
    on public.user_activities for insert
    with check (true);

-- Grant necessary permissions
grant usage on type public.user_action_type to authenticated;
grant usage on type public.entity_type to authenticated;
grant select on public.user_activities to authenticated;
grant insert on public.user_activities to authenticated;

-- Add a comment to verify the table was created
comment on table public.user_activities is 'Table for tracking user activities in the system';

-- Create function to log user activity
create or replace function public.log_user_activity(
    p_user_id uuid,
    p_action_type user_action_type,
    p_entity_type entity_type,
    p_entity_id uuid,
    p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
    v_activity_id uuid;
begin
    insert into public.user_activities (
        user_id,
        action_type,
        entity_type,
        entity_id,
        metadata
    ) values (
        p_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_metadata
    )
    returning id into v_activity_id;
    
    return v_activity_id;
end;
$$;

-- Grant execute permission on the function
grant execute on function public.log_user_activity to authenticated; 