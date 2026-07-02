-- Migration: Create scheduled_notifications table

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_role TEXT NOT NULL DEFAULT 'all', -- 'all', 'student', 'mentor', 'supervisor'
    is_recurring BOOLEAN DEFAULT false,
    scheduled_time TIME NOT NULL,
    scheduled_date DATE, -- Nullable, used if is_recurring is false
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage scheduled notifications"
ON public.scheduled_notifications FOR ALL
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Service role bypasses RLS anyway, but good for Edge Function
CREATE POLICY "Service role can read scheduled notifications"
ON public.scheduled_notifications FOR SELECT
USING (true);
