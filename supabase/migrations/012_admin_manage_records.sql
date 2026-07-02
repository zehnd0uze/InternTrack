-- ---------------------------------------------------------------
-- 14. FIX RLS POLICIES FOR ADMIN/SUPERVISOR (UPDATE/DELETE)
-- ---------------------------------------------------------------

-- Allow Admin to UPDATE and DELETE attendance
DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
CREATE POLICY "Admins can update attendance"
  ON public.attendance FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance;
CREATE POLICY "Admins can delete attendance"
  ON public.attendance FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Allow Admin to UPDATE and DELETE daily_logs
DROP POLICY IF EXISTS "Admins can update daily logs" ON public.daily_logs;
CREATE POLICY "Admins can update daily logs"
  ON public.daily_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete daily logs" ON public.daily_logs;
CREATE POLICY "Admins can delete daily logs"
  ON public.daily_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));
