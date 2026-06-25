-- ============================================================
-- InternTrack — Full Database Schema & RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- ---------------------------------------------------------------
-- 1. USERS TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  full_name     TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('student', 'supervisor', 'admin')),
  supervisor_id UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  target_hours  INTEGER     DEFAULT 1596,
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 2. ATTENDANCE TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  check_in      TIMESTAMPTZ NOT NULL,
  check_out     TIMESTAMPTZ,
  hours_worked  DECIMAL(5,2),
  date          DATE        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- ---------------------------------------------------------------
-- 3. DAILY_LOGS TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attendance_id UUID        NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  log_text      TEXT        NOT NULL CHECK (char_length(log_text) <= 500),
  date          DATE        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attendance_id)
);

-- ---------------------------------------------------------------
-- 4. WEEKLY_APPROVALS TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_approvals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  supervisor_id UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  week_start    DATE        NOT NULL,
  total_hours   DECIMAL(7,2),
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note          TEXT,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, week_start)
);

-- ---------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  type       TEXT        DEFAULT 'general',
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 6. AUTO-CREATE USER PROFILE ON SIGN UP
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 7b. HELPER FUNCTION — avoids infinite recursion in RLS policies
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------
-- 8. RLS POLICIES — USERS TABLE
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Supervisors can read their students" ON public.users;
CREATE POLICY "Supervisors can read their students"
  ON public.users FOR SELECT
  USING (
    supervisor_id = auth.uid()
    OR public.get_current_user_role() IN ('supervisor', 'admin')
  );

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'admin'
    OR auth.uid() = id
  );

-- ---------------------------------------------------------------
-- 9. RLS POLICIES — ATTENDANCE TABLE
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Students can CRUD own attendance" ON public.attendance;
CREATE POLICY "Students can CRUD own attendance"
  ON public.attendance FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Supervisors can read their students attendance" ON public.attendance;
CREATE POLICY "Supervisors can read their students attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users s
      WHERE s.id = attendance.user_id
        AND s.supervisor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ---------------------------------------------------------------
-- 10. RLS POLICIES — DAILY_LOGS TABLE
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Students can CRUD own logs" ON public.daily_logs;
CREATE POLICY "Students can CRUD own logs"
  ON public.daily_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Supervisors and admins can read logs" ON public.daily_logs;
CREATE POLICY "Supervisors and admins can read logs"
  ON public.daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users s
      WHERE s.id = daily_logs.user_id AND s.supervisor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ---------------------------------------------------------------
-- 11. RLS POLICIES — WEEKLY_APPROVALS TABLE
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Students can manage own approvals" ON public.weekly_approvals;
CREATE POLICY "Students can manage own approvals"
  ON public.weekly_approvals FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Supervisors can read and update their approvals" ON public.weekly_approvals;
CREATE POLICY "Supervisors can read and update their approvals"
  ON public.weekly_approvals FOR ALL
  USING (
    auth.uid() = supervisor_id
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ---------------------------------------------------------------
-- 12. RLS POLICIES — NOTIFICATIONS TABLE
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 13. INDEXES (Performance)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_approvals_student ON public.weekly_approvals(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_approvals_supervisor ON public.weekly_approvals(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON public.users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ---------------------------------------------------------------
-- DONE! All tables, RLS policies, and indexes created.
-- ---------------------------------------------------------------
