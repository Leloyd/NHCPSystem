begin;

alter table if exists public.tour_bookings
  add column if not exists scheduled_tour text default ''::text,
  add column if not exists contact_person text default ''::text,
  add column if not exists tour_agency text default ''::text,
  add column if not exists male_visitors integer default 0,
  add column if not exists female_visitors integer default 0,
  add column if not exists pwd_visitors integer default 0,
  add column if not exists total_visitors integer default 0,
  add column if not exists decision_reason text default ''::text,
  add column if not exists rescheduled_visit_date date;

update public.tour_bookings
set scheduled_tour = coalesce(nullif(trim(coalesce(scheduled_tour, '')), ''), nullif(trim(coalesce(display_title, '')), ''), 'Museum Tour Booking'),
    contact_person = coalesce(nullif(trim(coalesce(contact_person, '')), ''), ''),
    tour_agency = coalesce(nullif(trim(coalesce(tour_agency, '')), ''), ''),
    male_visitors = greatest(coalesce(male_visitors, 0), 0),
    female_visitors = greatest(coalesce(female_visitors, 0), 0),
    pwd_visitors = greatest(coalesce(pwd_visitors, 0), 0),
    total_visitors = case
      when coalesce(total_visitors, 0) > 0 then total_visitors
      when coalesce(group_size, 0) > 0 then group_size
      else 1
    end,
    decision_reason = coalesce(decision_reason, ''),
    start_time = coalesce(start_time, ''),
    end_time = coalesce(end_time, ''),
    status = case
      when status = 'approved' then 'confirmed'
      when status = 'rejected' then 'cancelled'
      when status in ('pending', 'confirmed', 'cancelled', 'rescheduled') then status
      else 'pending'
    end;

alter table if exists public.tour_bookings
  alter column scheduled_tour set not null,
  alter column scheduled_tour set default ''::text,
  alter column contact_person set not null,
  alter column contact_person set default ''::text,
  alter column tour_agency set not null,
  alter column tour_agency set default ''::text,
  alter column male_visitors set not null,
  alter column male_visitors set default 0,
  alter column female_visitors set not null,
  alter column female_visitors set default 0,
  alter column pwd_visitors set not null,
  alter column pwd_visitors set default 0,
  alter column total_visitors set not null,
  alter column total_visitors set default 0,
  alter column decision_reason set not null,
  alter column decision_reason set default ''::text,
  alter column start_time set default ''::text,
  alter column end_time set default ''::text,
  alter column status set default 'pending'::text;

alter table if exists public.tour_bookings
  drop constraint if exists tour_bookings_status_check;

alter table if exists public.tour_bookings
  add constraint tour_bookings_status_check check (status in ('pending', 'confirmed', 'cancelled', 'rescheduled')),
  add constraint tour_bookings_male_visitors_check check (male_visitors >= 0),
  add constraint tour_bookings_female_visitors_check check (female_visitors >= 0),
  add constraint tour_bookings_pwd_visitors_check check (pwd_visitors >= 0),
  add constraint tour_bookings_total_visitors_check check (total_visitors >= 0 and total_visitors <= 500);

commit;
