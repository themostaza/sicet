-- Add alert_checked column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS alert_checked BOOLEAN DEFAULT FALSE;

-- Update existing tasks to have alert_checked = false
UPDATE tasks SET alert_checked = FALSE WHERE alert_checked IS NULL; 