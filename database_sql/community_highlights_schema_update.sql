begin;

alter table if exists public.community_highlights
  add column if not exists status text default 'active',
  add column if not exists is_featured boolean default false;

alter table if exists public.community_highlights
  drop constraint if exists community_highlights_category_check,
  drop constraint if exists community_highlights_status_check;

update public.community_highlights
set category = case
      when category = 'Education Program' then 'Museum Programs'
      when category = 'Community Activity' then 'Public Activity'
      else category
    end,
    status = case
      when status in ('active', 'draft', 'archived') then status
      when coalesce(is_published, false) then 'active'
      else 'draft'
    end,
    is_featured = coalesce(is_featured, false),
    is_published = case
      when (
        case
          when status in ('active', 'draft', 'archived') then status
          when coalesce(is_published, false) then 'active'
          else 'draft'
        end
      ) = 'active' then true
      else false
    end;

alter table if exists public.community_highlights
  alter column status set not null,
  alter column is_featured set not null,
  alter column status set default 'active',
  alter column is_featured set default false;

alter table if exists public.community_highlights
  add constraint community_highlights_category_check check (category in ('Museum Programs', 'School Engagement', 'Public Activity', 'Public Advisory')),
  add constraint community_highlights_status_check check (status in ('active', 'draft', 'archived'));

create unique index if not exists community_highlights_single_featured_idx
  on public.community_highlights (is_featured)
  where is_featured is true and status = 'active';

commit;
