-- Add updated_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Add updated_at trigger
create trigger handle_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- Update existing tasks to have updated_at = created_at
UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL; 