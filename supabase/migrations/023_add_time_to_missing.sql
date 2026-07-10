-- ============================================================
-- InternTrack — Migration 023: Add Time to Missing Attendance
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.missing_attendance
ADD COLUMN IF NOT EXISTS time_in TIME,
ADD COLUMN IF NOT EXISTS time_out TIME;
