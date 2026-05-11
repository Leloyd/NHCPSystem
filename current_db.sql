-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.community_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  event_date date NOT NULL,
  short_description text NOT NULL,
  long_description text NOT NULL,
  image_filename text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT community_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.community_highlights (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category = ANY (ARRAY['Education Program'::text, 'Community Activity'::text, 'Public Advisory'::text])),
  event_date date NOT NULL,
  short_description text NOT NULL,
  long_description text NOT NULL,
  image_filename text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT community_highlights_pkey PRIMARY KEY (id)
);
CREATE TABLE public.online_gallery_categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  display_name_en text NOT NULL DEFAULT ''::text,
  display_name_tl text NOT NULL DEFAULT ''::text,
  CONSTRAINT online_gallery_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.online_gallery_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint NOT NULL,
  title text NOT NULL,
  period text NOT NULL DEFAULT ''::text,
  year_label text NOT NULL DEFAULT ''::text,
  source text NOT NULL DEFAULT ''::text,
  location text NOT NULL DEFAULT ''::text,
  short_caption text NOT NULL,
  full_description text NOT NULL,
  teaching_note text NOT NULL DEFAULT ''::text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_filename text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  title_tl text NOT NULL DEFAULT ''::text,
  location_tl text NOT NULL DEFAULT ''::text,
  short_caption_tl text NOT NULL DEFAULT ''::text,
  full_description_tl text NOT NULL DEFAULT ''::text,
  title_en text NOT NULL DEFAULT ''::text,
  location_en text NOT NULL DEFAULT ''::text,
  short_caption_en text NOT NULL DEFAULT ''::text,
  full_description_en text NOT NULL DEFAULT ''::text,
  CONSTRAINT online_gallery_items_pkey PRIMARY KEY (id),
  CONSTRAINT online_gallery_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.online_gallery_categories(id)
);