-- ============================================================
-- InternTrack — Migration 022: Missing Attendance
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.missing_attendance (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  missing_type  TEXT        NOT NULL CHECK (missing_type IN ('check_in', 'check_out', 'both')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

-- Enable RLS
ALTER TABLE public.missing_attendance ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_missing_attendance_student_id ON public.missing_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_missing_attendance_date ON public.missing_attendance(date);

-- RLS Policies

-- Admins can do anything
DROP POLICY IF EXISTS "Admins can manage missing_attendance" ON public.missing_attendance;
CREATE POLICY "Admins can manage missing_attendance"
  ON public.missing_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Supervisors and mentors can read missing attendance of their students
DROP POLICY IF EXISTS "Supervisors and mentors can read students missing attendance" ON public.missing_attendance;
CREATE POLICY "Supervisors and mentors can read students missing attendance"
  ON public.missing_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users s
      WHERE s.id = missing_attendance.student_id AND s.supervisor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.internship_placements ip
      WHERE ip.student_id = missing_attendance.student_id AND ip.mentor_id = auth.uid()
    )
  );

-- Students can read their own missing attendance
DROP POLICY IF EXISTS "Students can read own missing attendance" ON public.missing_attendance;
CREATE POLICY "Students can read own missing attendance"
  ON public.missing_attendance FOR SELECT
  USING (auth.uid() = student_id);
