-- Create todolist table
CREATE TABLE todolist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    scheduled_execution TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(device_id, scheduled_execution)
);

-- Add todolist_id to tasks table
ALTER TABLE tasks ADD COLUMN todolist_id UUID REFERENCES todolist(id) ON DELETE CASCADE;

-- Create index on todolist_id for better performance
CREATE INDEX idx_tasks_todolist_id ON tasks(todolist_id);

-- Migrate existing data
WITH todolist_data AS (
    SELECT DISTINCT 
        device_id,
        date_trunc('hour', scheduled_execution) as scheduled_execution
    FROM tasks
    WHERE todolist_id IS NULL
)
INSERT INTO todolist (id, device_id, scheduled_execution, status)
SELECT 
    gen_random_uuid(),
    device_id,
    scheduled_execution,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM tasks t2 
            WHERE t2.device_id = todolist_data.device_id 
            AND date_trunc('hour', t2.scheduled_execution) = todolist_data.scheduled_execution
            AND t2.status = 'completed'
        ) AND NOT EXISTS (
            SELECT 1 FROM tasks t2 
            WHERE t2.device_id = todolist_data.device_id 
            AND date_trunc('hour', t2.scheduled_execution) = todolist_data.scheduled_execution
            AND t2.status != 'completed'
        ) THEN 'completed'
        WHEN EXISTS (
            SELECT 1 FROM tasks t2 
            WHERE t2.device_id = todolist_data.device_id 
            AND date_trunc('hour', t2.scheduled_execution) = todolist_data.scheduled_execution
            AND t2.status = 'completed'
        ) THEN 'in_progress'
        ELSE 'pending'
    END
FROM todolist_data;

-- Update tasks with todolist_id
UPDATE tasks t
SET todolist_id = tl.id
FROM todolist tl
WHERE t.device_id = tl.device_id
AND date_trunc('hour', t.scheduled_execution) = tl.scheduled_execution
AND t.todolist_id IS NULL;

-- Make todolist_id NOT NULL after migration
ALTER TABLE tasks ALTER COLUMN todolist_id SET NOT NULL;

-- Add trigger to update todolist status when task status changes
CREATE OR REPLACE FUNCTION update_todolist_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE todolist
    SET 
        status = CASE 
            WHEN EXISTS (
                SELECT 1 FROM tasks t2 
                WHERE t2.todolist_id = NEW.todolist_id 
                AND t2.status = 'completed'
            ) AND NOT EXISTS (
                SELECT 1 FROM tasks t2 
                WHERE t2.todolist_id = NEW.todolist_id 
                AND t2.status != 'completed'
            ) THEN 'completed'
            WHEN EXISTS (
                SELECT 1 FROM tasks t2 
                WHERE t2.todolist_id = NEW.todolist_id 
                AND t2.status = 'completed'
            ) THEN 'in_progress'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = NEW.todolist_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_todolist_status_trigger
AFTER UPDATE OF status ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_todolist_status();

-- Add trigger to update todolist status when task is inserted
CREATE OR REPLACE FUNCTION update_todolist_status_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE todolist
    SET 
        status = CASE 
            WHEN EXISTS (
                SELECT 1 FROM tasks t2 
                WHERE t2.todolist_id = NEW.todolist_id 
                AND t2.status = 'completed'
            ) AND NOT EXISTS (
                SELECT 1 FROM tasks t2 
                WHERE t2.todolist_id = NEW.todolist_id 
                AND t2.status != 'completed'
            ) THEN 'completed'
            WHEN EXISTS (
                SELECT 1 FROM tasks t2 
                WHERE t2.todolist_id = NEW.todolist_id 
                AND t2.status = 'completed'
            ) THEN 'in_progress'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = NEW.todolist_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_todolist_status_on_insert_trigger
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_todolist_status_on_insert(); 