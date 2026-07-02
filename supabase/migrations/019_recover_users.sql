-- ============================================================
-- 019_recover_users.sql
-- กู้คืนข้อมูล users จาก auth.users ที่ถูกลบโดย TRUNCATE CASCADE
-- ============================================================

-- ขั้นที่ 1: กู้คืน user records ที่หายไป จาก auth.users
-- จะ insert เฉพาะ user ที่ไม่มีใน public.users แล้ว (ไม่ซ้ำ)
INSERT INTO public.users (id, email, role, full_name, created_at)
SELECT
  au.id,
  au.email,
  -- พยายาม detect role จาก raw_user_meta_data ถ้ามี ถ้าไม่มีให้เป็น 'student' ก่อน
  COALESCE(au.raw_user_meta_data->>'role', 'student') AS role,
  -- ดึงชื่อจาก metadata ถ้ามี ถ้าไม่มีใช้ email แทน
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_app_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1)
  ) AS full_name,
  au.created_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- ขั้นที่ 2: ดูรายการที่กู้คืนมา
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM public.users
ORDER BY created_at ASC;
