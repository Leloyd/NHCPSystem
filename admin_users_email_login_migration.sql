-- One-time migration: change administrator authentication from username to email.
--
-- IMPORTANT:
-- 1. Replace the example row in admin_email_map with the current username and
--    the administrator's real email address.
-- 2. Add another VALUES row for every additional administrator.
-- 3. Run this file in the Supabase SQL editor before deploying the matching
--    Flask changes.
--
-- The migration is atomic. If a mapping is missing or an email is invalid,
-- PostgreSQL raises an error and rolls back every change.

begin;

alter table public.admin_users
  add column email text;

with admin_email_map (old_username, new_email) as (
  values
    ('admin', 'museum.undergroundnagcarlan@gmail.com')
)
update public.admin_users as admin
set email = lower(btrim(mapping.new_email))
from admin_email_map as mapping
where lower(btrim(admin.username)) = lower(btrim(mapping.old_username));

do $$
begin
  if exists (
    select 1
    from public.admin_users
    where email is null
  ) then
    raise exception
      'Every admin_users row needs an email. Complete admin_email_map before running this migration.';
  end if;

  if exists (
    select 1
    from public.admin_users
    where char_length(email) not between 3 and 254
       or email <> lower(btrim(email))
       or email !~ '^[a-z0-9!#$%&''*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ) then
    raise exception
      'One or more administrator email addresses are invalid.';
  end if;
end;
$$;

alter table public.admin_users
  alter column email set not null,
  add constraint admin_users_email_key unique (email),
  add constraint admin_users_email_normalized_check
    check (email = lower(btrim(email))),
  add constraint admin_users_email_format_check
    check (
      char_length(email) between 3 and 254
      and email ~ '^[a-z0-9!#$%&''*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    );

alter table public.admin_users
  drop column username;

commit;
