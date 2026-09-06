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

-- Preserve an append-only audit record independently of the current account
-- columns. The application cannot update this table directly; the trigger
-- records a version when public_users receives a valid acceptance pair.
CREATE TABLE IF NOT EXISTS public.public_terms_acceptances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.public_users(id) ON DELETE CASCADE,
  terms_version text NOT NULL CHECK (char_length(terms_version) BETWEEN 1 AND 40),
  accepted_at timestamp with time zone NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, terms_version)
);

CREATE INDEX IF NOT EXISTS public_terms_acceptances_user_time_idx
  ON public.public_terms_acceptances (user_id, accepted_at DESC);

ALTER TABLE public.public_terms_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_terms_acceptances FROM PUBLIC;
REVOKE ALL ON TABLE public.public_terms_acceptances FROM anon;
REVOKE ALL ON TABLE public.public_terms_acceptances FROM authenticated;
REVOKE ALL ON TABLE public.public_terms_acceptances FROM service_role;
GRANT SELECT ON TABLE public.public_terms_acceptances TO service_role;

CREATE OR REPLACE FUNCTION public.capture_public_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.terms_version IS NOT NULL AND NEW.terms_accepted_at IS NOT NULL THEN
    INSERT INTO public.public_terms_acceptances (user_id, terms_version, accepted_at)
    VALUES (NEW.id, NEW.terms_version, NEW.terms_accepted_at)
    ON CONFLICT (user_id, terms_version) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_public_terms_acceptance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_public_terms_acceptance() FROM anon;
REVOKE ALL ON FUNCTION public.capture_public_terms_acceptance() FROM authenticated;

DROP TRIGGER IF EXISTS capture_public_terms_acceptance_on_user ON public.public_users;
CREATE TRIGGER capture_public_terms_acceptance_on_user
AFTER INSERT OR UPDATE OF terms_version, terms_accepted_at ON public.public_users
FOR EACH ROW EXECUTE FUNCTION public.capture_public_terms_acceptance();

-- Backfill any accounts that accepted before this history table was added.
INSERT INTO public.public_terms_acceptances (user_id, terms_version, accepted_at)
SELECT id, terms_version, terms_accepted_at
FROM public.public_users
WHERE terms_version IS NOT NULL AND terms_accepted_at IS NOT NULL
ON CONFLICT (user_id, terms_version) DO NOTHING;

COMMIT;
