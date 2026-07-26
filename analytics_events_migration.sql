-- Analytics & Monitoring Module
-- Run this migration once in the Supabase SQL editor.
--
-- Privacy design:
-- - no raw IP address or full user-agent is stored;
-- - anonymous browser identifiers are irreversibly hashed by Flask;
-- - signed-in user IDs are optional and retained only for aggregate activity;
-- - RLS blocks direct browser access. The Flask service role remains the only
--   writer/reader unless explicit policies are added later.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (
    event_type = any (array[
      'page_view',
      'virtual_tour_opened',
      'tour_scene_viewed',
      'artifact_viewed',
      'ar_session_started',
      'ar_marker_found',
      'ar_puzzle_solved',
      'heritage_trail_started',
      'heritage_trail_stop_viewed',
      'learning_activity_completed',
      'gallery_item_viewed',
      'resource_viewed',
      'webxr_opened'
    ])
  ),
  module text not null check (char_length(module) between 1 and 50),
  target_id text not null default '' check (char_length(target_id) <= 160),
  visitor_hash text not null check (char_length(visitor_hash) = 64),
  user_id bigint references public.public_users(id) on delete set null,
  device_type text not null check (
    device_type = any (array['desktop', 'mobile', 'tablet', 'other'])
  ),
  browser_family text not null default 'Other' check (char_length(browser_family) <= 40),
  os_family text not null default 'Other' check (char_length(os_family) <= 40),
  page_path text not null default '' check (char_length(page_path) <= 300),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 4096
  ),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_type_created_at_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_module_created_at_idx
  on public.analytics_events (module, created_at desc);

create index if not exists analytics_events_target_created_at_idx
  on public.analytics_events (target_id, created_at desc)
  where target_id <> '';

create index if not exists analytics_events_visitor_created_at_idx
  on public.analytics_events (visitor_hash, created_at desc);

create index if not exists analytics_events_user_created_at_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

alter table public.analytics_events enable row level security;

comment on table public.analytics_events is
  'Privacy-minimized visitor engagement events written and read only by the Flask service role.';

