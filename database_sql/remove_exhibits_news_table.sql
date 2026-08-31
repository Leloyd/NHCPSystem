-- Retired legacy feature: Current Exhibits & News.
-- The table is already absent from current_db.sql; this idempotent cleanup is
-- only needed if an older Supabase project still contains the legacy table.
drop table if exists public.exhibits_news cascade;
