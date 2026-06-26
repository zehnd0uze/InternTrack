-- ============================================================
-- Gamification & Fun Features Migration
-- ============================================================

-- 1. Add mood column to daily_logs table
ALTER TABLE public.daily_logs
ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('great', 'neutral', 'bad', 'stressed', 'happy'));
