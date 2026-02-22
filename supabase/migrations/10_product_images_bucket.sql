-- ============================================================================
-- PRODUCT IMAGES STORAGE BUCKET
-- Creates the `product-images` Supabase Storage bucket and configures
-- RLS policies so authenticated store users can upload, read, and manage
-- their own product images while keeping other stores' images private.
-- ============================================================================

-- ============================================================================
-- CREATE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,                              -- publicly readable via CDN URL
    5242880,                           -- 5 MB per file
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
    SET file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- RLS POLICIES
-- Path convention: {store_id}/{product_id}/{filename}
-- This allows scoping all policies by store_id prefix.
-- ============================================================================

-- Allow any authenticated user to read product images (bucket is public anyway)
CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

-- Allow authenticated users to upload images into their own store folder
CREATE POLICY "Store users can upload product images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        -- Path must start with the user's store_id
        AND (storage.foldername(name))[1] = (
            SELECT store_id::text
            FROM store_users
            WHERE user_id = auth.uid()
              AND is_active = true
            LIMIT 1
        )
    );

-- Allow authenticated users to update (replace) images in their own store folder
CREATE POLICY "Store users can update product images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT store_id::text
            FROM store_users
            WHERE user_id = auth.uid()
              AND is_active = true
            LIMIT 1
        )
    );

-- Allow authenticated users to delete images in their own store folder
CREATE POLICY "Store users can delete product images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT store_id::text
            FROM store_users
            WHERE user_id = auth.uid()
              AND is_active = true
            LIMIT 1
        )
    );

-- Super admins can manage all product images
CREATE POLICY "Super admins can manage all product images"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'product-images'
        AND public.is_super_admin()
    );

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ✅ Product Images Storage Bucket Setup Complete
    ──────────────────────────────────────────────
    Bucket  : product-images
    Public  : true  (CDN readable without auth)
    Max size: 5 MB per file
    Types   : JPEG, PNG, WebP, GIF, SVG

    Path convention:
        {store_id}/{product_id}/{filename}

    RLS Policies:
        • Public    → SELECT  (read CDN URLs)
        • Auth users → INSERT  (own store folder only)
        • Auth users → UPDATE  (own store folder only)
        • Auth users → DELETE  (own store folder only)
        • Super admin → ALL
    ';
END $$;
