-- Migration: Modifica tabella profiles per usare auth.id invece di email
-- Data: 2024-12-03
-- Motivo: Cambiare la gestione degli utenti per usare auth.id come chiave primaria
--         e gestire meglio la cancellazione e ripristino degli utenti

-- Aggiungi colonna auth_id che può essere null
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Aggiungi status 'deleted' al check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('registered', 'activated', 'reset-password', 'deleted'));

-- Rimuovi il vincolo unique su email per permettere ripristino utenti
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
);

-- Aggiungi commenti per documentare i cambiamenti
COMMENT ON COLUMN public.profiles.auth_id IS 'ID dell''utente in auth.users, null se utente cancellato';
COMMENT ON COLUMN public.profiles.email IS 'Email dell''utente, può essere duplicata per utenti cancellati';
COMMENT ON COLUMN public.profiles.status IS 'Stato del profilo: registered, activated, reset-password, deleted'; 