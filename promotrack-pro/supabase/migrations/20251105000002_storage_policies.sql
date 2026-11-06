-- ====================================================================
-- MIGRATION 3: Supabase Storage Bucket & Policies for Promotion Images
-- Version: 20251105000002_storage_policies.sql
-- Note: Prepared for review before execution. Do not execute against production without approval.
-- ====================================================================

-- 1. Create the storage bucket for promotion images if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promotion-images',
  'promotion-images',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage Policies

-- Anyone authenticated can view promotion images
CREATE POLICY "promotion_images_read_policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'promotion-images');

-- Only Admins can upload promotion images
CREATE POLICY "promotion_images_insert_admin_only"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'promotion-images' AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Only Admins can update/replace promotion images
CREATE POLICY "promotion_images_update_admin_only"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'promotion-images' AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Only Admins can delete promotion images
CREATE POLICY "promotion_images_delete_admin_only"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'promotion-images' AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
