-- ============================================================================
-- User profile & settings — adds avatar, theme, and language preferences to
-- the existing public_users table. Safe to run more than once.
--
-- Run this in the Supabase SQL editor (or psql) against the same project the
-- app uses. No data is removed; only new nullable/defaulted columns are added.
-- ============================================================================

alter table public.public_users
  add column if not exists profile_picture text,
  add column if not exists theme_preference text not null default 'light',
  add column if not exists language_preference text not null default 'en';

-- Keep the preference columns to known values.
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'public_users' and constraint_name = 'public_users_theme_preference_check'
  ) then
    alter table public.public_users
      add constraint public_users_theme_preference_check
      check (theme_preference in ('light', 'dark'));
  end if;

  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'public_users' and constraint_name = 'public_users_language_preference_check'
  ) then
    alter table public.public_users
      add constraint public_users_language_preference_check
      check (language_preference in ('en', 'tl'));
  end if;
end $$;

-- Notes:
--   profile_picture holds EITHER a full https URL (e.g. the Google account
--   photo captured at first sign-in) OR a Supabase Storage object path for a
--   user-uploaded avatar (e.g. "avatars/juan-20260726...jpg").
