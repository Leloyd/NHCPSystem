-- Remove the retired standalone Community Events feature.
-- The live Community Participation calendar now reads confirmed tour bookings.

begin;

drop table if exists public.community_events;

commit;
