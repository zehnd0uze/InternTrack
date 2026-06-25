-- ============================================================
-- InternTrack — Migration 003: Add Student Code
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ADD student_code COLUMN TO users TABLE
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS student_code TEXT;

-- 2. UPDATE handle_new_user TRIGGER FUNCTION TO INCLUDE student_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, student_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'student_code'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
