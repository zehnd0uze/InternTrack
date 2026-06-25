-- ============================================================
-- InternTrack — Migration 004: Seed Attendance for June 22-26, 2026
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  student_rec RECORD;
  att_id UUID;
  d DATE;
  dates DATE[] := ARRAY['2026-06-22'::DATE, '2026-06-23'::DATE, '2026-06-24'::DATE, '2026-06-25'::DATE, '2026-06-26'::DATE];
BEGIN
  FOR student_rec IN SELECT id FROM public.users WHERE role = 'student' LOOP
    FOREACH d IN ARRAY dates LOOP
      -- check if attendance already exists
      IF NOT EXISTS (SELECT 1 FROM public.attendance WHERE user_id = student_rec.id AND date = d) THEN
        att_id := gen_random_uuid();
        
        INSERT INTO public.attendance (id, user_id, check_in, check_out, hours_worked, date)
        VALUES (
          att_id,
          student_rec.id,
          (d::TEXT || ' 08:30:00+07:00')::TIMESTAMPTZ,
          (d::TEXT || ' 16:30:00+07:00')::TIMESTAMPTZ,
          7.00,
          d
        );
        
        INSERT INTO public.daily_logs (user_id, attendance_id, log_text, date)
        VALUES (
          student_rec.id,
          att_id,
          'ปฏิบัติงานตามที่ได้รับมอบหมาย',
          d
        ) ON CONFLICT (attendance_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;
