-- Persistent, per-administrator notification inbox for public submissions.
-- Run this file once in the Supabase SQL editor before using the admin bell.

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_email text NOT NULL REFERENCES public.admin_users(email) ON UPDATE CASCADE ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN ('tour_booking', 'teacher_submission', 'story_submission', 'visitor_feedback')
  ),
  source_id bigint NOT NULL CHECK (source_id > 0),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 180),
  message text NOT NULL DEFAULT ''::text CHECK (char_length(message) <= 1200),
  target_url text NOT NULL CHECK (
    char_length(target_url) BETWEEN 9 AND 500
    AND target_url LIKE '/_admin/%'
  ),
  read_at timestamp with time zone,
  emailed_at timestamp with time zone,
  email_error text NOT NULL DEFAULT ''::text CHECK (char_length(email_error) <= 500),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (recipient_email, event_type, source_id)
);

CREATE INDEX IF NOT EXISTS admin_notifications_recipient_created_idx
  ON public.admin_notifications (recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_notifications_recipient_unread_idx
  ON public.admin_notifications (recipient_email, created_at DESC)
  WHERE read_at IS NULL;

-- Browser clients cannot read or mutate this table directly. All access goes
-- through authenticated Flask admin routes using the Supabase service role.
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
