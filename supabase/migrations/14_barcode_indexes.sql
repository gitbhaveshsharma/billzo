-- ============================================================================
-- Migration: Barcode indexes for instant POS fallback lookup
-- These indexes ensure that even on cache miss, DB barcode lookup is fast
-- ============================================================================

-- Product primary barcode (most common scan path)
CREATE INDEX IF NOT EXISTS idx_products_barcode
    ON products (store_id, barcode)
    WHERE barcode IS NOT NULL AND is_active = true;

-- Product variants barcode
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode
    ON product_variants (store_id, barcode)
    WHERE barcode IS NOT NULL AND is_active = true;

-- Additional barcodes table
CREATE INDEX IF NOT EXISTS idx_product_barcodes_barcode
    ON product_barcodes (store_id, barcode)
    WHERE is_active = true;

-- Alternate barcodes (GIN for array contains)
CREATE INDEX IF NOT EXISTS idx_products_alternate_barcodes
    ON products USING GIN (alternate_barcodes)
    WHERE alternate_barcodes IS NOT NULL AND is_active = true;
