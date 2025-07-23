-- Migration script per aggiornare le todolist dal vecchio sistema al nuovo sistema di time slot
-- Questa query aggiorna le todolist esistenti che non hanno ancora time_slot_start e time_slot_end

-- Prima, aggiungiamo le colonne se non esistono (esegui solo se necessario)
-- ALTER TABLE todolist ADD COLUMN IF NOT EXISTS time_slot_start INTEGER;
-- ALTER TABLE todolist ADD COLUMN IF NOT EXISTS time_slot_end INTEGER;
-- ALTER TABLE todolist ADD COLUMN IF NOT EXISTS time_slot_type TEXT DEFAULT 'standard';

-- Aggiorna le todolist che non hanno ancora time_slot_start e time_slot_end
-- Basandoci su scheduled_execution per dedurre il time slot

UPDATE todolist 
SET 
  time_slot_type = 'standard',
  time_slot_start = CASE 
    -- Mattina: 6-14 (360-840 minuti)
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 6 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 14 
    THEN 360
    
    -- Pomeriggio: 14-22 (840-1320 minuti)  
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 14 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 22 
    THEN 840
    
    -- Notte: 22-6 (1320-360 minuti, ma gestiamo come 22-6 del giorno successivo)
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 22 
    THEN 1320
    
    -- Notte: 0-6 (0-360 minuti)
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 0 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 6 
    THEN 1320
    
    -- Giornata: 7-17 (420-1020 minuti) - ha priorità se nell'intervallo
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 7 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 17 
    THEN 420
    
    -- Fallback a mattina per qualsiasi altro caso
    ELSE 360
  END,
  
  time_slot_end = CASE 
    -- Mattina: 6-14 (360-840 minuti)
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 6 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 14 
    THEN 840
    
    -- Pomeriggio: 14-22 (840-1320 minuti)  
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 14 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 22 
    THEN 1320
    
    -- Notte: 22-6 (1320-360 minuti, ma gestiamo come 22-6 del giorno successivo)
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 22 
    THEN 360
    
    -- Notte: 0-6 (0-360 minuti)
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 0 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 6 
    THEN 360
    
    -- Giornata: 7-17 (420-1020 minuti) - ha priorità se nell'intervallo
    WHEN EXTRACT(HOUR FROM scheduled_execution::timestamp) >= 7 AND EXTRACT(HOUR FROM scheduled_execution::timestamp) < 17 
    THEN 1020
    
    -- Fallback a mattina per qualsiasi altro caso
    ELSE 840
  END

WHERE 
  time_slot_start IS NULL 
  OR time_slot_end IS NULL 
  OR time_slot_type IS NULL;

-- Verifica il risultato della migrazione
SELECT 
  COUNT(*) as total_todolists,
  COUNT(CASE WHEN time_slot_start IS NOT NULL THEN 1 END) as with_start,
  COUNT(CASE WHEN time_slot_end IS NOT NULL THEN 1 END) as with_end,
  COUNT(CASE WHEN time_slot_type IS NOT NULL THEN 1 END) as with_type,
  COUNT(CASE WHEN time_slot_start IS NULL OR time_slot_end IS NULL OR time_slot_type IS NULL THEN 1 END) as still_missing
FROM todolist;

-- Mostra alcuni esempi di todolist migrate
SELECT 
  id,
  scheduled_execution,
  time_slot_type,
  time_slot_start,
  time_slot_end,
  CASE 
    WHEN time_slot_start = 360 AND time_slot_end = 840 THEN 'mattina'
    WHEN time_slot_start = 840 AND time_slot_end = 1320 THEN 'pomeriggio'
    WHEN time_slot_start = 1320 AND time_slot_end = 360 THEN 'notte'
    WHEN time_slot_start = 420 AND time_slot_end = 1020 THEN 'giornata'
    ELSE 'custom'
  END as inferred_slot_name
FROM todolist 
ORDER BY scheduled_execution DESC 
LIMIT 10; 