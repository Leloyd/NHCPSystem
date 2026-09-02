-- Remove the retired Heritage Keeper certificate code while preserving each
-- user's completion-award record and original unlock timestamp.
-- Run this migration once in the Supabase SQL Editor.

begin;

alter table public.heritage_keeper_awards
  drop constraint if exists heritage_keeper_awards_certificate_code_check;

alter table public.heritage_keeper_awards
  drop constraint if exists heritage_keeper_awards_certificate_code_key;

alter table public.heritage_keeper_awards
  drop column if exists certificate_code;

commit;
