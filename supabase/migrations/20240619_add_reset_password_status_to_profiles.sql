ALTER TABLE profiles
  ALTER COLUMN status
  TYPE text,
  ALTER COLUMN status
  SET DEFAULT 'registered';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('registered', 'activated', 'reset-password')); 