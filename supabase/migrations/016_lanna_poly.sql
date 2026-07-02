-- 016_lanna_poly.sql
-- เพิ่มข้อมูล วิทยาลัยเทคโนโลยีโปลิเทคนิคลานนา เชียงใหม่ พร้อมประเภทวิชาและสาขางาน

DO $$
DECLARE
    inst_id UUID;
    fac_ind_id UUID;
    fac_ict_id UUID;
    fac_com_id UUID;
    fac_tour_id UUID;
BEGIN
    -- ลบข้อมูลเก่าทิ้ง (ถ้ามี) เพื่อไม่ให้ซ้ำซ้อน
    DELETE FROM public.institutions WHERE short_name = 'Lanna Poly' AND province = 'เชียงใหม่';

    -- แทรกข้อมูลสถาบัน
    INSERT INTO public.institutions (short_name, full_name, full_name_en, type, province, sort_order)
    VALUES (
        'Lanna Poly', 
        'วิทยาลัยเทคโนโลยีโปลิเทคนิคลานนา เชียงใหม่', 
        'Lanna Polytechnic Chiang Mai Technological College', 
        'vocational', 
        'เชียงใหม่', 
        5
    )
    RETURNING id INTO inst_id;

    -- 1. ประเภทวิชาอุตสาหกรรม
    INSERT INTO public.faculties (institution_id, name, name_en) 
    VALUES (inst_id, 'ประเภทวิชาอุตสาหกรรม', 'Industry') 
    RETURNING id INTO fac_ind_id;

    INSERT INTO public.majors (faculty_id, name, name_en) VALUES 
        (fac_ind_id, 'สาขางานยานยนต์ (ช่างยนต์)', 'Automotive Technology'),
        (fac_ind_id, 'สาขางานไฟฟ้ากำลัง (ช่างไฟฟ้า)', 'Electrical Power'),
        (fac_ind_id, 'สาขางานอิเล็กทรอนิกส์ (ช่างอิเล็กทรอนิกส์)', 'Electronics'),
        (fac_ind_id, 'สาขาวิชาก่อสร้าง (ช่างก่อสร้าง)', 'Construction'),
        (fac_ind_id, 'สาขางานสถาปัตยกรรม', 'Architecture');

    -- 2. ประเภทวิชาเทคโนโลยีสารสนเทศและการสื่อสาร
    INSERT INTO public.faculties (institution_id, name, name_en) 
    VALUES (inst_id, 'ประเภทวิชาเทคโนโลยีสารสนเทศและการสื่อสาร', 'Information and Communication Technology') 
    RETURNING id INTO fac_ict_id;

    INSERT INTO public.majors (faculty_id, name, name_en) VALUES 
        (fac_ict_id, 'สาขาวิชาเทคโนโลยีสารสนเทศ', 'Information Technology');

    -- 3. ประเภทวิชาพาณิชยกรรม
    INSERT INTO public.faculties (institution_id, name, name_en) 
    VALUES (inst_id, 'ประเภทวิชาพาณิชยกรรม', 'Commerce') 
    RETURNING id INTO fac_com_id;

    INSERT INTO public.majors (faculty_id, name, name_en) VALUES 
        (fac_com_id, 'สาขาวิชาพณิชยการ', 'Business and Commerce');

    -- 4. ประเภทวิชาอุตสาหกรรมท่องเที่ยว
    INSERT INTO public.faculties (institution_id, name, name_en) 
    VALUES (inst_id, 'ประเภทวิชาอุตสาหกรรมท่องเที่ยว', 'Tourism Industry') 
    RETURNING id INTO fac_tour_id;

    INSERT INTO public.majors (faculty_id, name, name_en) VALUES 
        (fac_tour_id, 'สาขาวิชาการท่องเที่ยวและโรงแรม', 'Tourism and Hotel Management');

END $$;
