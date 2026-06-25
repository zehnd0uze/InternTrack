-- ============================================================
-- InternTrack — Migration 005: Leave Requests
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type    TEXT        NOT NULL CHECK (leave_type IN ('sick', 'personal')),
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  reason        TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  supervisor_id UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_supervisor ON public.leave_requests(supervisor_id);

-- RLS Policies

-- Students can read their own leave requests
DROP POLICY IF EXISTS "Students can read own leave requests" ON public.leave_requests;
CREATE POLICY "Students can read own leave requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Students can create their own leave requests
DROP POLICY IF EXISTS "Students can insert own leave requests" ON public.leave_requests;
CREATE POLICY "Students can insert own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Supervisors can read leave requests of their students
DROP POLICY IF EXISTS "Supervisors can read their students leave requests" ON public.leave_requests;
CREATE POLICY "Supervisors can read their students leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users s
      WHERE s.id = leave_requests.user_id AND s.supervisor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Supervisors can update leave requests of their students (for approval/rejection)
DROP POLICY IF EXISTS "Supervisors can update their students leave requests" ON public.leave_requests;
CREATE POLICY "Supervisors can update their students leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users s
      WHERE s.id = leave_requests.user_id AND s.supervisor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
