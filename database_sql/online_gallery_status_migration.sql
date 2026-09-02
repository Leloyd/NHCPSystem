begin;

alter table public.online_gallery_items
  add column if not exists status text;

update public.online_gallery_items
set status = case
  when coalesce(is_published, false) then 'published'
  else 'draft'
end
where status is null
   or status not in ('published', 'draft', 'archived');

update public.online_gallery_items
set is_published = (status = 'published')
where is_published is distinct from (status = 'published');

alter table public.online_gallery_items
  alter column status set default 'draft',
  alter column status set not null,
  alter column is_published set default false;

alter table public.online_gallery_items
  drop constraint if exists online_gallery_items_status_check;

alter table public.online_gallery_items
  add constraint online_gallery_items_status_check
  check (status in ('published', 'draft', 'archived'));

alter table public.online_gallery_items
  drop constraint if exists online_gallery_items_publication_check;

alter table public.online_gallery_items
  add constraint online_gallery_items_publication_check
  check ((status = 'published') = is_published);

create index if not exists online_gallery_items_status_idx
  on public.online_gallery_items (status);

commit;
