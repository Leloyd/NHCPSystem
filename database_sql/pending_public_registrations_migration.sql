-- Two-stage public registration.
-- Run this complete file in the Supabase SQL Editor BEFORE deploying the
-- matching application code. Pending signups are private server-side state;
-- a public_users row is created only after a correct, unexpired OTP.
--
-- This migration removes only legacy password-signup placeholders that never
-- verified an email, logged in, or completed onboarding. The candidate set is
-- kept stable while public_users is write-locked so a concurrent signup cannot
-- be caught by the cleanup. Still-valid legacy OTP state is copied before the
-- cleanup; after Terms versioning is deployed, attempts without recorded
-- acceptance are safely asked to restart registration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pending_public_registrations (
  email text PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 160),
  password_hash text NOT NULL CHECK (char_length(password_hash) BETWEEN 40 AND 512),
  verification_code_hash text NOT NULL CHECK (verification_code_hash ~ '^[0-9a-f]{64}$'),
  verification_expires_at timestamp with time zone NOT NULL,
  verification_sent_at timestamp with time zone NOT NULL,
  verification_attempts integer NOT NULL DEFAULT 0 CHECK (verification_attempts BETWEEN 0 AND 5),
  terms_version text,
  terms_accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT pending_public_registrations_email_normalized_check
    CHECK (email = lower(btrim(email))),
  CONSTRAINT pending_public_registrations_email_format_check
    CHECK (
      char_length(email) BETWEEN 3 AND 254
      AND char_length(split_part(email, '@', 1)) <= 64
      AND email ~ '^[a-z0-9!#$%&''*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
      AND char_length(regexp_replace(split_part(email, '@', 2), '^.*\.', '')) >= 2
      AND regexp_replace(split_part(email, '@', 2), '^.*\.', '') !~ '^[0-9]+$'
    ),
  CONSTRAINT pending_public_registrations_terms_acceptance_pair_check
    CHECK (
      (terms_version IS NULL AND terms_accepted_at IS NULL)
      OR (char_length(terms_version) BETWEEN 1 AND 40 AND terms_accepted_at IS NOT NULL)
    )
);

ALTER TABLE public.pending_public_registrations
  ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.pending_public_registrations
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;
ALTER TABLE public.pending_public_registrations
  DROP CONSTRAINT IF EXISTS pending_public_registrations_terms_acceptance_pair_check;
ALTER TABLE public.pending_public_registrations
  ADD CONSTRAINT pending_public_registrations_terms_acceptance_pair_check
  CHECK (
    (terms_version IS NULL AND terms_accepted_at IS NULL)
    OR (char_length(terms_version) BETWEEN 1 AND 40 AND terms_accepted_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS pending_public_registrations_expiry_idx
  ON public.pending_public_registrations (verification_expires_at);

ALTER TABLE public.pending_public_registrations ENABLE ROW LEVEL SECURITY;

-- No public policies are created. Flask accesses this table only with the
-- server-side service-role key. Explicit grants are kept narrow as defense in
-- depth if project defaults change later.
REVOKE ALL ON TABLE public.pending_public_registrations FROM PUBLIC;
REVOKE ALL ON TABLE public.pending_public_registrations FROM anon;
REVOKE ALL ON TABLE public.pending_public_registrations FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_public_registrations TO service_role;

-- An unfinished registration should never own system activity. Discover every
-- live foreign key that points to public_users.id and inspect only tables that
-- actually exist in this Supabase project. Abort the complete transaction
-- instead of cascading, detaching, or deleting related records. The lock,
-- safety scan, OTP copy, and cleanup share this one atomic operation so SQL
-- editors that manage statement transactions cannot split them apart.
DO $$
DECLARE
  related_reference record;
  related_row_exists boolean;
BEGIN
  -- Prevent the previous application release from inserting another
  -- placeholder during cleanup. Reads can continue; writes wait briefly.
  LOCK TABLE public.public_users IN SHARE ROW EXCLUSIVE MODE;

  FOR related_reference IN
    SELECT
      referencing_namespace.nspname AS schema_name,
      referencing_table.relname AS table_name,
      referencing_column.attname AS column_name
    FROM pg_constraint AS foreign_key
    JOIN pg_class AS referencing_table
      ON referencing_table.oid = foreign_key.conrelid
    JOIN pg_namespace AS referencing_namespace
      ON referencing_namespace.oid = referencing_table.relnamespace
    JOIN unnest(foreign_key.conkey) WITH ORDINALITY AS referencing_key(attnum, position)
      ON true
    JOIN unnest(foreign_key.confkey) WITH ORDINALITY AS referenced_key(attnum, position)
      ON referenced_key.position = referencing_key.position
    JOIN pg_attribute AS referencing_column
      ON referencing_column.attrelid = foreign_key.conrelid
     AND referencing_column.attnum = referencing_key.attnum
    JOIN pg_attribute AS referenced_column
      ON referenced_column.attrelid = foreign_key.confrelid
     AND referenced_column.attnum = referenced_key.attnum
    WHERE foreign_key.contype = 'f'
      AND foreign_key.confrelid = 'public.public_users'::regclass
      AND referenced_column.attname = 'id'
  LOOP
    EXECUTE format(
      'SELECT EXISTS (
         SELECT 1
         FROM %I.%I AS related
         JOIN public.public_users AS candidate
           ON related.%I = candidate.id
         WHERE candidate.email_verified_at IS NULL
           AND coalesce(candidate.auth_provider, ''password'') = ''password''
           AND candidate.last_login_at IS NULL
           AND candidate.onboarding_completed_at IS NULL
       )',
      related_reference.schema_name,
      related_reference.table_name,
      related_reference.column_name
    ) INTO related_row_exists;

    IF related_row_exists THEN
      RAISE EXCEPTION
        'Pending-registration cleanup stopped: a candidate public user is referenced by %.% column %',
        related_reference.schema_name,
        related_reference.table_name,
        related_reference.column_name;
    END IF;
  END LOOP;

  -- Preserve OTP state created by the previous deployment. The application
  -- decides whether its recorded Terms version is still eligible to finish.
  INSERT INTO public.pending_public_registrations (
    email,
    full_name,
    password_hash,
    verification_code_hash,
    verification_expires_at,
    verification_sent_at,
    verification_attempts,
    created_at,
    updated_at
  )
  SELECT
    lower(btrim(email)),
    CASE
      WHEN char_length(btrim(full_name)) BETWEEN 3 AND 160 THEN btrim(full_name)
      ELSE 'New User'
    END,
    password_hash,
    email_verification_token_hash,
    email_verification_expires_at,
    coalesce(email_verification_sent_at, created_at),
    least(greatest(coalesce(email_verification_attempts, 0), 0), 5),
    created_at,
    updated_at
  FROM public.public_users AS legacy
  WHERE email_verified_at IS NULL
    AND coalesce(auth_provider, 'password') = 'password'
    AND last_login_at IS NULL
    AND onboarding_completed_at IS NULL
    AND email_verification_token_hash ~ '^[0-9a-f]{64}$'
    AND email_verification_expires_at IS NOT NULL
    AND email_verification_expires_at > timezone('utc', now())
    AND char_length(lower(btrim(email))) BETWEEN 3 AND 254
    AND char_length(split_part(lower(btrim(email)), '@', 1)) <= 64
    AND char_length(password_hash) BETWEEN 40 AND 512
    AND lower(btrim(email)) ~ '^[a-z0-9!#$%&''*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    AND char_length(regexp_replace(split_part(lower(btrim(email)), '@', 2), '^.*\.', '')) >= 2
    AND regexp_replace(split_part(lower(btrim(email)), '@', 2), '^.*\.', '') !~ '^[0-9]+$'
  ON CONFLICT (email) DO UPDATE SET
    full_name = excluded.full_name,
    password_hash = excluded.password_hash,
    verification_code_hash = excluded.verification_code_hash,
    verification_expires_at = excluded.verification_expires_at,
    verification_sent_at = excluded.verification_sent_at,
    verification_attempts = excluded.verification_attempts,
    updated_at = excluded.updated_at;

  -- Delete exactly the locked, reviewed candidate set. If any unanticipated
  -- restrictive foreign key still exists, PostgreSQL aborts and rolls back the
  -- entire transaction rather than leaving a partially migrated database.
  DELETE FROM public.public_users AS legacy
  WHERE legacy.email_verified_at IS NULL
    AND coalesce(legacy.auth_provider, 'password') = 'password'
    AND legacy.last_login_at IS NULL
    AND legacy.onboarding_completed_at IS NULL;
END;
$$;

COMMIT;
