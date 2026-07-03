-- 021_fix_retroactive_attendance.sql
-- Fix: ensure retroactive attendance NEVER creates records for today or future dates (Bangkok timezone)
-- Also deletes any erroneous records for today that were auto-generated with both check_in & check_out
-- on days where the student had not yet done a real check-in.

-- ---------------------------------------------------------------
-- 1. Remove today's retroactive records that should not exist
--    (records for today's date that already have check_out set,
--     meaning they were created by generate_retroactive_attendance
--     rather than a real check-in by the student)
-- ---------------------------------------------------------------
DELETE FROM public.attendance
WHERE
  date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::DATE
  AND check_in IS NOT NULL
  AND check_out IS NOT NULL
  -- Only remove records whose check_in time matches exactly the user's work_start_time
  -- (i.e., created by retroactive, not manually)
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = attendance.user_id
      -- The retroactive sets check_in = (date + work_start_time) AT TIME ZONE 'Asia/Bangkok'
      -- Compare hours/minutes only
      AND EXTRACT(HOUR FROM (attendance.check_in AT TIME ZONE 'Asia/Bangkok')) = EXTRACT(HOUR FROM u.work_start_time::TIME)
      AND EXTRACT(MINUTE FROM (attendance.check_in AT TIME ZONE 'Asia/Bangkok')) = EXTRACT(MINUTE FROM u.work_start_time::TIME)
  );

-- ---------------------------------------------------------------
-- 2. Recreate generate_retroactive_attendance with a strict guard:
--    Never generate records for today (Bangkok) or future dates.
--    Uses DATE arithmetic (DATE - INTEGER) to avoid any INTERVAL ambiguity.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_retroactive_attendance(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE;
  v_end_limit DATE;
  v_today DATE;
  v_records_created INTEGER := 0;
  v_hours_worked DECIMAL(5,2);
BEGIN
  -- Get today's date in Bangkok timezone (unambiguous DATE subtraction)
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::DATE;

  -- Calculate hours worked
  v_hours_worked := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;

  -- If end time is before start time (e.g. overnight), add 24 hours
  IF v_hours_worked < 0 THEN
    v_hours_worked := v_hours_worked + 24.0;
  END IF;

  -- Limit generation to: up to (but NOT including) today, Bangkok time
  -- Using integer subtraction on DATE avoids any timezone/interval ambiguity
  v_end_limit := LEAST(p_end_date, v_today - 1);

  -- If start date is already today or future, nothing to do
  IF p_start_date >= v_today THEN
    RETURN 0;
  END IF;

  v_current_date := p_start_date;

  WHILE v_current_date <= v_end_limit LOOP
    -- Extra safety guard: never write today or future
    IF v_current_date >= v_today THEN
      EXIT;
    END IF;

    -- Only Monday(1) to Friday(5)
    IF EXTRACT(ISODOW FROM v_current_date) BETWEEN 1 AND 5 THEN

      INSERT INTO public.attendance (
        user_id,
        date,
        check_in,
        check_out,
        hours_worked
      )
      VALUES (
        p_user_id,
        v_current_date,
        (v_current_date + p_start_time) AT TIME ZONE 'Asia/Bangkok',
        (v_current_date + p_end_time) AT TIME ZONE 'Asia/Bangkok',
        v_hours_worked
      )
      ON CONFLICT (user_id, date) DO NOTHING;

      IF FOUND THEN
        v_records_created := v_records_created + 1;
      END IF;

    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_records_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
