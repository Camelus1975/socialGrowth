-- =========================================================================================
-- SCHEMA V3: User Profile & Avatars Storage
-- Execute this script in your Supabase SQL Editor.
-- =========================================================================================

-- 1. Create the 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Allow public read access to the avatars bucket
CREATE POLICY "Avatar Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 3. Allow authenticated users to upload their own avatars
CREATE POLICY "Avatar Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 4. Allow users to update/overwrite their own avatars
CREATE POLICY "Avatar Auth Update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- 5. Allow users to delete their own avatars
CREATE POLICY "Avatar Auth Delete" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
