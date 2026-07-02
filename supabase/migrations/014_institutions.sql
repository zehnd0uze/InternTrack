-- ============================================================
-- 014_institutions.sql
-- ตารางสถาบันการศึกษา, คณะ, สาขาวิชา (เฉพาะจังหวัดเชียงใหม่)
-- ============================================================

-- ---------------------------------------------------------------
-- 1. INSTITUTIONS TABLE — สถาบันการศึกษา
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutions (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name   TEXT    NOT NULL,   -- ชื่อย่อ เช่น CMU, CMRU
  full_name    TEXT    NOT NULL,   -- ชื่อเต็มภาษาไทย
  full_name_en TEXT,               -- ชื่อเต็มภาษาอังกฤษ
  type         TEXT    NOT NULL CHECK (type IN ('university', 'vocational', 'college', 'institute')),
  province     TEXT    NOT NULL DEFAULT 'เชียงใหม่',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 99
);

-- ---------------------------------------------------------------
-- 2. FACULTIES TABLE — คณะ / วิทยาลัย
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculties (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID    NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,   -- ชื่อคณะภาษาไทย
  name_en        TEXT,               -- ชื่อคณะภาษาอังกฤษ
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- 3. MAJORS TABLE — สาขาวิชา
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.majors (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id  UUID    NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,   -- ชื่อสาขาภาษาไทย
  name_en     TEXT,               -- ชื่อสาขาภาษาอังกฤษ
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- 4. ADD COLUMNS TO USERS TABLE
-- ---------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS faculty_id     UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS major_id       UUID REFERENCES public.majors(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------
-- 5. RLS — Public read for all
-- ---------------------------------------------------------------
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majors       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read institutions" ON public.institutions;
CREATE POLICY "Anyone can read institutions"
  ON public.institutions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage institutions" ON public.institutions;
CREATE POLICY "Admins can manage institutions"
  ON public.institutions FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Anyone can read faculties" ON public.faculties;
CREATE POLICY "Anyone can read faculties"
  ON public.faculties FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage faculties" ON public.faculties;
CREATE POLICY "Admins can manage faculties"
  ON public.faculties FOR ALL
  USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Anyone can read majors" ON public.majors;
CREATE POLICY "Anyone can read majors"
  ON public.majors FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage majors" ON public.majors;
CREATE POLICY "Admins can manage majors"
  ON public.majors FOR ALL
  USING (public.get_current_user_role() = 'admin');

-- ---------------------------------------------------------------
-- 6. INDEXES
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_faculties_institution ON public.faculties(institution_id);
CREATE INDEX IF NOT EXISTS idx_majors_faculty        ON public.majors(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_institution     ON public.users(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_faculty         ON public.users(faculty_id);
CREATE INDEX IF NOT EXISTS idx_users_major           ON public.users(major_id);

-- ============================================================
-- 7. SEED DATA — สถาบันการศึกษาในเชียงใหม่
-- ============================================================

-- ---------------------------------------------------------------
-- (A) มหาวิทยาลัยเชียงใหม่ (CMU)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('CMU', 'มหาวิทยาลัยเชียงใหม่', 'Chiang Mai University', 'university', 1)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะวิศวกรรมศาสตร์', 'Faculty of Engineering'),
  ('คณะวิทยาศาสตร์', 'Faculty of Science'),
  ('คณะแพทยศาสตร์', 'Faculty of Medicine'),
  ('คณะพยาบาลศาสตร์', 'Faculty of Nursing'),
  ('คณะทันตแพทยศาสตร์', 'Faculty of Dentistry'),
  ('คณะเภสัชศาสตร์', 'Faculty of Pharmacy'),
  ('คณะเกษตรศาสตร์', 'Faculty of Agriculture'),
  ('คณะสัตวแพทยศาสตร์', 'Faculty of Veterinary Medicine'),
  ('คณะมนุษยศาสตร์', 'Faculty of Humanities'),
  ('คณะสังคมศาสตร์', 'Faculty of Social Sciences'),
  ('คณะศึกษาศาสตร์', 'Faculty of Education'),
  ('คณะเศรษฐศาสตร์', 'Faculty of Economics'),
  ('คณะบริหารธุรกิจ', 'Faculty of Business Administration'),
  ('คณะนิติศาสตร์', 'Faculty of Law'),
  ('คณะรัฐศาสตร์และรัฐประศาสนศาสตร์', 'Faculty of Political Science and Public Administration'),
  ('คณะการสื่อสารมวลชน', 'Faculty of Mass Communication'),
  ('คณะวิจิตรศิลป์', 'Faculty of Fine Arts'),
  ('คณะสถาปัตยกรรมศาสตร์', 'Faculty of Architecture'),
  ('คณะอุตสาหกรรมเกษตร', 'Faculty of Agro-Industry'),
  ('วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'College of Arts, Media and Technology')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (B) มหาวิทยาลัยราชภัฏเชียงใหม่ (CMRU)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('CMRU', 'มหาวิทยาลัยราชภัฏเชียงใหม่', 'Chiang Mai Rajabhat University', 'university', 2)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะครุศาสตร์', 'Faculty of Education'),
  ('คณะมนุษยศาสตร์และสังคมศาสตร์', 'Faculty of Humanities and Social Sciences'),
  ('คณะวิทยาศาสตร์และเทคโนโลยี', 'Faculty of Science and Technology'),
  ('คณะวิทยาการจัดการ', 'Faculty of Management Science'),
  ('คณะเทคโนโลยีการเกษตร', 'Faculty of Agricultural Technology'),
  ('วิทยาลัยนานาชาติ', 'International College')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (C) มหาวิทยาลัยแม่โจ้ (MJU)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('MJU', 'มหาวิทยาลัยแม่โจ้', 'Maejo University', 'university', 3)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะผลิตกรรมการเกษตร', 'Faculty of Agricultural Production'),
  ('คณะสัตวศาสตร์และเทคโนโลยี', 'Faculty of Animal Science and Technology'),
  ('คณะประมง', 'Faculty of Fisheries Technology'),
  ('คณะวิศวกรรมและอุตสาหกรรมเกษตร', 'Faculty of Engineering and Agro-Industry'),
  ('คณะธุรกิจการเกษตร', 'Faculty of Agricultural Business'),
  ('คณะบริหารธุรกิจ', 'Faculty of Business Administration'),
  ('คณะเทคโนโลยีสารสนเทศและการสื่อสาร', 'Faculty of Information and Communication Technology'),
  ('คณะศิลปศาสตร์', 'Faculty of Liberal Arts'),
  ('คณะวิทยาศาสตร์', 'Faculty of Science'),
  ('คณะสถาปัตยกรรมศาสตร์และการออกแบบสิ่งแวดล้อม', 'Faculty of Architecture and Environmental Design')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (D) มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (RMUTL)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('RMUTL', 'มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา', 'Rajamangala University of Technology Lanna', 'university', 4)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะวิศวกรรมศาสตร์', 'Faculty of Engineering'),
  ('คณะบริหารธุรกิจและศิลปศาสตร์', 'Faculty of Business Administration and Liberal Arts'),
  ('คณะวิทยาศาสตร์และเทคโนโลยีการเกษตร', 'Faculty of Science and Agricultural Technology'),
  ('คณะศิลปกรรมและสถาปัตยกรรมศาสตร์', 'Faculty of Fine Arts and Architecture')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (E) วิทยาลัยเทคโนโลยีและสหวิทยาการ (มทร. ล้านนา)
-- -- (polytechnic arm)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('RMUTL-IT', 'วิทยาลัยเทคโนโลยีและสหวิทยาการ มทร.ล้านนา', 'College of Integrated Science and Technology, RMUTL', 'college', 5)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('หลักสูตรเตรียมวิศวกรรมศาสตร์', 'Pre-Engineering Program'),
  ('หลักสูตรเตรียมบริหารธุรกิจ', 'Pre-Business Administration Program')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (F) วิทยาลัยเทคนิคเชียงใหม่ (Polytechnic Chiang Mai)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('CMTC', 'วิทยาลัยเทคนิคเชียงใหม่', 'Chiang Mai Technical College', 'vocational', 6)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('แผนกวิชาช่างยนต์', 'Automotive Technology'),
  ('แผนกวิชาช่างกลโรงงาน', 'Industrial Machinery'),
  ('แผนกวิชาช่างเชื่อมโลหะ', 'Metal Welding Technology'),
  ('แผนกวิชาช่างไฟฟ้ากำลัง', 'Electrical Power Technology'),
  ('แผนกวิชาช่างอิเล็กทรอนิกส์', 'Electronics Technology'),
  ('แผนกวิชาช่างก่อสร้าง', 'Construction Technology'),
  ('แผนกวิชาช่างเทคนิคคอมพิวเตอร์', 'Computer Technical'),
  ('แผนกวิชาเทคโนโลยีสารสนเทศ', 'Information Technology'),
  ('แผนกวิชาการบัญชี', 'Accounting'),
  ('แผนกวิชาการตลาด', 'Marketing'),
  ('แผนกวิชาคอมพิวเตอร์ธุรกิจ', 'Business Computer'),
  ('แผนกวิชาการโรงแรม', 'Hotel Technology')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (G) วิทยาลัยอาชีวศึกษาเชียงใหม่
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('CMVC', 'วิทยาลัยอาชีวศึกษาเชียงใหม่', 'Chiang Mai Vocational College', 'vocational', 7)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('แผนกวิชาการบัญชี', 'Accounting'),
  ('แผนกวิชาการตลาด', 'Marketing'),
  ('แผนกวิชาคอมพิวเตอร์ธุรกิจ', 'Business Computer'),
  ('แผนกวิชาการเลขานุการ', 'Secretarial Science'),
  ('แผนกวิชาภาษาต่างประเทศ', 'Foreign Languages'),
  ('แผนกวิชาการออกแบบ', 'Design'),
  ('แผนกวิชาอาหารและโภชนาการ', 'Food and Nutrition'),
  ('แผนกวิชาแฟชั่นและสิ่งทอ', 'Fashion and Textiles'),
  ('แผนกวิชาเสริมสวยและตกแต่ง', 'Beauty Culture'),
  ('แผนกวิชาการท่องเที่ยว', 'Tourism'),
  ('แผนกวิชาการโรงแรม', 'Hotel Management'),
  ('แผนกวิชาคหกรรมศาสตร์', 'Home Economics')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (H) วิทยาลัยเกษตรและเทคโนโลยีเชียงใหม่
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('CMATC', 'วิทยาลัยเกษตรและเทคโนโลยีเชียงใหม่', 'Chiang Mai College of Agriculture and Technology', 'vocational', 8)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('แผนกวิชาพืชศาสตร์', 'Plant Science'),
  ('แผนกวิชาสัตวศาสตร์', 'Animal Science'),
  ('แผนกวิชาประมง', 'Fisheries'),
  ('แผนกวิชาช่างกลเกษตร', 'Agricultural Machinery'),
  ('แผนกวิชาเทคโนโลยีการผลิตพืช', 'Crop Production Technology'),
  ('แผนกวิชาธุรกิจเกษตร', 'Agricultural Business')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (I) มหาวิทยาลัยพายัพ (PYU)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('PYU', 'มหาวิทยาลัยพายัพ', 'Payap University', 'university', 9)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะมนุษยศาสตร์และสังคมศาสตร์', 'Faculty of Humanities and Social Sciences'),
  ('คณะบัญชี การเงิน และการธนาคาร', 'Faculty of Accounting, Finance and Banking'),
  ('คณะบริหารธุรกิจ', 'Faculty of Business Administration'),
  ('คณะนิติศาสตร์', 'Faculty of Law'),
  ('คณะนิเทศศาสตร์', 'Faculty of Communication Arts'),
  ('คณะวิทยาศาสตร์และเทคโนโลยี', 'Faculty of Science and Technology'),
  ('คณะสังคมศาสตร์และมนุษยศาสตร์', 'Faculty of Social Sciences and Humanities'),
  ('คณะพยาบาลศาสตร์แมคคอร์มิค', 'McCormick Faculty of Nursing'),
  ('วิทยาลัยดนตรี', 'Music College')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (J) มหาวิทยาลัยนอร์ท-เชียงใหม่ (NCU)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('NCU', 'มหาวิทยาลัยนอร์ท-เชียงใหม่', 'Northern Chiang Mai University', 'university', 10)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะบริหารธุรกิจ', 'Faculty of Business Administration'),
  ('คณะวิทยาศาสตร์สุขภาพ', 'Faculty of Health Sciences'),
  ('คณะวิศวกรรมศาสตร์', 'Faculty of Engineering'),
  ('คณะบัญชี', 'Faculty of Accounting'),
  ('คณะนิติศาสตร์', 'Faculty of Law'),
  ('คณะรัฐศาสตร์', 'Faculty of Political Science'),
  ('คณะศิลปะและการออกแบบ', 'Faculty of Arts and Design')
) AS f(name, name_en);

-- ---------------------------------------------------------------
-- (K) มหาวิทยาลัยฟาร์อีสเทอร์น (FEU)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('FEU', 'มหาวิทยาลัยฟาร์อีสเทอร์น', 'Far Eastern University (Chiang Mai)', 'university', 11)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('คณะบริหารธุรกิจ', 'Faculty of Business Administration'),
  ('คณะบัญชี', 'Faculty of Accounting'),
  ('คณะวิทยาศาสตร์และเทคโนโลยี', 'Faculty of Science and Technology'),
  ('คณะนิติศาสตร์', 'Faculty of Law'),
  ('คณะนิเทศศาสตร์', 'Faculty of Communication Arts')
) AS f(name, name_en);

-- ============================================================
-- 8. SEED MAJORS — สาขาวิชา (เฉพาะบางคณะที่สำคัญ)
-- ============================================================

-- Engineering CMU
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('วิศวกรรมคอมพิวเตอร์', 'Computer Engineering'),
  ('วิศวกรรมซอฟต์แวร์', 'Software Engineering'),
  ('วิศวกรรมไฟฟ้า', 'Electrical Engineering'),
  ('วิศวกรรมเครื่องกล', 'Mechanical Engineering'),
  ('วิศวกรรมโยธา', 'Civil Engineering'),
  ('วิศวกรรมอุตสาหการ', 'Industrial Engineering'),
  ('วิศวกรรมสิ่งแวดล้อม', 'Environmental Engineering'),
  ('วิศวกรรมเคมี', 'Chemical Engineering'),
  ('วิศวกรรมชีวการแพทย์', 'Biomedical Engineering'),
  ('วิศวกรรมวัสดุ', 'Materials Engineering')
) AS m(name, name_en)
WHERE i.short_name = 'CMU' AND f.name = 'คณะวิศวกรรมศาสตร์';

-- Science CMU
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('คณิตศาสตร์', 'Mathematics'),
  ('ฟิสิกส์', 'Physics'),
  ('เคมี', 'Chemistry'),
  ('ชีววิทยา', 'Biology'),
  ('วิทยาการคอมพิวเตอร์', 'Computer Science'),
  ('สถิติ', 'Statistics'),
  ('ธรณีวิทยา', 'Geology'),
  ('เทคนิคการแพทย์', 'Medical Technology')
) AS m(name, name_en)
WHERE i.short_name = 'CMU' AND f.name = 'คณะวิทยาศาสตร์';

-- College of Arts, Media and Technology CMU
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('วิทยาการคอมพิวเตอร์', 'Computer Science'),
  ('วิศวกรรมซอฟต์แวร์', 'Software Engineering'),
  ('แอนิเมชันและวิชวลเอฟเฟกต์', 'Animation and Visual Effects'),
  ('การออกแบบเชิงวัฒนธรรม', 'Cultural Design'),
  ('เทคโนโลยีดิจิทัลเพื่อธุรกิจ', 'Digital Technology for Business')
) AS m(name, name_en)
WHERE i.short_name = 'CMU' AND f.name = 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี';

-- Business Administration CMU
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('การบัญชี', 'Accounting'),
  ('การเงิน', 'Finance'),
  ('การตลาด', 'Marketing'),
  ('การจัดการ', 'Management'),
  ('ระบบสารสนเทศเพื่อการจัดการ', 'Management Information Systems'),
  ('ธุรกิจระหว่างประเทศ', 'International Business')
) AS m(name, name_en)
WHERE i.short_name = 'CMU' AND f.name = 'คณะบริหารธุรกิจ';

-- IT / Computer — CMRU
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('วิทยาการคอมพิวเตอร์', 'Computer Science'),
  ('เทคโนโลยีสารสนเทศ', 'Information Technology'),
  ('วิทยาศาสตร์สิ่งแวดล้อม', 'Environmental Science'),
  ('เคมี', 'Chemistry'),
  ('ชีววิทยา', 'Biology'),
  ('คณิตศาสตร์', 'Mathematics')
) AS m(name, name_en)
WHERE i.short_name = 'CMRU' AND f.name = 'คณะวิทยาศาสตร์และเทคโนโลยี';

-- Management Science CMRU
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('การบัญชี', 'Accounting'),
  ('การตลาด', 'Marketing'),
  ('การบริหารธุรกิจ', 'Business Administration'),
  ('การจัดการทรัพยากรมนุษย์', 'Human Resource Management'),
  ('การท่องเที่ยวและการโรงแรม', 'Tourism and Hotel Management'),
  ('นิเทศศาสตร์', 'Communication Arts')
) AS m(name, name_en)
WHERE i.short_name = 'CMRU' AND f.name = 'คณะวิทยาการจัดการ';

-- RMUTL Engineering
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('วิศวกรรมคอมพิวเตอร์', 'Computer Engineering'),
  ('วิศวกรรมไฟฟ้า', 'Electrical Engineering'),
  ('วิศวกรรมเครื่องกล', 'Mechanical Engineering'),
  ('วิศวกรรมโยธา', 'Civil Engineering'),
  ('วิศวกรรมอุตสาหการ', 'Industrial Engineering'),
  ('วิศวกรรมโทรคมนาคม', 'Telecommunication Engineering')
) AS m(name, name_en)
WHERE i.short_name = 'RMUTL' AND f.name = 'คณะวิศวกรรมศาสตร์';

-- CMTC (Technical College) — สาขาหลักทั้งหมด
INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('ช่างยนต์', 'Automotive Technology'),
  ('เทคนิคยานยนต์', 'Automotive Technician')
) AS m(name, name_en)
WHERE i.short_name = 'CMTC' AND f.name = 'แผนกวิชาช่างยนต์';

INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('ช่างไฟฟ้ากำลัง', 'Electrical Power'),
  ('ไฟฟ้าและอิเล็กทรอนิกส์', 'Electrical and Electronics')
) AS m(name, name_en)
WHERE i.short_name = 'CMTC' AND f.name = 'แผนกวิชาช่างไฟฟ้ากำลัง';

INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('เทคโนโลยีสารสนเทศ', 'Information Technology'),
  ('เทคนิคคอมพิวเตอร์', 'Computer Technical')
) AS m(name, name_en)
WHERE i.short_name = 'CMTC' AND f.name = 'แผนกวิชาเทคโนโลยีสารสนเทศ';

-- ---------------------------------------------------------------
-- (G) วิทยาลัยเทคโนโลยีโปลิเทคนิคลานนา เชียงใหม่ (Lanna Poly)
-- ---------------------------------------------------------------
WITH inst AS (
  INSERT INTO public.institutions (short_name, full_name, full_name_en, type, sort_order)
  VALUES ('Lanna Poly', 'วิทยาลัยเทคโนโลยีโปลิเทคนิคลานนา เชียงใหม่', 'Lanna Polytechnic Chiang Mai Technological College', 'vocational', 7)
  RETURNING id
)
INSERT INTO public.faculties (institution_id, name, name_en) SELECT id, f.name, f.name_en FROM inst, (VALUES
  ('ประเภทวิชาอุตสาหกรรม', 'Industry'),
  ('ประเภทวิชาเทคโนโลยีสารสนเทศและการสื่อสาร', 'Information and Communication Technology'),
  ('ประเภทวิชาพาณิชยกรรม', 'Commerce'),
  ('ประเภทวิชาอุตสาหกรรมท่องเที่ยว', 'Tourism Industry')
) AS f(name, name_en);

INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('สาขางานยานยนต์ (ช่างยนต์)', 'Automotive Technology'),
  ('สาขางานไฟฟ้ากำลัง (ช่างไฟฟ้า)', 'Electrical Power'),
  ('สาขางานอิเล็กทรอนิกส์ (ช่างอิเล็กทรอนิกส์)', 'Electronics'),
  ('สาขาวิชาก่อสร้าง (ช่างก่อสร้าง)', 'Construction'),
  ('สาขางานสถาปัตยกรรม', 'Architecture')
) AS m(name, name_en)
WHERE i.short_name = 'Lanna Poly' AND f.name = 'ประเภทวิชาอุตสาหกรรม';

INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('สาขาวิชาเทคโนโลยีสารสนเทศ', 'Information Technology')
) AS m(name, name_en)
WHERE i.short_name = 'Lanna Poly' AND f.name = 'ประเภทวิชาเทคโนโลยีสารสนเทศและการสื่อสาร';

INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('สาขาวิชาพณิชยการ', 'Business and Commerce')
) AS m(name, name_en)
WHERE i.short_name = 'Lanna Poly' AND f.name = 'ประเภทวิชาพาณิชยกรรม';

INSERT INTO public.majors (faculty_id, name, name_en)
SELECT f.id, m.name, m.name_en
FROM public.faculties f
JOIN public.institutions i ON i.id = f.institution_id
CROSS JOIN (VALUES
  ('สาขาวิชาการท่องเที่ยวและโรงแรม', 'Tourism and Hotel Management')
) AS m(name, name_en)
WHERE i.short_name = 'Lanna Poly' AND f.name = 'ประเภทวิชาอุตสาหกรรมท่องเที่ยว';

-- ============================================================
-- DONE
-- ============================================================
