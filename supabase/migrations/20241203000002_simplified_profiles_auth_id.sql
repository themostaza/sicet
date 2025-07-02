-- Migration: Aggiungi auth_id alla tabella profiles (versione semplificata)
-- Data: 2024-12-03
-- Motivo: Aggiungere supporto per auth_id e status deleted

-- Aggiungi colonna auth_id se non esiste
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'auth_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Aggiungi status 'deleted' se non esiste nel check constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_status_check' 
        AND check_clause LIKE '%deleted%'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
          CHECK (status IN ('registered', 'activated', 'reset-password', 'deleted'));
    END IF;
END $$;

-- Rimuovi il vincolo unique su email se esiste
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Aggiungi un indice su auth_id per performance
CREATE INDEX IF NOT EXISTS profiles_auth_id_idx ON public.profiles(auth_id);

-- Aggiungi un indice unico su email solo per utenti non cancellati
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_active_idx ON public.profiles(email) 
WHERE status != 'deleted';

-- Aggiorna i profili esistenti per impostare auth_id dove possibile
UPDATE public.profiles 
SET auth_id = id 
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p 
  INNER JOIN auth.users u ON p.id = u.id
)
AND auth_id IS NULL; 