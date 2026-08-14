-- Remove the retired Grade Level metadata from Educational Resources and
-- Community Participation submissions.
-- Run once in the Supabase SQL Editor when deploying the matching code update.

begin;

alter table public.edu_resources
  drop column if exists grade_level;

alter table public.community_participation_submissions
  drop column if exists grade_level;

commit;
