-- Adds an administrator-controlled reading time to each community highlight.
-- Existing rows remain NULL and continue using the automatic word-count
-- estimate until an administrator edits and saves the highlight.

ALTER TABLE public.community_highlights
  ADD COLUMN IF NOT EXISTS read_time_minutes integer;

DO $$ BEGIN
  ALTER TABLE public.community_highlights
    ADD CONSTRAINT community_highlights_read_time_minutes_check
    CHECK (read_time_minutes BETWEEN 1 AND 120);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
