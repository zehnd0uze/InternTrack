-- 007_student_schedules.sql

-- 1. Allow schedules to not have a mentor_id (when created by students)
ALTER TABLE public.schedules ALTER COLUMN mentor_id DROP NOT NULL;

-- 2. Add Policies for students to manage their own schedules
-- A student-created schedule will have `mentor_id = null` and `student_id = auth.uid()`

-- Students can insert their own personal schedules
CREATE POLICY "Students can insert personal schedules"
    ON public.schedules FOR INSERT
    WITH CHECK (
        auth.uid() = student_id 
        AND mentor_id IS NULL
    );

-- Students can update their own personal schedules
CREATE POLICY "Students can update personal schedules"
    ON public.schedules FOR UPDATE
    USING (
        auth.uid() = student_id 
        AND mentor_id IS NULL
    )
    WITH CHECK (
        auth.uid() = student_id 
        AND mentor_id IS NULL
    );

-- Students can delete their own personal schedules
CREATE POLICY "Students can delete personal schedules"
    ON public.schedules FOR DELETE
    USING (
        auth.uid() = student_id 
        AND mentor_id IS NULL
    );
