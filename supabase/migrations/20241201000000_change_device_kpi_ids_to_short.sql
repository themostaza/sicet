-- Migration: Cambia gli ID di device e KPI da UUID a text per supportare ID alfanumerici corti
-- Data: 2024-12-01

-- 1. Cambia il tipo di colonna id nella tabella devices da UUID a text
ALTER TABLE public.devices ALTER COLUMN id TYPE text;

-- 2. Cambia il tipo di colonna id nella tabella kpis da UUID a text
ALTER TABLE public.kpis ALTER COLUMN id TYPE text;

-- 3. Aggiorna le foreign key che referenziano devices.id
-- Prima rimuovi le foreign key esistenti
ALTER TABLE public.todolist DROP CONSTRAINT IF EXISTS todolist_device_id_fkey;

-- Poi ricrea la foreign key con il nuovo tipo
ALTER TABLE public.todolist 
ADD CONSTRAINT todolist_device_id_fkey 
FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;

-- 4. Aggiorna le foreign key che referenziano kpis.id
-- Prima rimuovi le foreign key esistenti
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_kpi_id_fkey;
ALTER TABLE public.kpi_alerts DROP CONSTRAINT IF EXISTS kpi_alerts_kpi_id_fkey;

-- Poi ricrea le foreign key con il nuovo tipo
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_kpi_id_fkey 
FOREIGN KEY (kpi_id) REFERENCES public.kpis(id) ON DELETE CASCADE;

ALTER TABLE public.kpi_alerts 
ADD CONSTRAINT kpi_alerts_kpi_id_fkey 
FOREIGN KEY (kpi_id) REFERENCES public.kpis(id) ON DELETE CASCADE;

-- 5. Aggiungi vincoli per assicurarsi che gli ID seguano il formato corretto
-- Per devices: D seguito da 7 caratteri alfanumerici
ALTER TABLE public.devices 
ADD CONSTRAINT devices_id_format_check 
CHECK (id ~ '^D[A-Z0-9]{7}$');

-- Per kpis: K seguito da 7 caratteri alfanumerici
ALTER TABLE public.kpis 
ADD CONSTRAINT kpis_id_format_check 
CHECK (id ~ '^K[A-Z0-9]{7}$');

-- 6. Aggiungi indici per migliorare le performance delle query
CREATE INDEX IF NOT EXISTS devices_id_idx ON public.devices(id);
CREATE INDEX IF NOT EXISTS kpis_id_idx ON public.kpis(id); 