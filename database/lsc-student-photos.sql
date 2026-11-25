-- LSC student portrait support for the supervised attendance terminal.
-- Run once in the Supabase SQL Editor before deploying the matching student.js.
-- Photos must be uploaded by an authorized database administrator to the PRIVATE
-- lsc-student-photos bucket using: <class_uuid>/<student_uuid>.<jpg|jpeg|png|webp>
-- Then set lsc_students.photo_path to that exact object path. Do not use public URLs.

ALTER TABLE public.lsc_students
  ADD COLUMN IF NOT EXISTS photo_path text;

COMMENT ON COLUMN public.lsc_students.photo_path IS
  'Object path in private Storage bucket lsc-student-photos: <class_uuid>/<student_uuid>.<jpg|jpeg|png|webp>. Never store a public URL.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lsc-student-photos',
  'lsc-student-photos',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Validate that the requested object belongs to a student in the class folder
-- and that the signed-in operator is permitted to see that student's class.
CREATE OR REPLACE FUNCTION public.lsc_can_read_student_photo(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_class_id uuid;
  v_student_id uuid;
  v_student_class uuid;
BEGIN
  IF v_actor IS NULL
     OR p_object_name IS NULL
     OR p_object_name !~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  THEN
    RETURN false;
  END IF;

  BEGIN
    v_class_id := split_part(p_object_name, '/', 1)::uuid;
    v_student_id := split_part(split_part(p_object_name, '/', 2), '.', 1)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  SELECT s.class_id
    INTO v_student_class
  FROM public.lsc_students AS s
  WHERE s.id = v_student_id
    AND s.class_id = v_class_id
    AND s.photo_path = p_object_name;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lsc_staff_roles AS r
    WHERE r.user_id = v_actor
      AND r.role = 'official'
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lsc_staff_roles AS r
    WHERE r.user_id = v_actor
      AND r.role = 'class_mayor'
      AND r.class_id = v_student_class
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.lsc_attendance_volunteers AS v
    WHERE v.user_id = v_actor
      AND v.enabled = true
      AND v.expires_at > pg_catalog.clock_timestamp()
      AND (
        v.access_scope = 'whole_school'
        OR (v.access_scope = 'assigned_class' AND v.class_id = v_student_class)
      )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.lsc_can_read_student_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lsc_can_read_student_photo(text) TO authenticated;

DROP POLICY IF EXISTS "lsc_student_photos_scoped_select" ON storage.objects;
CREATE POLICY "lsc_student_photos_scoped_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lsc-student-photos'
  AND public.lsc_can_read_student_photo(name)
);

-- Include the private object path in the authenticated attendance response only.
CREATE OR REPLACE FUNCTION public.lsc_record_attendance(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_staff public.lsc_staff_roles%rowtype;
  v_volunteer public.lsc_attendance_volunteers%rowtype;
  v_operator_role text;
  v_scope text;
  v_assigned_class uuid;
  v_email text;
  v_student public.lsc_students%rowtype;
  v_day date := (clock_timestamp() at time zone 'Asia/Manila')::date;
  v_last public.lsc_attendance_events%rowtype;
  v_action text;
  v_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to record attendance' USING errcode='42501';
  END IF;

  SELECT * INTO v_staff FROM public.lsc_staff_roles WHERE user_id=v_actor;
  IF FOUND AND v_staff.role='official' THEN
    v_operator_role:='official';
    v_scope:='whole_school';
  ELSIF FOUND AND v_staff.role='class_mayor' AND v_staff.class_id IS NOT NULL THEN
    v_operator_role:='class_mayor';
    v_scope:='assigned_class';
    v_assigned_class:=v_staff.class_id;
  ELSE
    SELECT * INTO v_volunteer
    FROM public.lsc_attendance_volunteers
    WHERE user_id=v_actor AND enabled=true AND expires_at>clock_timestamp();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Volunteer attendance permission is missing, revoked, or expired' USING errcode='42501';
    END IF;
    v_operator_role:='attendance_volunteer';
    v_scope:=v_volunteer.access_scope;
    v_assigned_class:=v_volunteer.class_id;
  END IF;

  IF v_scope NOT IN ('whole_school','assigned_class')
     OR (v_scope='assigned_class' AND v_assigned_class IS NULL)
  THEN
    RAISE EXCEPTION 'Invalid attendance operator scope' USING errcode='42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id=v_actor;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Attendance operator email unavailable' USING errcode='42501';
  END IF;

  p_student_id:=btrim(coalesce(p_student_id,''));
  IF p_student_id !~ '^[0-9]{7,12}$' THEN
    RAISE EXCEPTION 'Enter a valid numeric Student ID' USING errcode='22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('lsc:'||p_student_id,0));
  SELECT * INTO v_student
  FROM public.lsc_students
  WHERE student_id=p_student_id AND active=true;

  IF NOT FOUND
     OR (v_scope='assigned_class' AND v_assigned_class IS DISTINCT FROM v_student.class_id)
  THEN
    RAISE EXCEPTION 'Student ID not available in your authorized section' USING errcode='P0002';
  END IF;

  IF v_student.class_id IS NULL THEN
    RAISE EXCEPTION 'Student has no assigned class; contact an LSC Official' USING errcode='22023';
  END IF;

  -- Re-check expiry after advisory lock, so revocation/expiry becomes effective even under queueing.
  IF v_operator_role='attendance_volunteer' AND NOT EXISTS (
    SELECT 1 FROM public.lsc_attendance_volunteers v
    WHERE v.user_id=v_actor AND v.enabled
      AND v.expires_at>clock_timestamp()
      AND v.access_scope=v_scope
      AND v.class_id IS NOT DISTINCT FROM v_assigned_class
  ) THEN
    RAISE EXCEPTION 'Attendance volunteer access changed or expired; refresh your station' USING errcode='42501';
  END IF;

  SELECT * INTO v_last
  FROM public.lsc_attendance_events
  WHERE student_id=v_student.id AND event_date=v_day
  ORDER BY recorded_at DESC,id DESC
  LIMIT 1;

  v_at:=clock_timestamp();
  IF v_last.id IS NOT NULL AND v_at-v_last.recorded_at<interval '45 seconds' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status','DUPLICATE','event_type',v_last.event_type,
      'student_id',v_student.student_id,'full_name',v_student.full_name,
      'grade_level',v_student.grade_level,'section',v_student.section,
      'recorded_at',v_last.recorded_at,'recorded_by',v_last.recorded_by,
      'recorded_by_email',v_last.recorded_by_email,'recorded_by_role',v_last.recorded_by_role,
      'photo_path',v_student.photo_path
    );
  END IF;

  v_action:=CASE WHEN v_last.event_type='IN' THEN 'OUT' ELSE 'IN' END;
  INSERT INTO public.lsc_attendance_events
    (student_id,event_type,event_date,recorded_at,recorded_by,class_id,recorded_by_email,recorded_by_role)
  VALUES
    (v_student.id,v_action,v_day,v_at,v_actor,v_student.class_id,v_email,v_operator_role);

  RETURN pg_catalog.jsonb_build_object(
    'status','SUCCESS','event_type',v_action,
    'student_id',v_student.student_id,'full_name',v_student.full_name,
    'grade_level',v_student.grade_level,'section',v_student.section,
    'recorded_at',v_at,'recorded_by',v_actor,
    'recorded_by_email',v_email,'recorded_by_role',v_operator_role,
    'photo_path',v_student.photo_path
  );
END;
$function$;
