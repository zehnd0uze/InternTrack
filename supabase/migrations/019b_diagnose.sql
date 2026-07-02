-- ============================================================
-- ตรวจสอบสถานการณ์ก่อน
-- รัน 3 คำสั่งนี้แยกกันทีละ query ใน Supabase SQL Editor
-- ============================================================

-- Query 1: ดูว่ามีกี่คนใน auth.users (คนที่ยังเข้าระบบได้)
SELECT COUNT(*) AS auth_user_count FROM auth.users;

-- Query 2: ดูว่ามีกี่คนใน public.users (ที่กู้คืนมาได้)
SELECT COUNT(*) AS public_user_count FROM public.users;

-- Query 3: ดูรายละเอียด auth.users ทั้งหมด
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'role'      AS role_in_meta,
  raw_user_meta_data->>'full_name' AS name_in_meta
FROM auth.users
ORDER BY created_at;
