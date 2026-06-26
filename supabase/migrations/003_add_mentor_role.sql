-- ============================================================
-- InternTrack — Add Mentor Role & Update Dual Role Constraint
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. If your 'role' column has a CHECK constraint, we need to drop it and recreate it to allow 'mentor'
-- Note: the constraint name might vary (e.g., users_role_check). If it doesn't exist, this will just fail safely.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'supervisor', 'admin', 'mentor'));

-- 2. Update the secondary_role constraint to include 'mentor'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_secondary_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_secondary_role_check CHECK (secondary_role IN ('student', 'supervisor', 'admin', 'mentor'));
