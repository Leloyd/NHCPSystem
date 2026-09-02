-- Public account email OTP, Google identity binding, and password-security fields.
-- Run this migration once in the Supabase SQL Editor before deploying the matching app code.

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email_verification_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oauth_subject text,
  ADD COLUMN IF NOT EXISTS local_password_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS security_code_hash text,
  ADD COLUMN IF NOT EXISTS security_code_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS security_code_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS security_code_attempts integer NOT NULL DEFAULT 0;

-- Google accounts created before this migration contain a random, unusable
-- password hash. Mark them accurately so Settings offers the secure
-- email-code flow for creating a real local password.
UPDATE public.public_users
SET local_password_enabled = false
WHERE auth_provider = 'google'
  AND oauth_subject IS NULL;

ALTER TABLE public.public_users
  DROP CONSTRAINT IF EXISTS public_users_email_verification_attempts_check,
  ADD CONSTRAINT public_users_email_verification_attempts_check
    CHECK (email_verification_attempts >= 0 AND email_verification_attempts <= 5),
  DROP CONSTRAINT IF EXISTS public_users_security_code_attempts_check,
  ADD CONSTRAINT public_users_security_code_attempts_check
    CHECK (security_code_attempts >= 0 AND security_code_attempts <= 5);

CREATE UNIQUE INDEX IF NOT EXISTS public_users_google_subject_unique_idx
  ON public.public_users (oauth_subject)
  WHERE oauth_subject IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_users_email_verification_expiry_idx
  ON public.public_users (email_verification_expires_at)
  WHERE email_verification_token_hash IS NOT NULL;

