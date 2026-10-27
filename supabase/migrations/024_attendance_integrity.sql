-- ============================================================
-- InternTrack — Migration 024: Attendance integrity
-- Run this in Supabase SQL Editor.
--
-- SAFE FOR EXISTING DATA:
--   * No DELETE, no TRUNCATE, no DROP TABLE, no backfill UPDATE.
--   * Existing attendance rows are left exactly as they are
--     (new `source` column stays NULL = "legacy" for them).
--   * New rules only apply to rows inserted/edited after this runs.
--
-- What it fixes:
--   1. hours_worked is computed by the database, not the browser,
--      with one lunch rule everywhere (no more 4h cliff).
--   2. clock_in() / clock_out() use the SERVER clock (device time
--      can no longer be spoofed for normal check-in/out).
--   3. generate_retroactive_attendance:
--        - caller must be the student themself or an admin
--        - only backfills days BEFORE the account existed, so it
--          no longer silently turns real absences into full days
--        - skips approved leave days and given holidays
--        - uses the same lunch rule (was 9h for 08:00–17:00)
--   4. Every new row records where it came from (source).
-- ============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. Provenance column (NULL for legacy rows on purpose)
-- ---------------------------------------------------------------
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_source_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_source_check
  CHECK (source IS NULL OR source IN ('clock', 'manual', 'auto', 'admin'));

-- ---------------------------------------------------------------
-- 2. Single source of truth for worked hours
--    Lunch: deduct up to 1h, but only the part beyond 4h, so
--    4h → 4h, 4.5h → 4h, 5h+ → minus 1h (no penalty cliff).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attendance_hours(p_in TIMESTAMPTZ, p_out TIMESTAMPTZ)
RETURNS DECIMAL(5,2) AS $$
  SELECT CASE
    WHEN p_in IS NULL OR p_out IS NULL OR p_out <= p_in THEN NULL
    ELSE ROUND((
      EXTRACT(EPOCH FROM (p_out - p_in)) / 3600.0
      - LEAST(1.0, GREATEST(0.0, EXTRACT(EPOCH FROM (p_out - p_in)) / 3600.0 - 4.0))
    )::NUMERIC, 2)
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.is_trusted_caller()
RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NULL                         -- SQL editor / migrations
      OR COALESCE(auth.role(), '') = 'service_role' -- edge functions / cron
      OR COALESCE(public.get_current_user_role(), '') = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 3. Validation + hours trigger (new writes only)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attendance_before_write()
RETURNS TRIGGER AS $$
DECLARE
  v_trusted BOOLEAN := public.is_trusted_caller();
  v_today   DATE    := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  v_admin_set_hours BOOLEAN;
BEGIN
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL AND NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;

  IF NOT v_trusted THEN
    IF NEW.date > v_today THEN
      RAISE EXCEPTION 'cannot record attendance for a future date';
    END IF;
    IF NEW.check_in > NOW() + INTERVAL '5 minutes'
       OR NEW.check_out > NOW() + INTERVAL '5 minutes' THEN
      RAISE EXCEPTION 'cannot record a time in the future';
    END IF;
  END IF;

  -- Admins may type an explicit hours value (Data Manager); everyone
  -- else always gets the computed value.
  v_admin_set_hours := v_trusted AND NEW.hours_worked IS NOT NULL AND (
    TG_OP = 'INSERT' OR NEW.hours_worked IS DISTINCT FROM OLD.hours_worked
  );
  IF NOT v_admin_set_hours THEN
    NEW.hours_worked := public.attendance_hours(NEW.check_in, NEW.check_out);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.source IS NULL THEN
    NEW.source := CASE WHEN v_trusted AND auth.uid() IS NOT NULL
                            AND auth.uid() <> NEW.user_id THEN 'admin'
                       ELSE 'manual' END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_before_write ON public.attendance;
CREATE TRIGGER trg_attendance_before_write
  BEFORE INSERT OR UPDATE OF check_in, check_out, hours_worked, date
  ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.attendance_before_write();

-- ---------------------------------------------------------------
-- 4. Server-clock check-in / check-out (run as the caller → RLS applies)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clock_in()
RETURNS public.attendance AS $$
DECLARE
  v_row public.attendance;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.attendance (user_id, date, check_in, source)
  VALUES (auth.uid(), (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE, NOW(), 'clock')
  RETURNING * INTO v_row;
  RETURN v_row;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'already checked in today' USING ERRCODE = 'unique_violation';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.clock_out(p_attendance_id UUID)
RETURNS public.attendance AS $$
DECLARE
  v_row public.attendance;
BEGIN
  UPDATE public.attendance
     SET check_out = NOW()
   WHERE id = p_attendance_id
     AND user_id = auth.uid()
     AND check_out IS NULL
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'no open check-in found';
  END IF;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.clock_in() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out(UUID) TO authenticated;

-- ---------------------------------------------------------------
-- 5. Safer retroactive generator
--    The old 5-arg version is replaced (a function, not data).
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generate_retroactive_attendance(UUID, DATE, DATE, TIME, TIME);

CREATE OR REPLACE FUNCTION public.generate_retroactive_attendance(
  p_user_id    UUID,
  p_start_date DATE,
  p_end_date   DATE,
  p_start_time TIME,
  p_end_time   TIME,
  p_skip_dates DATE[] DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  v_today      DATE := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  v_created_on DATE;
  v_end_limit  DATE;
  v_day        DATE;
  v_in         TIMESTAMPTZ;
  v_out        TIMESTAMPTZ;
  v_count      INTEGER := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_trusted_caller() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::DATE
    INTO v_created_on FROM public.users WHERE id = p_user_id;

  -- Backfill only the period the student could NOT have clocked in
  -- (before their account existed) and never today/future.
  v_end_limit := LEAST(p_end_date, v_today - 1, COALESCE(v_created_on, v_today) - 1);
  IF p_start_date > v_end_limit THEN RETURN 0; END IF;

  v_day := p_start_date;
  WHILE v_day <= v_end_limit LOOP
    IF EXTRACT(ISODOW FROM v_day) BETWEEN 1 AND 5
       AND NOT (v_day = ANY (COALESCE(p_skip_dates, '{}')))
       AND NOT EXISTS (
         SELECT 1 FROM public.leave_requests lr
          WHERE lr.user_id = p_user_id AND lr.status = 'approved'
            AND v_day BETWEEN lr.start_date AND lr.end_date)
    THEN
      v_in  := (v_day + p_start_time) AT TIME ZONE 'Asia/Bangkok';
      v_out := (v_day + p_end_time)   AT TIME ZONE 'Asia/Bangkok';
      IF v_out <= v_in THEN v_out := v_out + INTERVAL '1 day'; END IF;

      INSERT INTO public.attendance (user_id, date, check_in, check_out, source)
      VALUES (p_user_id, v_day, v_in, v_out, 'auto')
      ON CONFLICT (user_id, date) DO NOTHING;
      IF FOUND THEN v_count := v_count + 1; END IF;
    END IF;
    v_day := v_day + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_retroactive_attendance(UUID, DATE, DATE, TIME, TIME, DATE[]) TO authenticated;

COMMIT;

-- ---------------------------------------------------------------
-- Optional audit (read-only): legacy rows whose stored hours differ
-- from the new rule. Review before deciding to change anything.
-- ---------------------------------------------------------------
-- SELECT id, user_id, date, hours_worked,
--        public.attendance_hours(check_in, check_out) AS recomputed
--   FROM public.attendance
--  WHERE source IS NULL AND check_out IS NOT NULL
--    AND hours_worked IS DISTINCT FROM public.attendance_hours(check_in, check_out)
--  ORDER BY date DESC;
