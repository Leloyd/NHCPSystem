-- Database-backed 360 virtual-tour environments.
-- Run this file once in the Supabase SQL editor before using the admin module.

CREATE TABLE IF NOT EXISTS public.virtual_tours (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_en text NOT NULL CHECK (char_length(title_en) BETWEEN 2 AND 120),
  title_tl text NOT NULL DEFAULT ''::text CHECK (char_length(title_tl) <= 120),
  description_en text NOT NULL DEFAULT ''::text CHECK (char_length(description_en) <= 600),
  description_tl text NOT NULL DEFAULT ''::text CHECK (char_length(description_tl) <= 600),
  captured_on date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_system_original boolean NOT NULL DEFAULT false,
  published_revision_id bigint,
  draft_revision_id bigint,
  sort_order integer NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT ''::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Keep upgrades idempotent for projects that created this table before the
-- panorama capture date was added.
ALTER TABLE public.virtual_tours ADD COLUMN IF NOT EXISTS captured_on date;
UPDATE public.virtual_tours
SET captured_on = DATE '2026-04-16'
WHERE is_system_original AND captured_on IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS virtual_tours_one_system_original
  ON public.virtual_tours (is_system_original) WHERE is_system_original;

CREATE TABLE IF NOT EXISTS public.virtual_tour_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tour_id bigint NOT NULL REFERENCES public.virtual_tours(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('baseline', 'draft', 'published', 'superseded')),
  created_by text NOT NULL DEFAULT ''::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (tour_id, version_number)
);

DO $$ BEGIN
  ALTER TABLE public.virtual_tours ADD CONSTRAINT virtual_tours_published_revision_fkey
    FOREIGN KEY (published_revision_id) REFERENCES public.virtual_tour_revisions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.virtual_tours ADD CONSTRAINT virtual_tours_draft_revision_fkey
    FOREIGN KEY (draft_revision_id) REFERENCES public.virtual_tour_revisions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.virtual_tour_scenes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revision_id bigint NOT NULL REFERENCES public.virtual_tour_revisions(id) ON DELETE CASCADE,
  scene_key text NOT NULL CHECK (scene_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text NOT NULL CHECK (char_length(name_en) BETWEEN 2 AND 120),
  name_tl text NOT NULL DEFAULT ''::text CHECK (char_length(name_tl) <= 120),
  panorama_path text NOT NULL,
  panorama_width integer NOT NULL CHECK (panorama_width >= 1024),
  panorama_height integer NOT NULL CHECK (panorama_height >= 512),
  panorama_mime text NOT NULL DEFAULT 'image/jpeg' CHECK (panorama_mime IN ('image/jpeg', 'image/png', 'image/webp')),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  initial_pitch numeric(7,2) NOT NULL DEFAULT 0 CHECK (initial_pitch BETWEEN -90 AND 90),
  initial_yaw numeric(7,2) NOT NULL DEFAULT 0 CHECK (initial_yaw BETWEEN -180 AND 180),
  initial_hfov numeric(6,2) NOT NULL DEFAULT 100 CHECK (initial_hfov BETWEEN 30 AND 150),
  is_start_scene boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (revision_id, scene_key),
  CHECK (abs((panorama_width::numeric / panorama_height::numeric) - 2.0) <= 0.02)
);

CREATE UNIQUE INDEX IF NOT EXISTS virtual_tour_one_start_scene_per_revision
  ON public.virtual_tour_scenes (revision_id) WHERE is_start_scene;

CREATE TABLE IF NOT EXISTS public.virtual_tour_hotspots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revision_id bigint NOT NULL REFERENCES public.virtual_tour_revisions(id) ON DELETE CASCADE,
  scene_id bigint NOT NULL REFERENCES public.virtual_tour_scenes(id) ON DELETE CASCADE,
  hotspot_type text NOT NULL CHECK (hotspot_type IN ('item', 'navigation')),
  name_en text NOT NULL CHECK (char_length(name_en) BETWEEN 2 AND 120),
  name_tl text NOT NULL DEFAULT ''::text CHECK (char_length(name_tl) <= 120),
  pitch numeric(7,2) NOT NULL CHECK (pitch BETWEEN -90 AND 90),
  yaw numeric(7,2) NOT NULL CHECK (yaw BETWEEN -180 AND 180),
  target_scene_id bigint REFERENCES public.virtual_tour_scenes(id) ON DELETE RESTRICT,
  target_pitch numeric(7,2) CHECK (target_pitch BETWEEN -90 AND 90),
  target_yaw numeric(7,2) CHECK (target_yaw BETWEEN -180 AND 180),
  target_hfov numeric(6,2) CHECK (target_hfov BETWEEN 30 AND 150),
  image_path text,
  glb_path text,
  subtitle_en text NOT NULL DEFAULT ''::text CHECK (char_length(subtitle_en) <= 5000),
  subtitle_tl text NOT NULL DEFAULT ''::text CHECK (char_length(subtitle_tl) <= 5000),
  audio_en_path text,
  audio_tl_path text,
  tts_voice_id text NOT NULL DEFAULT ''::text,
  tts_model_id text NOT NULL DEFAULT ''::text,
  nested_hotspots jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(nested_hotspots) = 'array'),
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CHECK (
    (hotspot_type = 'navigation' AND target_scene_id IS NOT NULL)
    OR (hotspot_type = 'item' AND target_scene_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS virtual_tour_scenes_revision_idx ON public.virtual_tour_scenes(revision_id, sort_order);
CREATE INDEX IF NOT EXISTS virtual_tour_hotspots_scene_idx ON public.virtual_tour_hotspots(scene_id, sort_order);

ALTER TABLE public.virtual_tour_hotspots ADD COLUMN IF NOT EXISTS nested_hotspots jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.virtual_tour_hotspots ADD CONSTRAINT virtual_tour_nested_hotspots_array_check
    CHECK (jsonb_typeof(nested_hotspots) = 'array');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- This project performs writes through authenticated Flask admin routes using
-- the Supabase service role. Public visitors receive only a sanitized config.
ALTER TABLE public.virtual_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tour_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tour_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tour_hotspots ENABLE ROW LEVEL SECURITY;

-- Publish atomically, then clone the published snapshot into the next working
-- draft. Visitors therefore never observe a partially edited graph.
CREATE OR REPLACE FUNCTION public.publish_virtual_tour_revision(p_tour_id bigint, p_admin text DEFAULT '')
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour public.virtual_tours%ROWTYPE;
  v_next_revision_id bigint;
  v_next_version integer;
  v_scene public.virtual_tour_scenes%ROWTYPE;
  v_hotspot public.virtual_tour_hotspots%ROWTYPE;
  v_new_scene_id bigint;
  v_scene_map jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO v_tour FROM public.virtual_tours WHERE id = p_tour_id FOR UPDATE;
  IF NOT FOUND OR v_tour.draft_revision_id IS NULL THEN
    RAISE EXCEPTION 'Virtual-tour draft not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.virtual_tour_scenes WHERE revision_id = v_tour.draft_revision_id) THEN
    RAISE EXCEPTION 'At least one scene is required';
  END IF;
  IF (SELECT count(*) FROM public.virtual_tour_scenes WHERE revision_id = v_tour.draft_revision_id AND is_start_scene) <> 1 THEN
    RAISE EXCEPTION 'Exactly one starting scene is required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.virtual_tour_scenes WHERE revision_id = v_tour.draft_revision_id AND validation_status <> 'valid') THEN
    RAISE EXCEPTION 'All panoramas must pass validation';
  END IF;

  IF v_tour.published_revision_id IS NOT NULL AND v_tour.published_revision_id <> v_tour.draft_revision_id THEN
    UPDATE public.virtual_tour_revisions SET state = 'superseded', updated_at = timezone('utc', now())
      WHERE id = v_tour.published_revision_id;
  END IF;
  UPDATE public.virtual_tour_revisions
    SET state = 'published', published_at = timezone('utc', now()), updated_at = timezone('utc', now())
    WHERE id = v_tour.draft_revision_id;

  SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
    FROM public.virtual_tour_revisions WHERE tour_id = p_tour_id;
  INSERT INTO public.virtual_tour_revisions (tour_id, version_number, state, created_by)
    VALUES (p_tour_id, v_next_version, 'draft', p_admin)
    RETURNING id INTO v_next_revision_id;

  FOR v_scene IN SELECT * FROM public.virtual_tour_scenes WHERE revision_id = v_tour.draft_revision_id ORDER BY sort_order, id LOOP
    INSERT INTO public.virtual_tour_scenes (
      revision_id, scene_key, name_en, name_tl, panorama_path, panorama_width,
      panorama_height, panorama_mime, validation_status, initial_pitch,
      initial_yaw, initial_hfov, is_start_scene, sort_order
    ) VALUES (
      v_next_revision_id, v_scene.scene_key, v_scene.name_en, v_scene.name_tl,
      v_scene.panorama_path, v_scene.panorama_width, v_scene.panorama_height,
      v_scene.panorama_mime, v_scene.validation_status, v_scene.initial_pitch,
      v_scene.initial_yaw, v_scene.initial_hfov, v_scene.is_start_scene, v_scene.sort_order
    ) RETURNING id INTO v_new_scene_id;
    v_scene_map := jsonb_set(v_scene_map, ARRAY[v_scene.id::text], to_jsonb(v_new_scene_id));
  END LOOP;

  FOR v_hotspot IN SELECT * FROM public.virtual_tour_hotspots WHERE revision_id = v_tour.draft_revision_id ORDER BY sort_order, id LOOP
    INSERT INTO public.virtual_tour_hotspots (
      revision_id, scene_id, hotspot_type, name_en, name_tl, pitch, yaw,
      target_scene_id, target_pitch, target_yaw, target_hfov, image_path,
      glb_path, subtitle_en, subtitle_tl, audio_en_path, audio_tl_path,
      tts_voice_id, tts_model_id, nested_hotspots, is_enabled, sort_order
    ) VALUES (
      v_next_revision_id, (v_scene_map ->> v_hotspot.scene_id::text)::bigint,
      v_hotspot.hotspot_type, v_hotspot.name_en, v_hotspot.name_tl,
      v_hotspot.pitch, v_hotspot.yaw,
      CASE WHEN v_hotspot.target_scene_id IS NULL THEN NULL ELSE (v_scene_map ->> v_hotspot.target_scene_id::text)::bigint END,
      v_hotspot.target_pitch, v_hotspot.target_yaw, v_hotspot.target_hfov,
      v_hotspot.image_path, v_hotspot.glb_path, v_hotspot.subtitle_en,
      v_hotspot.subtitle_tl, v_hotspot.audio_en_path, v_hotspot.audio_tl_path,
      v_hotspot.tts_voice_id, v_hotspot.tts_model_id, v_hotspot.nested_hotspots, v_hotspot.is_enabled,
      v_hotspot.sort_order
    );
  END LOOP;

  UPDATE public.virtual_tours SET
    status = 'active', published_revision_id = v_tour.draft_revision_id,
    draft_revision_id = v_next_revision_id, published_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
    WHERE id = p_tour_id;
  RETURN v_next_revision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_virtual_tour_revision(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_virtual_tour_revision(bigint, text) FROM anon;
REVOKE ALL ON FUNCTION public.publish_virtual_tour_revision(bigint, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.publish_virtual_tour_revision(bigint, text) TO service_role;

-- Switching the spawn point must not briefly leave a revision with zero or
-- two starting scenes. The row lock also serializes simultaneous admin edits.
CREATE OR REPLACE FUNCTION public.set_virtual_tour_start_scene(p_revision_id bigint, p_scene_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM id FROM public.virtual_tour_revisions WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.virtual_tour_scenes WHERE id = p_scene_id AND revision_id = p_revision_id
  ) THEN
    RAISE EXCEPTION 'Scene does not belong to this virtual-tour revision';
  END IF;
  UPDATE public.virtual_tour_scenes
    SET is_start_scene = false, updated_at = timezone('utc', now())
    WHERE revision_id = p_revision_id AND is_start_scene;
  UPDATE public.virtual_tour_scenes
    SET is_start_scene = true, updated_at = timezone('utc', now())
    WHERE id = p_scene_id AND revision_id = p_revision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_virtual_tour_start_scene(bigint, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_virtual_tour_start_scene(bigint, bigint) FROM anon;
REVOKE ALL ON FUNCTION public.set_virtual_tour_start_scene(bigint, bigint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_virtual_tour_start_scene(bigint, bigint) TO service_role;
