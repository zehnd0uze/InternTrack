-- 017_scheduled_notification_days.sql
-- Add days_of_week column to scheduled_notifications for selecting specific days of the week

ALTER TABLE public.scheduled_notifications
ADD COLUMN IF NOT EXISTS days_of_week JSONB DEFAULT '[]'::jsonb;
