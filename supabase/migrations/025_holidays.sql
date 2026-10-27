-- ============================================================
-- InternTrack — Migration 025: Holiday calendar
-- Run this in Supabase SQL Editor (after 024).
--
-- SAFE FOR EXISTING DATA: creates a new table only.
-- No existing table or row is changed or deleted.
--
-- Thai public holidays change every year (lunar Buddhist days,
-- substitution days, special cabinet-announced days), so a
-- hard-coded list in the app always goes stale. Admins keep this
-- table up to date from the app (Admin → วันหยุด).
--
--   is_day_off = TRUE  → treat the date as a holiday (add a day)
--   is_day_off = FALSE → the built-in list says holiday, but the
--                        organisation works that day (remove a day)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.holidays (
  date        DATE        PRIMARY KEY,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  is_day_off  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read holidays" ON public.holidays;
CREATE POLICY "Signed-in users can read holidays"
  ON public.holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');
