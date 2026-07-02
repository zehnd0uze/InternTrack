-- 015_student_extended_fields.sql
-- เพิ่มคอลัมน์ข้อมูลนักศึกษาที่ละเอียดขึ้น สำหรับให้ admin / supervisor / mentor แก้ไขได้

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone               TEXT,
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS notes               TEXT,          -- บันทึกจากอาจารย์/พี่เลี้ยง
  ADD COLUMN IF NOT EXISTS internship_start_date DATE,
  ADD COLUMN IF NOT EXISTS internship_end_date   DATE;
