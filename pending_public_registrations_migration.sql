-- Two-stage public registration.
-- Run this complete file in the Supabase SQL Editor BEFORE deploying the
-- matching application code. Pending signups are private server-side state;
-- a public_users row is created only after a correct, unexpired OTP.
--
-- This migration removes only legacy password-signup placeholders that never
-- verified an email, logged in, or completed onboarding. The candidate IDs are
-- frozen while public_users is write-locked so a concurrent signup cannot be
-- caught by the cleanup. Compatible, still-valid OTP registrations are copied
-- first so they can finish verification after deployment.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pending_public_registrations (
  email text PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 160),
  password_hash text NOT NULL CHECK (char_length(password_hash) BETWEEN 40 AND 512),
  verification_code_hash text NOT NULL CHECK (verification_code_hash ~ '^[0-9a-f]{64}$'),
  verification_expires_at timestamp with time zone NOT NULL,
  verification_sent_at timestamp with time zone NOT NULL,
  verification_attempts integer NOT NULL DEFAULT 0 CHECK (verification_attempts BETWEEN 0 AND 5),
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
    )
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

-- Prevent the previous application release from inserting another placeholder
-- between candidate selection and cleanup. Reads can continue; writes wait only
-- for this short transaction to commit.
LOCK TABLE public.public_users IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE pending_public_registration_cleanup_ids (
  id bigint PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO pending_public_registration_cleanup_ids (id)
SELECT id
FROM public.public_users
WHERE email_verified_at IS NULL
  AND coalesce(auth_provider, 'password') = 'password'
  AND last_login_at IS NULL
  AND onboarding_completed_at IS NULL;

-- An unfinished registration should never own system activity. Abort the
-- complete transaction instead of cascading, detaching, or deleting related
-- records if the live database contains an unexpected relationship.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pending_public_registration_cleanup_ids AS cleanup
    WHERE EXISTS (SELECT 1 FROM public.user_bookmarks AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.tour_bookings AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.community_participation_submissions AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.visitor_feedback AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.heritage_keeper_events AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.heritage_keeper_awards AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.webxr_player_items AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.webxr_player_museum_views AS related WHERE related.user_id = cleanup.id)
       OR EXISTS (SELECT 1 FROM public.analytics_events AS related WHERE related.user_id = cleanup.id)
  ) THEN
    RAISE EXCEPTION 'Pending-registration cleanup stopped: a candidate public user has related system records';
  END IF;
END;
$$;

-- Preserve still-usable OTP attempts created by the previous deployment.
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
JOIN pending_public_registration_cleanup_ids AS cleanup ON cleanup.id = legacy.id
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

-- Delete exactly the frozen, reviewed candidate set. If any unanticipated
-- restrictive foreign key still exists, PostgreSQL aborts and rolls back the
-- entire transaction rather than leaving a partially migrated database.
DELETE FROM public.public_users AS legacy
USING pending_public_registration_cleanup_ids AS cleanup
WHERE legacy.id = cleanup.id;

COMMIT;
