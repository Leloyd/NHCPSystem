-- Persistent inventory and the three-piece 3D Environment restoration seal.
-- Run once in the Supabase SQL Editor.

begin;

create table if not exists public.webxr_player_items (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.public_users(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 3 and 80),
  status text not null default 'inventory' check (status in ('inventory', 'deposited')),
  acquired_scene text not null check (acquired_scene in ('museum', 'church', 'underground')),
  acquired_at timestamp with time zone not null default timezone('utc'::text, now()),
  deposited_at timestamp with time zone,
  constraint webxr_player_items_user_item_key unique (user_id, item_key)
);

create index if not exists webxr_player_items_user_status_idx
  on public.webxr_player_items (user_id, status);

create table if not exists public.webxr_player_museum_views (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.public_users(id) on delete cascade,
  hotspot_key text not null check (char_length(hotspot_key) between 3 and 100),
  viewed_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint webxr_player_museum_views_user_hotspot_key unique (user_id, hotspot_key)
);

create index if not exists webxr_player_museum_views_user_idx
  on public.webxr_player_museum_views (user_id);

alter table public.heritage_keeper_events
  drop constraint if exists heritage_keeper_events_source_check;

alter table public.heritage_keeper_events
  add constraint heritage_keeper_events_source_check
  check (source in ('trail', 'ar', 'webxr'));

commit;
