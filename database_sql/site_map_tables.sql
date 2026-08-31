-- Revisioned Site Map override.
-- The packaged JSON, aerial image, 360 panorama, hotspot media, and intro
-- audio remain the protected Original. A row exists here only after an
-- administrator chooses to customize that Original.

CREATE TABLE IF NOT EXISTS public.site_maps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  is_system_original boolean NOT NULL DEFAULT true,
  published_revision_id bigint,
  draft_revision_id bigint,
  created_by text NOT NULL DEFAULT ''::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS site_maps_one_system_original
  ON public.site_maps (is_system_original) WHERE is_system_original;

CREATE TABLE IF NOT EXISTS public.site_map_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_map_id bigint NOT NULL REFERENCES public.site_maps(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'superseded')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config) = 'object'),
  created_by text NOT NULL DEFAULT ''::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (site_map_id, version_number)
);

DO $$ BEGIN
  ALTER TABLE public.site_maps ADD CONSTRAINT site_maps_published_revision_fkey
    FOREIGN KEY (published_revision_id) REFERENCES public.site_map_revisions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.site_maps ADD CONSTRAINT site_maps_draft_revision_fkey
    FOREIGN KEY (draft_revision_id) REFERENCES public.site_map_revisions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.site_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_map_revisions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.publish_site_map_revision(p_site_map_id bigint, p_admin text DEFAULT '')
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_map public.site_maps%ROWTYPE;
  v_next_revision_id bigint;
  v_next_version integer;
BEGIN
  SELECT * INTO v_map FROM public.site_maps WHERE id = p_site_map_id FOR UPDATE;
  IF NOT FOUND OR v_map.draft_revision_id IS NULL THEN
    RAISE EXCEPTION 'Site Map draft not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.site_map_revisions
    WHERE id = v_map.draft_revision_id
      AND jsonb_typeof(config) = 'object'
      AND jsonb_array_length(coalesce(config -> 'hotspots', '[]'::jsonb)) > 0
  ) THEN
    RAISE EXCEPTION 'The Site Map draft must contain at least one hotspot';
  END IF;

  IF v_map.published_revision_id IS NOT NULL AND v_map.published_revision_id <> v_map.draft_revision_id THEN
    UPDATE public.site_map_revisions
      SET state = 'superseded', updated_at = timezone('utc', now())
      WHERE id = v_map.published_revision_id;
  END IF;

  UPDATE public.site_map_revisions
    SET state = 'published', published_at = timezone('utc', now()), updated_at = timezone('utc', now())
    WHERE id = v_map.draft_revision_id;

  SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
    FROM public.site_map_revisions WHERE site_map_id = p_site_map_id;

  INSERT INTO public.site_map_revisions (site_map_id, version_number, state, config, created_by)
    SELECT p_site_map_id, v_next_version, 'draft', config, p_admin
    FROM public.site_map_revisions WHERE id = v_map.draft_revision_id
    RETURNING id INTO v_next_revision_id;

  UPDATE public.site_maps SET
    published_revision_id = v_map.draft_revision_id,
    draft_revision_id = v_next_revision_id,
    published_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
    WHERE id = p_site_map_id;

  RETURN v_next_revision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_site_map_revision(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_site_map_revision(bigint, text) FROM anon;
REVOKE ALL ON FUNCTION public.publish_site_map_revision(bigint, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_site_map_revision(bigint, text) TO service_role;
