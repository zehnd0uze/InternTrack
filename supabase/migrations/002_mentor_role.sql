-- ============================================================
-- InternTrack — Migration 002: Mentor Role & Internship Placements
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ---------------------------------------------------------------
-- 1. ADD 'mentor' TO ROLE CHECK CONSTRAINT
--    Supabase doesn't support ALTER CONSTRAINT directly,
--    so we drop the old check and add a new one.
-- ---------------------------------------------------------------
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'supervisor', 'admin', 'mentor'));

-- ---------------------------------------------------------------
-- 2. INTERNSHIP PLACEMENTS TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internship_placements (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  company_name  TEXT        NOT NULL,
  department    TEXT,
  position      TEXT        NOT NULL,
  start_date    DATE        NOT NULL,
  end_date      DATE,
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id)  -- one active placement per student
);

-- ---------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------
ALTER TABLE public.internship_placements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 4. RLS POLICIES — INTERNSHIP_PLACEMENTS
-- ---------------------------------------------------------------

-- Students can read & update their own placement
DROP POLICY IF EXISTS "Students can read own placement" ON public.internship_placements;
CREATE POLICY "Students can read own placement"
  ON public.internship_placements FOR SELECT
  USING (auth.uid() = student_id);

-- Mentors can read placements where they are the mentor
DROP POLICY IF EXISTS "Mentors can read their interns placements" ON public.internship_placements;
CREATE POLICY "Mentors can read their interns placements"
  ON public.internship_placements FOR SELECT
  USING (auth.uid() = mentor_id);

-- Mentors can insert placements for their interns
DROP POLICY IF EXISTS "Mentors can insert placements" ON public.internship_placements;
CREATE POLICY "Mentors can insert placements"
  ON public.internship_placements FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

-- Mentors can update their placements
DROP POLICY IF EXISTS "Mentors can update their placements" ON public.internship_placements;
CREATE POLICY "Mentors can update their placements"
  ON public.internship_placements FOR UPDATE
  USING (auth.uid() = mentor_id);

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all placements" ON public.internship_placements;
CREATE POLICY "Admins can manage all placements"
  ON public.internship_placements FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ---------------------------------------------------------------
-- 5. ALLOW MENTORS TO READ STUDENTS ASSIGNED TO THEM
--    (via internship_placements.mentor_id)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Mentors can read their interns profiles" ON public.users;
CREATE POLICY "Mentors can read their interns profiles"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internship_placements ip
      WHERE ip.student_id = users.id
        AND ip.mentor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 6. ALLOW MENTORS TO READ INTERNS' ATTENDANCE
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Mentors can read their interns attendance" ON public.attendance;
CREATE POLICY "Mentors can read their interns attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internship_placements ip
      WHERE ip.student_id = attendance.user_id
        AND ip.mentor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 7. ALLOW MENTORS TO READ INTERNS' DAILY LOGS
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Mentors can read their interns logs" ON public.daily_logs;
CREATE POLICY "Mentors can read their interns logs"
  ON public.daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internship_placements ip
      WHERE ip.student_id = daily_logs.user_id
        AND ip.mentor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 8. ALLOW MENTORS TO READ & UPDATE WEEKLY APPROVALS
--    Mentors are stored as supervisor_id in weekly_approvals
--    when they are set as the approving mentor for an intern.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Mentors can manage their interns approvals" ON public.weekly_approvals;
CREATE POLICY "Mentors can manage their interns approvals"
  ON public.weekly_approvals FOR ALL
  USING (
    auth.uid() = supervisor_id
    OR EXISTS (
      SELECT 1 FROM public.internship_placements ip
      WHERE ip.student_id = weekly_approvals.student_id
        AND ip.mentor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 9. ALLOW MENTORS TO INSERT NOTIFICATIONS FOR INTERNS
-- ---------------------------------------------------------------
-- Already covered by the existing "Anyone can insert notifications" policy

-- ---------------------------------------------------------------
-- 10. INDEXES
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_placements_student ON public.internship_placements(student_id);
CREATE INDEX IF NOT EXISTS idx_placements_mentor  ON public.internship_placements(mentor_id);
CREATE INDEX IF NOT EXISTS idx_placements_status  ON public.internship_placements(status);

-- ---------------------------------------------------------------
-- DONE! Mentor role and internship_placements table ready.
-- ---------------------------------------------------------------
