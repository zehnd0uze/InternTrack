-- ============================================================
-- InternTrack — Migration 026: Recompute hours_worked with lunch
-- Run this in Supabase SQL Editor.
--
-- Older rows (before 024, or typed in by hand) may store hours
-- without the lunch break, e.g. 08:40–16:00 saved as 7.2 instead
-- of 6.33. This recomputes every finished row from its check-in /
-- check-out times using public.attendance_hours (migration 024):
--   up to 1h lunch deducted, only the part beyond 4h.
--
-- Only rows with both check_in and check_out are touched; rows
-- without check_out keep their stored value.
-- ============================================================

-- 1) Preview (read-only): run this first to see what will change.
-- SELECT a.date, u.full_name,
--        to_char(a.check_in  AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS check_in,
--        to_char(a.check_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS check_out,
--        a.hours_worked AS old_hours,
--        public.attendance_hours(a.check_in, a.check_out) AS new_hours
--   FROM public.attendance a
--   JOIN public.users u ON u.id = a.user_id
--  WHERE a.check_in IS NOT NULL AND a.check_out IS NOT NULL
--    AND a.hours_worked IS DISTINCT FROM public.attendance_hours(a.check_in, a.check_out)
--  ORDER BY u.full_name, a.date;

-- 2) Apply.
BEGIN;

UPDATE public.attendance
   SET hours_worked = public.attendance_hours(check_in, check_out)
 WHERE check_in IS NOT NULL
   AND check_out IS NOT NULL
   AND hours_worked IS DISTINCT FROM public.attendance_hours(check_in, check_out);

COMMIT;
