-- Heritage Keeper progression and completion award.
-- Run this migration once in the Supabase SQL Editor.

begin;

create table if not exists public.heritage_keeper_events (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.public_users(id) on delete cascade,
  source text not null check (source in ('trail', 'ar')),
  item_key text not null check (char_length(item_key) between 2 and 64),
  completed_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint heritage_keeper_events_user_fragment_key unique (user_id, source, item_key)
);

create index if not exists heritage_keeper_events_user_completed_idx
  on public.heritage_keeper_events (user_id, completed_at);

create table if not exists public.heritage_keeper_awards (
  user_id bigint primary key references public.public_users(id) on delete cascade,
  unlocked_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.heritage_keeper_events enable row level security;
alter table public.heritage_keeper_awards enable row level security;

-- No browser-facing policies are created. The Flask server writes through the
-- protected Supabase service role and validates every eligible fragment.

commit;
