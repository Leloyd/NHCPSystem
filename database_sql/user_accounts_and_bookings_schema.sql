CREATE TABLE IF NOT EXISTS public.public_users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  email_verified_at timestamp with time zone,
  email_verification_token_hash text,
  email_verification_expires_at timestamp with time zone,
  email_verification_sent_at timestamp with time zone,
  email_verification_attempts integer NOT NULL DEFAULT 0,
  onboarding_completed_at timestamp with time zone,
  website_use_case text NOT NULL DEFAULT ''::text,
  profile_roles text NOT NULL DEFAULT '[]'::text,
  location_text text NOT NULL DEFAULT ''::text,
  country_text text NOT NULL DEFAULT ''::text,
  province_text text NOT NULL DEFAULT ''::text,
  city_text text NOT NULL DEFAULT ''::text,
  auth_provider text NOT NULL DEFAULT 'password'::text,
  oauth_subject text,
  local_password_enabled boolean NOT NULL DEFAULT true,
  password_reset_token_hash text,
  password_reset_expires_at timestamp with time zone,
  security_code_hash text,
  security_code_expires_at timestamp with time zone,
  security_code_sent_at timestamp with time zone,
  security_code_attempts integer NOT NULL DEFAULT 0,
  terms_version text,
  terms_accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS public_users_email_unique_idx ON public.public_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS public_users_username_unique_idx ON public.public_users (lower(username));

ALTER TABLE public.public_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_users FROM PUBLIC;
REVOKE ALL ON TABLE public.public_users FROM anon;
REVOKE ALL ON TABLE public.public_users FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_users TO service_role;

CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.public_users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['online_gallery'::text])),
  item_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS user_bookmarks_unique_item_idx ON public.user_bookmarks (user_id, item_type, item_id);
CREATE INDEX IF NOT EXISTS user_bookmarks_user_idx ON public.user_bookmarks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tour_bookings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.public_users(id) ON DELETE CASCADE,
  display_title text NOT NULL,
  scheduled_tour text NOT NULL DEFAULT ''::text,
  booking_type text NOT NULL CHECK (booking_type = ANY (ARRAY['school_group'::text, 'community_group'::text, 'family_group'::text, 'research_visit'::text, 'general_tour'::text])),
  visit_date date NOT NULL,
  rescheduled_visit_date date,
  start_time text NOT NULL,
  end_time text NOT NULL,
  group_size integer NOT NULL CHECK (group_size >= 1 AND group_size <= 500),
  institution_name text NOT NULL DEFAULT ''::text,
  contact_person text NOT NULL DEFAULT ''::text,
  contact_number text NOT NULL DEFAULT ''::text,
  tour_agency text NOT NULL DEFAULT ''::text,
  male_visitors integer NOT NULL DEFAULT 0 CHECK (male_visitors >= 0),
  female_visitors integer NOT NULL DEFAULT 0 CHECK (female_visitors >= 0),
  pwd_visitors integer NOT NULL DEFAULT 0 CHECK (pwd_visitors >= 0),
  total_visitors integer NOT NULL DEFAULT 0 CHECK (total_visitors >= 0 AND total_visitors <= 500),
  purpose text NOT NULL,
  notes text NOT NULL DEFAULT ''::text,
  location text NOT NULL DEFAULT 'Museo ng Libingan sa Ilalim ng Lupa'::text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'rescheduled'::text])),
  admin_notes text NOT NULL DEFAULT ''::text,
  decision_reason text NOT NULL DEFAULT ''::text,
  reviewed_at timestamp with time zone,
  reviewed_by text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS tour_bookings_user_idx ON public.tour_bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tour_bookings_status_date_idx ON public.tour_bookings (status, visit_date, start_time);

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS email_verification_token_hash text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS email_verification_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS website_use_case text NOT NULL DEFAULT ''::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS profile_roles text NOT NULL DEFAULT '[]'::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS location_text text NOT NULL DEFAULT ''::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS country_text text NOT NULL DEFAULT ''::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS province_text text NOT NULL DEFAULT ''::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS city_text text NOT NULL DEFAULT ''::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'password'::text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS oauth_subject text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS local_password_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS security_code_hash text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS security_code_expires_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS security_code_sent_at timestamp with time zone;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS security_code_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS terms_version text;

ALTER TABLE public.public_users
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

ALTER TABLE public.public_users
  DROP CONSTRAINT IF EXISTS public_users_terms_acceptance_pair_check;

ALTER TABLE public.public_users
  ADD CONSTRAINT public_users_terms_acceptance_pair_check
  CHECK (
    (terms_version IS NULL AND terms_accepted_at IS NULL)
    OR (char_length(terms_version) BETWEEN 1 AND 40 AND terms_accepted_at IS NOT NULL)
  );

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
INSERT INTO public.public_terms_acceptances (user_id, terms_version, accepted_at)
SELECT id, terms_version, terms_accepted_at
FROM public.public_users
WHERE terms_version IS NOT NULL AND terms_accepted_at IS NOT NULL
ON CONFLICT (user_id, terms_version) DO NOTHING;

CREATE INDEX IF NOT EXISTS public_users_verification_token_idx ON public.public_users (email_verification_token_hash);
CREATE INDEX IF NOT EXISTS public_users_password_reset_token_idx ON public.public_users (password_reset_token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS public_users_google_subject_unique_idx ON public.public_users (oauth_subject) WHERE oauth_subject IS NOT NULL;

ALTER TABLE public.community_participation_submissions
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.public_users(id) ON DELETE SET NULL;

ALTER TABLE public.community_participation_submissions
  ALTER COLUMN status SET DEFAULT 'pending_review'::text;

ALTER TABLE public.visitor_feedback
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.public_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS community_participation_submissions_user_idx ON public.community_participation_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS visitor_feedback_user_idx ON public.visitor_feedback (user_id, created_at DESC);
