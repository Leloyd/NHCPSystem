-- Adds revisioned site-map settings to Virtual Tour Manager environments.
-- Safe to run more than once in the Supabase SQL editor.

ALTER TABLE public.virtual_tour_revisions
  ADD COLUMN IF NOT EXISTS map_config jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.virtual_tour_revisions ADD CONSTRAINT virtual_tour_map_config_object_check
    CHECK (jsonb_typeof(map_config) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reinstall the publish function (including map-config cloning) by running
-- virtual_tour_tables.sql after this small migration.
