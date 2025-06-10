-- Create handle_updated_at function if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create profiles table
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  role text not null check (role in ('operator', 'admin', 'referrer')),
  status text not null check (status in ('registered', 'activated')) default 'registered',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS for now
alter table public.profiles disable row level security;

-- Add updated_at trigger
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Create index for faster email lookups
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_status_idx on public.profiles(status); 