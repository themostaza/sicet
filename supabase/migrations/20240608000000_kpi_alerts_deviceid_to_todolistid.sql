-- MIGRATION: Sostituzione device_id con todolist_id in kpi_alerts

-- 1. Rimuovi la foreign key e la colonna device_id
ALTER TABLE public.kpi_alerts DROP CONSTRAINT IF EXISTS kpi_alerts_device_id_fkey;
ALTER TABLE public.kpi_alerts DROP COLUMN IF EXISTS device_id;

-- 2. Aggiungi la colonna todolist_id
ALTER TABLE public.kpi_alerts ADD COLUMN todolist_id uuid NOT NULL REFERENCES public.todolist(id) ON DELETE CASCADE;

-- 3. (Opzionale) Se vuoi migrare dati esistenti, aggiungi qui la logica di migrazione
-- UPDATE public.kpi_alerts SET todolist_id = ...

-- 4. Aggiorna eventuali indici (se necessario)
-- CREATE INDEX IF NOT EXISTS kpi_alerts_todolist_id_idx ON public.kpi_alerts(todolist_id);

-- 5. Aggiorna le policy se necessario (di solito non serve) 