begin;

alter table if exists public.community_events
  add column if not exists category text default 'Booked Tour (former Orientation)',
  add column if not exists event_time text default 'To be announced',
  add column if not exists location text default 'Museo ng Libingan sa Ilalim ng Lupa',
  add column if not exists status text default 'active';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_events'
      and column_name = 'long_description'
  ) then
    execute 'update public.community_events set long_description = coalesce(nullif(trim(coalesce(long_description, '''')), ''''), short_description)';
    execute 'alter table public.community_events alter column long_description drop not null';
  end if;
end $$;

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

insert into public.community_events (
  title,
  slug,
  category,
  event_date,
  event_time,
  location,
  short_description,
  status,
  is_published
)
values
  (
    'School Heritage Booked Tour',
    'school-heritage-booked-tour',
    'Booked Tour (former Orientation)',
    '2026-06-10',
    '9:00 AM - 11:00 AM',
    'Museo ng Libingan sa Ilalim ng Lupa',
    'A guided booked tour for student visitors exploring the museum grounds, site history, and orientation stops.',
    'active',
    true
  ),
  (
    'Barangay Community Story Circle',
    'barangay-community-story-circle',
    'Community Gathering',
    '2026-06-15',
    '2:00 PM - 4:00 PM',
    'Community Hall',
    'Residents are invited to share local memories and community narratives connected to the heritage site.',
    'active',
    true
  ),
  (
    'Student Local History Quiz Bee',
    'student-local-history-quiz-bee',
    'Student Activity',
    '2026-06-20',
    '1:00 PM - 3:00 PM',
    'Learning Activity Room',
    'A student-focused quiz activity designed to reinforce key historical facts and museum learning prompts.',
    'draft',
    false
  ),
  (
    'Underground Cemetery Heritage Talk',
    'underground-cemetery-heritage-talk',
    'Heritage Session',
    '2026-06-25',
    '10:00 AM - 12:00 PM',
    'Main Program Hall',
    'A public heritage session discussing the history, meaning, and preservation of the Underground Cemetery.',
    'active',
    true
  ),
  (
    'Cultural Mapping Workshop',
    'cultural-mapping-workshop',
    'Workshop',
    '2026-06-30',
    '8:30 AM - 11:30 AM',
    'Workshop Room',
    'Participants will learn how to document important places, stories, and traditions through a cultural mapping workshop.',
    'archived',
    false
  )
on conflict (slug) do update
set
  title = excluded.title,
  category = excluded.category,
  event_date = excluded.event_date,
  event_time = excluded.event_time,
  location = excluded.location,
  short_description = excluded.short_description,
  status = excluded.status,
  is_published = excluded.is_published;

commit;
