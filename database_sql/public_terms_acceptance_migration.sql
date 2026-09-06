-- Records the exact Terms and Conditions version accepted during new public
-- account registration. Existing accounts remain valid and keep NULL values.
-- Run this complete file in the Supabase SQL Editor BEFORE deploying the
-- matching application release. Safe to run more than once.

BEGIN;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS terms_version text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

ALTER TABLE public.pending_public_registrations
  ADD COLUMN IF NOT EXISTS terms_version text;

ALTER TABLE public.pending_public_registrations
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

ALTER TABLE public.public_users
  DROP CONSTRAINT IF EXISTS public_users_terms_acceptance_pair_check;
ALTER TABLE public.public_users
  ADD CONSTRAINT public_users_terms_acceptance_pair_check
  CHECK (
    (terms_version IS NULL AND terms_accepted_at IS NULL)
    OR (
      char_length(terms_version) BETWEEN 1 AND 40
      AND terms_accepted_at IS NOT NULL
    )
  );

ALTER TABLE public.pending_public_registrations
  DROP CONSTRAINT IF EXISTS pending_public_registrations_terms_acceptance_pair_check;
ALTER TABLE public.pending_public_registrations
  ADD CONSTRAINT pending_public_registrations_terms_acceptance_pair_check
  CHECK (
    (terms_version IS NULL AND terms_accepted_at IS NULL)
    OR (
      char_length(terms_version) BETWEEN 1 AND 40
      AND terms_accepted_at IS NOT NULL
    )
  );

-- The pending table remains private server-side state. These statements are
-- repeated as defense in depth and do not create any browser access policy.
ALTER TABLE public.pending_public_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pending_public_registrations FROM PUBLIC;
REVOKE ALL ON TABLE public.pending_public_registrations FROM anon;
REVOKE ALL ON TABLE public.pending_public_registrations FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_public_registrations TO service_role;

COMMIT;
