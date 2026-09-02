-- Replace the retired Books educational-resource category with Story.
-- Run once in the Supabase SQL Editor before creating or editing Story items.

begin;

alter table public.edu_resources
  drop constraint if exists edu_resources_category_check;

update public.edu_resources
set category = 'Story'
where category = 'Books';

update public.community_participation_submissions
set resource_category = 'Story'
where resource_category = 'Books'
  and submission_type = 'story_submit';

alter table public.edu_resources
  add constraint edu_resources_category_check
  check (category in ('PPT', 'Story', 'DOCS', 'PDF'));

commit;
