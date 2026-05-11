begin;

alter table if exists public.community_events
  add column if not exists category text default 'Booked Tour (former Orientation)',
  add column if not exists event_time text default 'To be announced',
  add column if not exists location text default 'Museo ng Libingan sa Ilalim ng Lupa',
  add column if not exists status text default 'active';

alter table if exists public.community_events
  drop constraint if exists community_events_category_check,
  drop constraint if exists community_events_status_check;

update public.community_events
set category = case
      when title ilike '%walkthrough%' or title ilike '%orientation%' or title ilike '%tour%' then 'Booked Tour (former Orientation)'
      when title ilike '%forum%' or title ilike '%community%' or title ilike '%gathering%' then 'Community Gathering'
      when title ilike '%quiz%' or title ilike '%student%' then 'Student Activity'
      when title ilike '%heritage%' or title ilike '%history%' then 'Heritage Session'
      else 'Workshop'
    end,
    event_time = nullif(trim(coalesce(event_time, '')), ''),
    location = nullif(trim(coalesce(location, '')), ''),
    status = case
      when status in ('active', 'draft', 'archived') then status
      when coalesce(is_published, false) then 'active'
      else 'draft'
    end;

update public.community_events
set event_time = coalesce(event_time, 'To be announced'),
    location = coalesce(location, 'Museo ng Libingan sa Ilalim ng Lupa'),
    is_published = case when status = 'active' then true else false end;

alter table if exists public.community_events
  alter column category set not null,
  alter column event_time set not null,
  alter column location set not null,
  alter column status set not null,
  alter column category set default 'Booked Tour (former Orientation)',
  alter column event_time set default 'To be announced',
  alter column location set default 'Museo ng Libingan sa Ilalim ng Lupa',
  alter column status set default 'active';

alter table if exists public.community_events
  add constraint community_events_category_check check (category in ('Booked Tour (former Orientation)', 'Community Gathering', 'Student Activity', 'Heritage Session', 'Workshop')),
  add constraint community_events_status_check check (status in ('active', 'draft', 'archived'));

commit;
