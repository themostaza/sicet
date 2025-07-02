-- Migration: Sistema il vincolo di foreign key per auth_id
-- Data: 2024-12-03
-- Motivo: Risolvere problemi con il vincolo di foreign key che impedisce l'aggiornamento

-- Rimuovi temporaneamente il vincolo se esiste
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_id_fkey;

-- Ricrea il vincolo con ON DELETE SET NULL
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_id_fkey 
  FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Verifica che la colonna auth_id esista e sia del tipo corretto
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'auth_id'
        AND data_type = 'uuid'
    ) THEN
        RAISE EXCEPTION 'La colonna auth_id non esiste o non è del tipo corretto';
    END IF;
END $$; 