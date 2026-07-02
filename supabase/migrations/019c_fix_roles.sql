-- ============================================================
-- 019c_fix_roles.sql
-- แก้ไข Role ของ User ที่กู้คืนมาให้ถูกต้อง
-- ============================================================

-- ขั้นที่ 1: แก้ไข Role จาก email
-- (ดูจาก name_in_meta ในภาพ - ปรับ email ให้ตรงกับของจริงนะครับ)

-- Admin
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Supervisor / อาจารย์นิเทศ
UPDATE public.users 
SET role = 'supervisor' 
WHERE email IN (
  'supervisor@example.com'
  -- เพิ่ม email อื่นๆ ที่เป็น supervisor ด้วย
);

-- ขั้นที่ 2: ตรวจสอบว่า role ของทุกคนถูกต้อง
SELECT id, email, role, full_name FROM public.users ORDER BY role, email;

-- ขั้นที่ 3 (ถ้าต้องการ): แก้ชื่อของ user ที่ name_in_meta เป็น NULL
-- UPDATE public.users SET full_name = 'ชื่อจริง' WHERE email = 'email@example.com';
