-- Final cleanup for the public account profile schema.
--
-- Run this file only AFTER:
--   1. public_terms_acceptance_migration.sql has completed, and
--   2. the matching application release has been deployed successfully.
--
-- Keeping this cleanup separate prevents the previous deployed release from
-- failing while Vercel is still switching deployments. PostgreSQL will abort
-- and roll back this transaction if an unknown database object still depends
-- on either column; CASCADE is intentionally not used.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.public_users') IS NULL THEN
    RAISE EXCEPTION 'Cleanup stopped: public.public_users does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_users'
      AND column_name = 'terms_version'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_users'
      AND column_name = 'terms_accepted_at'
  ) THEN
    RAISE EXCEPTION 'Cleanup stopped: install the Terms acceptance migration first';
  END IF;
END;
$$;

ALTER TABLE public.public_users
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS organization;

COMMIT;

-- Ask PostgREST to refresh its schema immediately after the DDL change.
NOTIFY pgrst, 'reload schema';
