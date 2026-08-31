begin;

alter table if exists public.community_highlights
  add column if not exists image_filenames jsonb not null default '[]'::jsonb;

update public.community_highlights
set image_filenames = jsonb_build_array(image_filename)
where image_filename is not null
  and btrim(image_filename) <> ''
  and (
    image_filenames is null
    or jsonb_typeof(image_filenames) <> 'array'
    or jsonb_array_length(image_filenames) = 0
  );

update public.community_highlights
set image_filenames = '[]'::jsonb
where image_filenames is null
   or jsonb_typeof(image_filenames) <> 'array';

alter table if exists public.community_highlights
  alter column image_filenames set default '[]'::jsonb,
  alter column image_filenames set not null;

alter table if exists public.community_highlights
  drop constraint if exists community_highlights_image_filenames_is_array;

alter table if exists public.community_highlights
  add constraint community_highlights_image_filenames_is_array
  check (jsonb_typeof(image_filenames) = 'array');

commit;
