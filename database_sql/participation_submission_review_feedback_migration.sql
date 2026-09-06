-- Adds explicit review feedback and a rejected/resubmission state to public
-- participation submissions. Safe to run more than once.

BEGIN;

ALTER TABLE public.community_participation_submissions
  ADD COLUMN IF NOT EXISTS moderation_feedback text NOT NULL DEFAULT ''::text;

ALTER TABLE public.community_participation_submissions
  ADD COLUMN IF NOT EXISTS resubmitted_at timestamp with time zone;

ALTER TABLE public.community_participation_submissions
  DROP CONSTRAINT IF EXISTS community_participation_submissions_status_check;

ALTER TABLE public.community_participation_submissions
  ADD CONSTRAINT community_participation_submissions_status_check
  CHECK (status IN ('pending_verification', 'pending_review', 'active', 'rejected', 'archived'));

ALTER TABLE public.community_participation_submissions
  DROP CONSTRAINT IF EXISTS community_participation_submissions_moderation_feedback_check;

ALTER TABLE public.community_participation_submissions
  ADD CONSTRAINT community_participation_submissions_moderation_feedback_check
  CHECK (char_length(moderation_feedback) <= 2000);

-- Submissions contain private names, email addresses, feedback and files.
-- The browser never queries this table directly; authenticated Flask routes
-- use the server-only service role after checking ownership or admin access.
ALTER TABLE public.community_participation_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.community_participation_submissions FROM PUBLIC;
REVOKE ALL ON TABLE public.community_participation_submissions FROM anon;
REVOKE ALL ON TABLE public.community_participation_submissions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_participation_submissions TO service_role;

COMMIT;
