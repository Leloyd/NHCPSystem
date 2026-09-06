-- Permanently clear all Educational Resource cards and all Teacher Corner /
-- Story participation submissions.
--
-- This script intentionally does NOT delete Supabase Storage metadata through
-- SQL. It reports the saved object paths at the end so the corresponding files
-- can be removed safely through the Storage API or Supabase Storage dashboard.
-- Run the complete script as one query in the Supabase SQL Editor.

BEGIN;

-- Stop a new card, submission, or related notification from being inserted in
-- the middle of this short cleanup transaction. Normal reads may continue.
LOCK TABLE public.admin_notifications IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.community_participation_submissions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.edu_resources IN SHARE ROW EXCLUSIVE MODE;

-- Preserve an audit-friendly result for the final report. These temporary
-- tables disappear automatically when the SQL Editor connection closes.
CREATE TEMP TABLE cleanup_deleted_counts (
  record_type text PRIMARY KEY,
  deleted_count bigint NOT NULL
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE cleanup_storage_paths (
  module text NOT NULL,
  object_path text NOT NULL,
  PRIMARY KEY (module, object_path)
) ON COMMIT PRESERVE ROWS;

-- Save every referenced upload path before deleting its database row.
INSERT INTO cleanup_storage_paths (module, object_path)
SELECT 'Educational Resources', btrim(file_filename)
FROM public.edu_resources
WHERE file_filename IS NOT NULL AND btrim(file_filename) <> ''
UNION
SELECT 'Educational Resources', btrim(cover_image_filename)
FROM public.edu_resources
WHERE cover_image_filename IS NOT NULL AND btrim(cover_image_filename) <> ''
UNION
SELECT 'Participation Submissions', btrim(resource_file_filename)
FROM public.community_participation_submissions
WHERE resource_file_filename IS NOT NULL AND btrim(resource_file_filename) <> ''
UNION
SELECT 'Participation Submissions', btrim(photo_filename)
FROM public.community_participation_submissions
WHERE photo_filename IS NOT NULL AND btrim(photo_filename) <> ''
ON CONFLICT (module, object_path) DO NOTHING;

-- Submission notifications contain source IDs and links to records that are
-- about to disappear. Remove them first so the admin notification bell cannot
-- retain dead links.
WITH deleted AS (
  DELETE FROM public.admin_notifications
  WHERE event_type IN ('teacher_submission', 'story_submission')
  RETURNING id
)
INSERT INTO cleanup_deleted_counts (record_type, deleted_count)
SELECT 'Admin submission notifications', count(*) FROM deleted;

WITH deleted AS (
  DELETE FROM public.community_participation_submissions
  RETURNING id
)
INSERT INTO cleanup_deleted_counts (record_type, deleted_count)
SELECT 'Participation submissions', count(*) FROM deleted;

WITH deleted AS (
  DELETE FROM public.edu_resources
  RETURNING id
)
INSERT INTO cleanup_deleted_counts (record_type, deleted_count)
SELECT 'Educational resource cards', count(*) FROM deleted;

-- Abort and roll back everything if either requested module is not empty.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.community_participation_submissions)
     OR EXISTS (SELECT 1 FROM public.edu_resources) THEN
    RAISE EXCEPTION 'Cleanup verification failed; the transaction has been rolled back';
  END IF;
END;
$$;

COMMIT;

-- The result contains deletion totals followed by Storage objects that are no
-- longer referenced. Rows marked STORAGE FILE are not deleted by this query.
SELECT
  'DELETED ROWS'::text AS result_type,
  record_type AS item,
  deleted_count::text AS value
FROM cleanup_deleted_counts
UNION ALL
SELECT
  'STORAGE FILE TO REMOVE'::text,
  module,
  object_path
FROM cleanup_storage_paths
ORDER BY result_type, item, value;
