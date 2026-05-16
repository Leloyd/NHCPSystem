CREATE TABLE IF NOT EXISTS public.public_users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone_number text NOT NULL DEFAULT ''::text,
  organization text NOT NULL DEFAULT ''::text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS public_users_email_unique_idx ON public.public_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS public_users_username_unique_idx ON public.public_users (lower(username));

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
  booking_type text NOT NULL CHECK (booking_type = ANY (ARRAY['school_group'::text, 'community_group'::text, 'family_group'::text, 'research_visit'::text, 'general_tour'::text])),
  visit_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  group_size integer NOT NULL CHECK (group_size >= 1 AND group_size <= 500),
  institution_name text NOT NULL DEFAULT ''::text,
  contact_number text NOT NULL DEFAULT ''::text,
  purpose text NOT NULL,
  notes text NOT NULL DEFAULT ''::text,
  location text NOT NULL DEFAULT 'Museo ng Libingan sa Ilalim ng Lupa'::text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  admin_notes text NOT NULL DEFAULT ''::text,
  reviewed_at timestamp with time zone,
  reviewed_by text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS tour_bookings_user_idx ON public.tour_bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tour_bookings_status_date_idx ON public.tour_bookings (status, visit_date, start_time);

ALTER TABLE public.community_participation_submissions
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.public_users(id) ON DELETE SET NULL;

ALTER TABLE public.community_participation_submissions
  ALTER COLUMN status SET DEFAULT 'pending_review'::text;

ALTER TABLE public.visitor_feedback
  ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES public.public_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS community_participation_submissions_user_idx ON public.community_participation_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS visitor_feedback_user_idx ON public.visitor_feedback (user_id, created_at DESC);
