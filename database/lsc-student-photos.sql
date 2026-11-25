-- Google Drive student portrait configuration for the supervised attendance terminal.
-- Adds the Drive folder ID used for each class. Multiple class rows may share
-- the same private root folder when Student IDs are unique across the roster.
-- The lsc-student-photo Edge Function reads images using a dedicated service
-- account granted Viewer access only to the LSC Student Photos root folder.

ALTER TABLE public.lsc_classes
  ADD COLUMN IF NOT EXISTS photo_folder_id text;

COMMENT ON COLUMN public.lsc_classes.photo_folder_id IS
  'Google Drive folder ID searched for this class roster''s student portraits. Classes may share the same private root folder because the Edge Function separately enforces class-level authorization.';

-- Example: assign one private root folder to all class rows.
-- UPDATE public.lsc_classes
-- SET photo_folder_id = 'GOOGLE_DRIVE_ROOT_FOLDER_ID';

-- Photos are matched by the student's registered numeric ID and never
-- exposed through a public URL or a public Storage bucket.
