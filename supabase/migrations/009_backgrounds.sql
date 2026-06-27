-- ============================================================
-- Add Background URL and Storage Bucket
-- ============================================================

-- 1. Add background_url to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS background_url TEXT;

-- 2. Create Storage Bucket for backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage RLS Policies
-- Allow public access to view backgrounds
CREATE POLICY "Background images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'backgrounds' );

-- Allow authenticated users to upload their own background
CREATE POLICY "Users can upload their own background."
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backgrounds' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own background
CREATE POLICY "Users can update their own background."
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'backgrounds' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own background
CREATE POLICY "Users can delete their own background."
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backgrounds' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
