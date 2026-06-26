-- ============================================================
-- InternTrack — Dual Role Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add secondary_role column to support users with two roles (e.g. admin + supervisor)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS secondary_role TEXT
  CHECK (secondary_role IN ('student', 'supervisor', 'admin'));

-- Example: To make a user both admin and supervisor, run:
-- UPDATE public.users SET secondary_role = 'supervisor' WHERE id = '<user-id>' AND role = 'admin';
