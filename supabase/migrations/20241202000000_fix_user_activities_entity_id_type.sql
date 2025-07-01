-- Migration: Cambia il tipo di entity_id nella tabella user_activities da UUID a text
-- Data: 2024-12-02
-- Motivo: Gli ID di device e KPI sono stati cambiati da UUID a text, ma user_activities
--         si aspetta ancora UUID per entity_id, causando errori di tipo

-- Cambia il tipo di colonna entity_id da UUID a text
ALTER TABLE public.user_activities ALTER COLUMN entity_id TYPE text;

-- Aggiorna l'indice per entity_id per riflettere il nuovo tipo
DROP INDEX IF EXISTS user_activities_entity_idx;
CREATE INDEX user_activities_entity_idx ON public.user_activities(entity_type, entity_id);

-- Aggiungi un commento per documentare il cambiamento
COMMENT ON COLUMN public.user_activities.entity_id IS 'ID dell''entità (può essere UUID per todolist/task o text per device/kpi)'; 