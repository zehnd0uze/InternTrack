-- 013_user_work_hours.sql
ALTER TABLE public.users
ADD COLUMN work_start_time TIME,
ADD COLUMN work_end_time TIME;

-- Set default for existing student users who might need it? 
-- Let's keep it NULL so that the app forces them to set it.
