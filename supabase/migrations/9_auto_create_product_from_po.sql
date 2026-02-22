-- ============================================================================
-- AUTO-CREATE PRODUCT FROM PURCHASE ORDER ITEM
-- When a PO item references a product_id that doesn't exist in `products`,
-- automatically create a minimal product record so the FK constraint is
-- satisfied.  This lets users add completely new products via purchase
-- orders without having to pre-create them in the Products catalogue.
-- ============================================================================

-- ============================================================================
-- FUNCTION: auto_create_product_from_po_item
-- Runs BEFORE INSERT on purchase_order_items.
-- If NEW.product_id is NOT found in products, inserts a new product row
-- using data carried on the PO item (name, sku, hsn, prices, gst, unit).
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_create_product_from_po_item()
RETURNS TRIGGER AS $$
DECLARE
    v_product_exists BOOLEAN;
    v_effective_mrp  DECIMAL(12,2);
    v_user_id        UUID;
BEGIN
    -- Quick check — does the product already exist?
    SELECT EXISTS(SELECT 1 FROM products WHERE id = NEW.product_id)
      INTO v_product_exists;

    IF v_product_exists THEN
        -- Product exists. Optionally update purchase_price to latest.
        UPDATE products
           SET purchase_price = NEW.unit_price,
               updated_at     = NOW()
         WHERE id = NEW.product_id
           AND (purchase_price IS NULL OR purchase_price <> NEW.unit_price);
        RETURN NEW;
    END IF;

    -- ── Product does NOT exist — auto-create ──

    -- MRP is NOT NULL in products table; fall back to unit_price
    v_effective_mrp := COALESCE(NEW.mrp, NEW.unit_price);

    -- Try to get current auth user (may be NULL in some contexts)
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO products (
        id,
        store_id,
        product_code,
        barcode,
        name,
        hsn_code,
        gst_percentage,
        cess_percentage,
        mrp,
        selling_price,
        purchase_price,
        unit_id,
        is_active,
        is_taxable,
        is_batch_tracked,
        created_at,
        updated_at,
        created_by
    ) VALUES (
        NEW.product_id,
        NEW.store_id,
        NEW.product_code,
        NULLIF(NEW.barcode, ''),               -- NULL if empty string
        NEW.product_name,
        NULLIF(NEW.hsn_code, ''),
        COALESCE(NEW.gst_percentage, 0),
        COALESCE(NEW.cess_percentage, 0),
        v_effective_mrp,
        v_effective_mrp,                        -- selling_price defaults to MRP
        NEW.unit_price,                         -- last purchase price
        NEW.unit_id,                            -- FK to units_of_measure (nullable)
        true,                                   -- is_active
        COALESCE(NEW.gst_percentage, 0) > 0,   -- is_taxable if GST > 0
        (NEW.batch_number IS NOT NULL AND NEW.batch_number <> ''),
        NOW(),
        NOW(),
        v_user_id
    );

    RAISE LOG '[PO-AutoProduct] Created product % (%) from PO item insert',
        NEW.product_name, NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- TRIGGER: Fires BEFORE INSERT on purchase_order_items
-- ============================================================================
DROP TRIGGER IF EXISTS auto_create_product_before_po_item ON purchase_order_items;

CREATE TRIGGER auto_create_product_before_po_item
    BEFORE INSERT ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_product_from_po_item();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION auto_create_product_from_po_item() IS
    'BEFORE INSERT trigger on purchase_order_items. '
    'Auto-creates a product row when the referenced product_id does not exist, '
    'using data from the PO item (name, SKU, HSN, prices, GST, unit). '
    'If the product already exists, updates its purchase_price to the latest value.';
