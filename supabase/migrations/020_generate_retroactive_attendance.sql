-- 020_generate_retroactive_attendance.sql
-- Function to automatically generate attendance for past work days (Monday - Friday)

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
  v_records_created INTEGER := 0;
  v_hours_worked DECIMAL(5,2);
BEGIN
  -- Calculate hours worked
  -- Extract epoch seconds, find difference, divide by 3600
  v_hours_worked := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
  
  -- If end time is before start time (e.g. overnight), add 24 hours
  IF v_hours_worked < 0 THEN
    v_hours_worked := v_hours_worked + 24.0;
  END IF;

  -- Limit generation up to yesterday (or today, let's use CURRENT_DATE)
  v_end_limit := LEAST(p_end_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::DATE);
  v_current_date := p_start_date;

  WHILE v_current_date <= v_end_limit LOOP
    -- Check if it's Monday(1) to Friday(5)
    -- EXTRACT(ISODOW FROM date) returns 1 for Monday, 7 for Sunday
    IF EXTRACT(ISODOW FROM v_current_date) BETWEEN 1 AND 5 THEN
      
      -- Insert only if it doesn't already exist for that date
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
      
      -- Increment counter if a row was actually inserted
      IF FOUND THEN
        v_records_created := v_records_created + 1;
      END IF;

    END IF;

    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_records_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
