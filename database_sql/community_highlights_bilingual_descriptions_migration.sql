begin;

alter table if exists public.community_highlights
  add column if not exists short_description_tl text not null default '',
  add column if not exists long_description_tl text not null default '';

update public.community_highlights
set
  short_description_tl = coalesce(short_description_tl, ''),
  long_description_tl = coalesce(long_description_tl, '');

alter table if exists public.community_highlights
  alter column short_description_tl set default '',
  alter column short_description_tl set not null,
  alter column long_description_tl set default '',
  alter column long_description_tl set not null;

commit;
