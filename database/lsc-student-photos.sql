-- Google Drive student portrait configuration for the supervised attendance terminal.
-- Adds the per-class Drive folder ID. Student images remain in a PRIVATE Drive folder.
-- The lsc-student-photo Edge Function reads images using a dedicated service
-- account granted Viewer access only to the LSC Student Photos root folder.

ALTER TABLE public.lsc_classes
  ADD COLUMN IF NOT EXISTS photo_folder_id text;

COMMENT ON COLUMN public.lsc_classes.photo_folder_id IS
  'Google Drive folder ID containing this class roster''s student portraits. The folder must be inside the private LSC Student Photos root shared with the server service account.';

-- Example after creating a class folder in Google Drive:
-- UPDATE public.lsc_classes
-- SET photo_folder_id = 'GOOGLE_DRIVE_CLASS_FOLDER_ID'
-- WHERE id = 'CLASS_UUID';

-- Photos are matched by the student's registered numeric ID and never
-- exposed through a public URL or a public Storage bucket.
