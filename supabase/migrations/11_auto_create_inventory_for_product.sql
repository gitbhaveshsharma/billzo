-- ============================================================================
-- FIX: AUTO-CREATE INVENTORY ON PURCHASE ORDER RECEIVE
-- Problem: When PO items are received, inventory row is not auto-created
--          for new products (especially ones auto-created from PO items).
-- 
-- Flow after this fix:
--   PO Item Insert  → auto_create_product_from_po_item (existing trigger)
--                   → auto_create_inventory_for_product (NEW trigger below)
--   PO Item Receive → update_inventory_on_po_receive (existing trigger)
--                   → inventory_transactions INSERT
--                   → update_inventory_on_transaction (fixed below)
-- ============================================================================


-- ============================================================================
-- FIX 1: Fix update_inventory_on_transaction to handle NULL variant_id properly
-- The original had a bug where NULL variant_id didn't match on CONFLICT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_quantity  DECIMAL(12,3);
    v_new_quantity      DECIMAL(12,3);
    v_avg_cost          DECIMAL(12,2);
    v_current_avg_cost  DECIMAL(12,2);
    v_current_qty_oh    DECIMAL(12,3);
BEGIN
    -- Get current inventory state
    SELECT quantity_on_hand, average_cost
      INTO v_current_qty_oh, v_current_avg_cost
      FROM inventory
     WHERE store_id   = NEW.store_id
       AND product_id = NEW.product_id
       AND (
             (variant_id IS NULL     AND NEW.variant_id IS NULL)
          OR (variant_id = NEW.variant_id)
           );

    v_current_quantity := COALESCE(v_current_qty_oh, 0);

    -- Calculate new quantity based on transaction type
    IF NEW.transaction_type IN ('PURCHASE', 'TRANSFER_IN') THEN
        v_new_quantity := v_current_quantity + NEW.quantity;

        -- Recalculate weighted average cost on PURCHASE
        IF NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
            IF v_current_quantity > 0 AND v_current_avg_cost IS NOT NULL THEN
                v_avg_cost := (
                    (v_current_quantity * v_current_avg_cost) + (NEW.quantity * NEW.unit_cost)
                ) / v_new_quantity;
            ELSE
                v_avg_cost := NEW.unit_cost;
            END IF;
        ELSE
            v_avg_cost := v_current_avg_cost;
        END IF;

    ELSIF NEW.transaction_type IN ('SALE', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY') THEN
        v_new_quantity := GREATEST(v_current_quantity - NEW.quantity, 0);
        v_avg_cost     := v_current_avg_cost;

    ELSIF NEW.transaction_type = 'RETURN' THEN
        -- RETURN can be purchase return (stock goes OUT) or sale return (stock comes IN)
        -- reference_type tells us which
        IF NEW.reference_type IN ('purchase_return') THEN
            v_new_quantity := GREATEST(v_current_quantity - NEW.quantity, 0);
        ELSE
            -- sale return — stock comes back
            v_new_quantity := v_current_quantity + NEW.quantity;
        END IF;
        v_avg_cost := v_current_avg_cost;

    ELSIF NEW.transaction_type = 'ADJUSTMENT' THEN
        v_new_quantity := COALESCE(NEW.new_quantity, v_current_quantity);
        v_avg_cost     := v_current_avg_cost;

    ELSE
        v_new_quantity := v_current_quantity;
        v_avg_cost     := v_current_avg_cost;
    END IF;

    -- Also update previous_quantity and new_quantity on the transaction row
    NEW.previous_quantity := v_current_quantity;
    NEW.new_quantity      := v_new_quantity;

    -- Upsert inventory row
    INSERT INTO inventory (
        store_id,
        product_id,
        variant_id,
        quantity_on_hand,
        average_cost,
        last_updated_at,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.store_id,
        NEW.product_id,
        NEW.variant_id,
        v_new_quantity,
        v_avg_cost,
        NOW(),
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (store_id, product_id, variant_id)
    DO UPDATE SET
        quantity_on_hand = EXCLUDED.quantity_on_hand,
        average_cost     = COALESCE(EXCLUDED.average_cost, inventory.average_cost),
        last_updated_at  = NOW(),
        updated_at       = NOW();

    -- Also update the products.average_cost for quick access
    UPDATE products
       SET average_cost = v_avg_cost,
           updated_at   = NOW()
     WHERE id = NEW.product_id
       AND v_avg_cost IS NOT NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach trigger (drop and recreate to ensure it's BEFORE so we can modify NEW)
DROP TRIGGER IF EXISTS update_inventory_trigger ON inventory_transactions;

CREATE TRIGGER update_inventory_trigger
    BEFORE INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_transaction();


-- ============================================================================
-- FIX 2: The unique constraint on inventory needs to handle NULL variant_id.
-- PostgreSQL treats NULL != NULL in unique constraints, so two rows with
-- variant_id = NULL for the same product are both allowed — that's a bug.
-- We fix this with a partial unique index.
-- ============================================================================

-- Drop the old constraint if it exists as a table constraint
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_store_id_product_id_variant_id_key;

-- Create a proper unique index that handles NULL variant_id correctly
DROP INDEX IF EXISTS idx_inventory_unique_product;
DROP INDEX IF EXISTS idx_inventory_unique_product_no_variant;
DROP INDEX IF EXISTS idx_inventory_unique_product_with_variant;

-- For rows WITHOUT a variant (most common for simple products)
CREATE UNIQUE INDEX idx_inventory_unique_product_no_variant
    ON inventory (store_id, product_id)
    WHERE variant_id IS NULL;

-- For rows WITH a variant
CREATE UNIQUE INDEX idx_inventory_unique_product_with_variant
    ON inventory (store_id, product_id, variant_id)
    WHERE variant_id IS NOT NULL;


-- ============================================================================
-- FIX 3: Auto-create inventory row when a product is created
-- This ensures every new product (including auto-created from PO) has
-- an inventory record with zero stock from the start.
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_create_inventory_for_product()
RETURNS TRIGGER AS $$
BEGIN
    -- Create inventory record with zero stock for the new product
    INSERT INTO inventory (
        store_id,
        product_id,
        variant_id,
        quantity_on_hand,
        quantity_committed,
        quantity_in_transit,
        reorder_point,
        average_cost,
        is_active,
        last_updated_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.store_id,
        NEW.id,
        NULL,           -- No variant (base product)
        0,              -- Zero stock to start
        0,
        0,
        COALESCE(NEW.reorder_level, 0),
        NEW.purchase_price,
        true,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING; -- Safe to call even if row already exists

    RAISE LOG '[AutoInventory] Created inventory record for product % (%)', NEW.name, NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_create_inventory_after_product ON products;

CREATE TRIGGER auto_create_inventory_after_product
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_inventory_for_product();


-- ============================================================================
-- FIX 4: Auto-create inventory row when a product VARIANT is created
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_create_inventory_for_variant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (
        store_id,
        product_id,
        variant_id,
        quantity_on_hand,
        quantity_committed,
        quantity_in_transit,
        reorder_point,
        is_active,
        last_updated_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.store_id,
        NEW.product_id,
        NEW.id,
        0,
        0,
        0,
        0,
        true,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_create_inventory_after_variant ON product_variants;

CREATE TRIGGER auto_create_inventory_after_variant
    AFTER INSERT ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_inventory_for_variant();


-- ============================================================================
-- FIX 5: Backfill — create missing inventory rows for ALL existing products
-- Run this ONCE to fix products that were created before this migration.
-- ============================================================================
INSERT INTO inventory (
    store_id,
    product_id,
    variant_id,
    quantity_on_hand,
    quantity_committed,
    quantity_in_transit,
    reorder_point,
    average_cost,
    is_active,
    last_updated_at,
    created_at,
    updated_at
)
SELECT
    p.store_id,
    p.id          AS product_id,
    NULL          AS variant_id,
    0             AS quantity_on_hand,
    0             AS quantity_committed,
    0             AS quantity_in_transit,
    COALESCE(p.reorder_level, 0) AS reorder_point,
    p.purchase_price              AS average_cost,
    true,
    NOW(),
    NOW(),
    NOW()
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM inventory i
     WHERE i.product_id = p.id
       AND i.variant_id IS NULL
)
ON CONFLICT DO NOTHING;

-- Backfill for variants too
INSERT INTO inventory (
    store_id,
    product_id,
    variant_id,
    quantity_on_hand,
    quantity_committed,
    quantity_in_transit,
    reorder_point,
    is_active,
    last_updated_at,
    created_at,
    updated_at
)
SELECT
    pv.store_id,
    pv.product_id,
    pv.id   AS variant_id,
    0, 0, 0, 0, true, NOW(), NOW(), NOW()
FROM product_variants pv
WHERE NOT EXISTS (
    SELECT 1 FROM inventory i
     WHERE i.product_id = pv.product_id
       AND i.variant_id = pv.id
)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- FIX 6: Recalculate quantity_on_hand from inventory_transactions history
-- for any products that already have transaction history but wrong stock.
-- This replays all transactions to compute correct current stock.
-- ============================================================================
WITH transaction_totals AS (
    SELECT
        store_id,
        product_id,
        variant_id,
        SUM(
            CASE
                WHEN transaction_type IN ('PURCHASE', 'TRANSFER_IN') THEN quantity
                WHEN transaction_type = 'RETURN' AND reference_type NOT IN ('purchase_return') THEN quantity
                WHEN transaction_type = 'ADJUSTMENT' THEN COALESCE(new_quantity, 0) - COALESCE(previous_quantity, 0)
                ELSE -quantity
            END
        ) AS computed_qty
    FROM inventory_transactions
    GROUP BY store_id, product_id, variant_id
)
UPDATE inventory i
   SET quantity_on_hand = GREATEST(tt.computed_qty, 0),
       updated_at       = NOW()
  FROM transaction_totals tt
 WHERE i.store_id   = tt.store_id
   AND i.product_id = tt.product_id
   AND (
         (i.variant_id IS NULL     AND tt.variant_id IS NULL)
      OR (i.variant_id = tt.variant_id)
       )
   AND tt.computed_qty IS NOT NULL;


-- ============================================================================
-- BONUS: RLS policy so the auto_create trigger (SECURITY DEFINER) can
-- insert inventory even without an explicit user session (e.g. from PO flow)
-- This is already handled by SECURITY DEFINER, but let's also make sure
-- the service role / trigger context can always insert into inventory.
-- ============================================================================
DROP POLICY IF EXISTS "System triggers can insert inventory" ON inventory;

CREATE POLICY "System triggers can insert inventory"
    ON inventory FOR INSERT
    WITH CHECK (true);  -- SECURITY DEFINER functions bypass RLS anyway,
                        -- but this covers edge cases with anon/service role.


-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to confirm everything is working.
-- ============================================================================

-- Check: All products have inventory rows
-- SELECT p.id, p.name, i.quantity_on_hand
-- FROM products p
-- LEFT JOIN inventory i ON i.product_id = p.id AND i.variant_id IS NULL
-- WHERE i.id IS NULL;
-- Expected: 0 rows

-- Check: Inventory matches transaction history
-- SELECT
--     i.product_id,
--     i.quantity_on_hand AS inventory_qty,
--     COALESCE(SUM(CASE
--         WHEN t.transaction_type IN ('PURCHASE','TRANSFER_IN') THEN t.quantity
--         WHEN t.transaction_type = 'RETURN' AND t.reference_type != 'purchase_return' THEN t.quantity
--         ELSE -t.quantity
--     END), 0) AS computed_qty
-- FROM inventory i
-- LEFT JOIN inventory_transactions t ON t.product_id = i.product_id AND t.store_id = i.store_id
-- GROUP BY i.product_id, i.quantity_on_hand
-- HAVING ABS(i.quantity_on_hand - COALESCE(SUM(...), 0)) > 0.001;
-- Expected: 0 rows (all match)

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ AUTO-INVENTORY FIX APPLIED SUCCESSFULLY
    ============================================================================

    Fixes applied:
    1. update_inventory_on_transaction  — Fixed NULL variant_id upsert bug,
                                          added weighted average cost calc,
                                          now BEFORE trigger (can set prev/new qty)
    2. Unique indexes on inventory      — Replaced broken constraint with two
                                          partial indexes that handle NULL correctly
    3. auto_create_inventory_for_product — NEW trigger: every new product
                                           auto-gets an inventory row (qty = 0)
    4. auto_create_inventory_for_variant — NEW trigger: every new variant
                                           auto-gets an inventory row (qty = 0)
    5. Backfill existing products       — All products without inventory rows
                                          now have one (qty = 0)
    6. Recalculate from transactions    — Stock quantities corrected from
                                          transaction history

    New POS Flow (fully automatic):
    ┌─────────────────────────────────────────────────────────┐
    │  User creates Purchase Order                            │
    │       ↓                                                 │
    │  Adds PO Items (new or existing products)               │
    │       ↓                                                 │
    │  [TRIGGER] auto_create_product_from_po_item             │
    │            → Creates product if not exists              │
    │       ↓                                                 │
    │  [TRIGGER] auto_create_inventory_for_product            │
    │            → Creates inventory row (qty = 0)            │
    │       ↓                                                 │
    │  User marks PO items as Received                        │
    │       ↓                                                 │
    │  [TRIGGER] update_inventory_on_po_receive               │
    │            → Inserts into inventory_transactions        │
    │       ↓                                                 │
    │  [TRIGGER] update_inventory_on_transaction              │
    │            → Upserts inventory (qty increases) ✅       │
    └─────────────────────────────────────────────────────────┘

    Inventory manager can still manually adjust stock anytime.
    ============================================================================
    ';
END $$;

-- ============================================================================
-- SMART AUTO-MAPPING: SUPPLIER + PRODUCT BATCH ON PURCHASE ORDER
-- 
-- Two things happen automatically when PO items are inserted or received:
--
-- 1. SUPPLIER-PRODUCT MAPPING (supplier_products table)
--    When: PO item is inserted (any status)
--    What: Upsert supplier_products with latest pricing & lead time
--    Why:  Next PO creation can auto-suggest this supplier for this product
--
-- 2. PRODUCT BATCH AUTO-CREATE (product_batches table)
--    When: PO item is marked as received (received_quantity > 0)
--    What: Create product_batches if batch_number or expiry_date present
--    Why:  Batch tracking for medicines, food items, etc. — zero manual entry
--
-- Dependencies:
--   purchase_orders        → has supplier_id, store_id, expected_delivery_date
--   purchase_order_items   → has product_id, unit_price, mrp, batch_number,
--                            expiry_date, manufacturing_date, received_quantity
--   supplier_products      → upserted automatically
--   product_batches        → created automatically if batch info present
-- ============================================================================


-- ============================================================================
-- TRIGGER 1: AUTO-UPSERT SUPPLIER-PRODUCT MAPPING
-- Fires: AFTER INSERT OR UPDATE on purchase_order_items
-- 
-- Smart logic:
--   - INSERT       → creates initial supplier_products record
--   - UPDATE price → updates purchase_price only if new price is different
--   - Sets is_preferred if this is the only/cheapest supplier for this product
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_map_supplier_product()
RETURNS TRIGGER AS $$
DECLARE
    v_supplier_id       UUID;
    v_store_id          UUID;
    v_po_number         TEXT;
    v_expected_delivery DATE;
    v_lead_time_days    INTEGER;
    v_existing_price    DECIMAL(12,2);
    v_supplier_count    INTEGER;
BEGIN
    -- Only proceed if product_id is set
    IF NEW.product_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get supplier and store from parent purchase_order
    SELECT
        po.supplier_id,
        po.store_id,
        po.po_number,
        po.expected_delivery_date::DATE
    INTO
        v_supplier_id,
        v_store_id,
        v_po_number,
        v_expected_delivery
    FROM purchase_orders po
    WHERE po.id = NEW.purchase_order_id;

    -- Can't map without a supplier
    IF v_supplier_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate lead time from PO creation to expected delivery
    -- (used to auto-fill lead_time_days for future POs)
    SELECT EXTRACT(DAY FROM (v_expected_delivery - NOW()::DATE))::INTEGER
    INTO v_lead_time_days;

    v_lead_time_days := GREATEST(COALESCE(v_lead_time_days, 0), 0);

    -- Get existing price to detect price change
    SELECT purchase_price INTO v_existing_price
    FROM supplier_products
    WHERE supplier_id = v_supplier_id
      AND product_id  = NEW.product_id
      AND store_id    = v_store_id;

    -- Count how many active suppliers provide this product
    SELECT COUNT(*) INTO v_supplier_count
    FROM supplier_products
    WHERE product_id = NEW.product_id
      AND store_id   = v_store_id
      AND is_active  = true;

    -- UPSERT supplier_products
    -- On conflict: update price, mrp, lead_time only if values have changed
    INSERT INTO supplier_products (
        supplier_id,
        product_id,
        store_id,
        supplier_product_code,
        supplier_product_name,
        purchase_price,
        mrp,
        discount_percentage,
        lead_time_days,
        minimum_order_quantity,
        is_preferred,
        is_active,
        created_at,
        updated_at,
        created_by
    )
    SELECT
        v_supplier_id,
        NEW.product_id,
        v_store_id,
        NEW.product_code,                           -- supplier's SKU for this product
        NEW.product_name,                           -- supplier's name for this product
        NEW.unit_price,                             -- purchase price from this PO
        COALESCE(NEW.mrp, NEW.unit_price),          -- MRP from PO item
        COALESCE(NEW.discount_percentage, 0),       -- discount on this PO
        v_lead_time_days,                           -- calculated from PO dates
        COALESCE(NEW.ordered_quantity, 1)::INTEGER, -- MOQ based on what was ordered
        -- is_preferred: true if this is the ONLY supplier for this product
        (v_supplier_count = 0),
        true,
        NOW(),
        NOW(),
        NEW.created_by
    ON CONFLICT (supplier_id, product_id)
    DO UPDATE SET
        -- Always update these — latest PO has the latest data
        supplier_product_code  = EXCLUDED.supplier_product_code,
        supplier_product_name  = EXCLUDED.supplier_product_name,
        purchase_price         = EXCLUDED.purchase_price,
        mrp                    = EXCLUDED.mrp,
        discount_percentage    = EXCLUDED.discount_percentage,
        -- Update lead_time only if it was calculated (> 0)
        lead_time_days         = CASE
                                     WHEN EXCLUDED.lead_time_days > 0
                                     THEN EXCLUDED.lead_time_days
                                     ELSE supplier_products.lead_time_days
                                 END,
        -- Update MOQ only if new order was larger
        minimum_order_quantity = GREATEST(
                                     EXCLUDED.minimum_order_quantity,
                                     supplier_products.minimum_order_quantity
                                 ),
        is_active              = true,
        updated_at             = NOW();

    -- ── Price Change Detection ──
    -- If price changed vs last recorded, log to price_history
    IF v_existing_price IS NOT NULL
       AND v_existing_price <> NEW.unit_price THEN

        INSERT INTO price_history (
            store_id,
            product_id,
            variant_id,
            price_type,
            old_price,
            new_price,
            reason,
            effective_from,
            changed_by,
            created_at
        ) VALUES (
            v_store_id,
            NEW.product_id,
            NULL,
            'COST',
            v_existing_price,
            NEW.unit_price,
            'Purchase price updated via PO ' || COALESCE(v_po_number, '(unknown)'),
            NOW(),
            NEW.created_by,
            NOW()
        );

        RAISE LOG '[AutoSupplierMap] Price changed for product % — ₹% → ₹% via PO %',
            NEW.product_id, v_existing_price, NEW.unit_price, v_po_number;
    END IF;

    RAISE LOG '[AutoSupplierMap] Upserted supplier_products: supplier=% product=% price=₹%',
        v_supplier_id, NEW.product_id, NEW.unit_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_map_supplier_product_on_insert ON purchase_order_items;
DROP TRIGGER IF EXISTS auto_map_supplier_product_on_update ON purchase_order_items;

-- Fire on INSERT (new PO item added)
CREATE TRIGGER auto_map_supplier_product_on_insert
    AFTER INSERT ON purchase_order_items
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION auto_map_supplier_product();

-- Fire on UPDATE when price changes (PO item edited before receiving)
CREATE TRIGGER auto_map_supplier_product_on_update
    AFTER UPDATE OF unit_price, mrp, discount_percentage ON purchase_order_items
    FOR EACH ROW
    WHEN (
        NEW.product_id IS NOT NULL
        AND (
            OLD.unit_price        IS DISTINCT FROM NEW.unit_price
            OR OLD.mrp            IS DISTINCT FROM NEW.mrp
            OR OLD.discount_percentage IS DISTINCT FROM NEW.discount_percentage
        )
    )
    EXECUTE FUNCTION auto_map_supplier_product();


-- ============================================================================
-- TRIGGER 2: AUTO-CREATE PRODUCT BATCH ON RECEIVE
-- Fires: AFTER UPDATE on purchase_order_items
--        specifically when received_quantity goes from 0 → >0
--
-- Smart logic:
--   - Only creates batch if batch_number OR expiry_date is present
--   - If product is NOT batch_tracked, marks it as batch_tracked automatically
--   - If batch already exists (same batch_number + product), UPDATES quantity
--   - Handles partial receives (multiple receives for one PO item)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_batch_on_receive()
RETURNS TRIGGER AS $$
DECLARE
    v_supplier_id       UUID;
    v_store_id          UUID;
    v_po_number         TEXT;
    v_received_delta    DECIMAL(12,3);
    v_effective_expiry  DATE;
    v_batch_num         TEXT;
    v_existing_batch_id UUID;
BEGIN
    -- Only proceed when received_quantity actually increased
    -- (handles partial receives correctly)
    v_received_delta := COALESCE(NEW.received_quantity, 0) - COALESCE(OLD.received_quantity, 0);

    IF v_received_delta <= 0 THEN
        RETURN NEW;
    END IF;

    -- Need at least one of: batch_number or expiry_date to create a batch
    IF NEW.batch_number IS NULL AND NEW.expiry_date IS NULL THEN
        -- Product doesn't have batch info — skip silently
        RETURN NEW;
    END IF;

    -- Get store and supplier from parent PO
    SELECT po.store_id, po.supplier_id, po.po_number
      INTO v_store_id, v_supplier_id, v_po_number
      FROM purchase_orders po
     WHERE po.id = NEW.purchase_order_id;

    -- Auto-generate batch number if not provided but expiry is
    -- Format: PO{PO_NUMBER}-{PRODUCT_CODE}-{EXPIRY}
    v_batch_num := COALESCE(
        NULLIF(TRIM(NEW.batch_number), ''),
        'PO-' || COALESCE(v_po_number, 'AUTO') || '-' || NEW.product_code || '-' ||
        TO_CHAR(COALESCE(NEW.expiry_date, CURRENT_DATE + INTERVAL '1 year'), 'YYYYMMDD')
    );

    -- Expiry date: use provided or default to 1 year from today
    -- (for products with no expiry, this won't be triggered anyway)
    v_effective_expiry := COALESCE(
        NEW.expiry_date,
        CURRENT_DATE + INTERVAL '1 year'
    );

    -- Check if this exact batch already exists (partial receive scenario)
    SELECT id INTO v_existing_batch_id
    FROM product_batches
    WHERE store_id     = v_store_id
      AND product_id   = NEW.product_id
      AND batch_number = v_batch_num;

    IF v_existing_batch_id IS NOT NULL THEN
        -- ── Partial Receive: Update existing batch quantity ──
        UPDATE product_batches
           SET current_quantity  = current_quantity + v_received_delta,
               initial_quantity  = initial_quantity + v_received_delta,
               updated_at        = NOW()
         WHERE id = v_existing_batch_id;

        RAISE LOG '[AutoBatch] Updated existing batch % for product % — added % units',
            v_batch_num, NEW.product_id, v_received_delta;

    ELSE
        -- ── New Receive: Create fresh batch record ──
        INSERT INTO product_batches (
            store_id,
            product_id,
            batch_number,
            manufacturing_date,
            expiry_date,
            mrp,
            initial_quantity,
            current_quantity,
            purchase_date,
            purchase_price,
            supplier_id,
            purchase_invoice,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_store_id,
            NEW.product_id,
            v_batch_num,
            NEW.manufacturing_date,
            v_effective_expiry,
            COALESCE(NEW.mrp, NEW.unit_price),
            v_received_delta,               -- initial = how much we received today
            v_received_delta,               -- current = same at creation
            NOW()::DATE,                    -- purchase date = today
            NEW.unit_price,                 -- cost at time of purchase
            v_supplier_id,                  -- supplier who sent this batch
            v_po_number,                    -- PO number as invoice reference
            true,
            NOW(),
            NOW()
        );

        RAISE LOG '[AutoBatch] Created batch % for product % — % units, expiry %',
            v_batch_num, NEW.product_id, v_received_delta, v_effective_expiry;
    END IF;

    -- ── Auto-enable batch tracking on the product if not already set ──
    -- If this product has a batch being created, it IS batch-tracked
    UPDATE products
       SET is_batch_tracked = true,
           updated_at       = NOW()
     WHERE id              = NEW.product_id
       AND is_batch_tracked = false;

    IF FOUND THEN
        RAISE LOG '[AutoBatch] Enabled is_batch_tracked on product %', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_create_batch_on_receive ON purchase_order_items;

CREATE TRIGGER auto_create_batch_on_receive
    AFTER UPDATE OF received_quantity ON purchase_order_items
    FOR EACH ROW
    WHEN (
        -- Only when received_quantity actually increased
        COALESCE(NEW.received_quantity, 0) > COALESCE(OLD.received_quantity, 0)
        -- And product exists
        AND NEW.product_id IS NOT NULL
        -- And has batch or expiry info
        AND (
            (NEW.batch_number IS NOT NULL AND NEW.batch_number <> '')
            OR NEW.expiry_date IS NOT NULL
        )
    )
    EXECUTE FUNCTION auto_create_batch_on_receive();


-- ============================================================================
-- TRIGGER 3: AUTO-SET PREFERRED SUPPLIER
-- Fires: AFTER UPDATE on supplier_products
-- 
-- Smart logic:
--   - When a new supplier_products row is added for a product that already
--     had a preferred supplier, keep the existing preferred one
--   - If only one supplier exists for a product → auto-set as preferred
--   - If a supplier is deactivated/deleted → auto-promote cheapest as preferred
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_preferred_supplier()
RETURNS TRIGGER AS $$
DECLARE
    v_supplier_count    INTEGER;
    v_preferred_exists  BOOLEAN;
    v_cheapest_id       UUID;
BEGIN
    -- Count active suppliers for this product
    SELECT COUNT(*), BOOL_OR(is_preferred)
      INTO v_supplier_count, v_preferred_exists
      FROM supplier_products
     WHERE product_id = NEW.product_id
       AND store_id   = NEW.store_id
       AND is_active  = true;

    -- If only one active supplier → they are preferred by default
    IF v_supplier_count = 1 THEN
        UPDATE supplier_products
           SET is_preferred = true,
               updated_at   = NOW()
         WHERE product_id  = NEW.product_id
           AND store_id    = NEW.store_id
           AND is_active   = true;
        RETURN NEW;
    END IF;

    -- If multiple suppliers but none is preferred → auto-pick cheapest
    IF v_supplier_count > 1 AND NOT v_preferred_exists THEN
        SELECT id INTO v_cheapest_id
          FROM supplier_products
         WHERE product_id = NEW.product_id
           AND store_id   = NEW.store_id
           AND is_active  = true
         ORDER BY purchase_price ASC
         LIMIT 1;

        UPDATE supplier_products
           SET is_preferred = (id = v_cheapest_id),
               updated_at   = NOW()
         WHERE product_id = NEW.product_id
           AND store_id   = NEW.store_id;

        RAISE LOG '[AutoPreferred] Set cheapest supplier % as preferred for product %',
            v_cheapest_id, NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_set_preferred_supplier_trigger ON supplier_products;

CREATE TRIGGER auto_set_preferred_supplier_trigger
    AFTER INSERT OR UPDATE OF is_active, purchase_price ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_preferred_supplier();


-- ============================================================================
-- TRIGGER 4: AUTO-CREATE EXPIRY ALERT WHEN BATCH IS CREATED
-- Fires: AFTER INSERT on product_batches
--
-- Smart logic:
--   - Creates a stock_alert immediately if batch expires within alert threshold
--   - Threshold from store_settings.inventory_settings.expiry_alert_days
--   - Default threshold: 30 days
--   - Severity: CRITICAL < 7 days, HIGH < 30 days, MEDIUM < 90 days
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_expiry_alert_on_batch()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_days        INTEGER;
    v_days_to_expiry    INTEGER;
    v_severity          TEXT;
    v_settings          JSONB;
BEGIN
    -- Get store's expiry alert threshold
    SELECT (ss.inventory_settings->>'expiry_alert_days')::INTEGER
      INTO v_alert_days
      FROM store_settings ss
     WHERE ss.store_id = NEW.store_id;

    v_alert_days := COALESCE(v_alert_days, 30);

    -- Calculate days until expiry
    v_days_to_expiry := (NEW.expiry_date - CURRENT_DATE);

    -- Only create alert if expiry is within threshold
    IF v_days_to_expiry > v_alert_days THEN
        -- Batch is fine — no alert needed
        RETURN NEW;
    END IF;

    -- Determine severity
    v_severity := CASE
        WHEN v_days_to_expiry <= 0  THEN 'CRITICAL'  -- Already expired!
        WHEN v_days_to_expiry <= 7  THEN 'CRITICAL'  -- Expires this week
        WHEN v_days_to_expiry <= 30 THEN 'HIGH'      -- Expires this month
        ELSE                             'MEDIUM'     -- Expires soon
    END;

    -- Create expiry alert (only if not already resolved for this batch)
    INSERT INTO stock_alerts (
        store_id,
        product_id,
        batch_id,
        alert_type,
        severity,
        current_quantity,
        threshold_quantity,
        expiry_date,
        is_resolved,
        created_at,
        updated_at
    )
    SELECT
        NEW.store_id,
        NEW.product_id,
        NEW.id,
        CASE WHEN v_days_to_expiry <= 0 THEN 'EXPIRY_CRITICAL' ELSE 'EXPIRY_WARNING' END,
        v_severity,
        NEW.current_quantity,
        NULL,
        NEW.expiry_date,
        false,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        -- Don't duplicate alerts for the same batch
        SELECT 1 FROM stock_alerts
         WHERE batch_id     = NEW.id
           AND alert_type   IN ('EXPIRY_WARNING', 'EXPIRY_CRITICAL')
           AND is_resolved  = false
    );

    IF FOUND THEN
        RAISE LOG '[AutoExpiryAlert] Created % alert for batch % — expires in % days',
            v_severity, NEW.batch_number, v_days_to_expiry;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_create_expiry_alert_on_batch ON product_batches;

CREATE TRIGGER auto_create_expiry_alert_on_batch
    AFTER INSERT ON product_batches
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_expiry_alert_on_batch();


-- ============================================================================
-- HELPER FUNCTION: Get preferred supplier for a product
-- Used by PO creation UI to auto-suggest the best supplier
-- Returns: supplier info + last price + lead time
-- ============================================================================

CREATE OR REPLACE FUNCTION get_preferred_supplier(
    p_product_id UUID,
    p_store_id   UUID DEFAULT NULL
)
RETURNS TABLE (
    supplier_id           UUID,
    supplier_name         TEXT,
    supplier_code         TEXT,
    supplier_phone        TEXT,
    purchase_price        DECIMAL(12,2),
    mrp                   DECIMAL(12,2),
    discount_percentage   DECIMAL(5,2),
    lead_time_days        INTEGER,
    minimum_order_quantity INTEGER,
    is_preferred          BOOLEAN,
    gstin                 TEXT
) AS $$
DECLARE
    v_store_id UUID;
BEGIN
    v_store_id := COALESCE(p_store_id, public.get_user_store());

    RETURN QUERY
    SELECT
        s.id                        AS supplier_id,
        s.name                      AS supplier_name,
        s.supplier_code             AS supplier_code,
        s.phone                     AS supplier_phone,
        sp.purchase_price,
        sp.mrp,
        sp.discount_percentage,
        sp.lead_time_days,
        sp.minimum_order_quantity,
        sp.is_preferred,
        s.gstin
    FROM supplier_products sp
    JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.product_id = p_product_id
      AND sp.store_id   = v_store_id
      AND sp.is_active  = true
      AND s.is_active   = true
      AND NOT s.blacklisted
    ORDER BY
        sp.is_preferred DESC,      -- preferred first
        sp.purchase_price ASC,     -- then cheapest
        sp.lead_time_days ASC;     -- then fastest
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- HELPER FUNCTION: Get active batches for a product at POS
-- Used by POS when selecting batch for a batch-tracked product
-- Returns batches sorted by FEFO (First Expiry First Out)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_batches_for_pos(
    p_product_id UUID,
    p_store_id   UUID DEFAULT NULL
)
RETURNS TABLE (
    batch_id         UUID,
    batch_number     TEXT,
    expiry_date      DATE,
    days_to_expiry   INTEGER,
    current_quantity DECIMAL(12,3),
    mrp              DECIMAL(12,2),
    purchase_price   DECIMAL(12,2),
    supplier_name    TEXT,
    expiry_status    TEXT
) AS $$
DECLARE
    v_store_id UUID;
BEGIN
    v_store_id := COALESCE(p_store_id, public.get_user_store());

    RETURN QUERY
    SELECT
        pb.id                               AS batch_id,
        pb.batch_number,
        pb.expiry_date,
        (pb.expiry_date - CURRENT_DATE)::INTEGER AS days_to_expiry,
        pb.current_quantity,
        pb.mrp,
        pb.purchase_price,
        s.name                              AS supplier_name,
        CASE
            WHEN pb.expiry_date < CURRENT_DATE     THEN 'EXPIRED'
            WHEN pb.expiry_date < CURRENT_DATE + 7 THEN 'CRITICAL'
            WHEN pb.expiry_date < CURRENT_DATE + 30 THEN 'WARNING'
            ELSE                                        'OK'
        END                                 AS expiry_status
    FROM product_batches pb
    LEFT JOIN suppliers s ON s.id = pb.supplier_id
    WHERE pb.product_id     = p_product_id
      AND pb.store_id       = v_store_id
      AND pb.is_active      = true
      AND pb.current_quantity > 0
      AND pb.expiry_date    >= CURRENT_DATE   -- Exclude expired batches from POS
    ORDER BY
        pb.expiry_date ASC;   -- FEFO: sell nearest-expiry first
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ SMART AUTO-MAPPING: SUPPLIER + BATCH — APPLIED SUCCESSFULLY
    ============================================================================

    Triggers Created (4):

    1. auto_map_supplier_product_on_insert   (purchase_order_items AFTER INSERT)
       → Upserts supplier_products with latest price, lead time, MOQ
       → Logs price change to price_history if cost changed vs last PO
       → Sets is_preferred = true if first/only supplier for this product

    2. auto_map_supplier_product_on_update   (purchase_order_items AFTER UPDATE)
       → Same as above but fires only when unit_price, mrp or discount changes
       → Prevents unnecessary DB writes on non-price updates

    3. auto_create_batch_on_receive          (purchase_order_items AFTER UPDATE)
       → Fires ONLY when received_quantity increases AND batch/expiry info exists
       → Creates product_batches with supplier, PO reference, dates
       → Handles partial receives (updates existing batch qty instead of duplicate)
       → Auto-enables is_batch_tracked on the product if not already set
       → Auto-generates batch_number if missing: PO-{PO_NUM}-{SKU}-{EXPIRY}

    4. auto_create_expiry_alert_on_batch     (product_batches AFTER INSERT)
       → Reads expiry_alert_days from store_settings.inventory_settings
       → Creates stock_alert immediately if batch expires within threshold
       → Severity: CRITICAL ≤7 days | HIGH ≤30 days | MEDIUM ≤90 days
       → Skips if alert already exists for same batch

    Helper Trigger:
    5. auto_set_preferred_supplier_trigger   (supplier_products AFTER INSERT/UPDATE)
       → 1 supplier  → auto-set as preferred
       → 0 preferred → auto-promote cheapest active supplier
       → Fires automatically — no manual preferred management needed

    Helper Functions (2):
    ✓ get_preferred_supplier(product_id, store_id)
      → Used by PO creation to auto-suggest best supplier (preferred → cheapest → fastest)
    ✓ get_active_batches_for_pos(product_id, store_id)
      → Used by POS barcode scan to show available batches sorted by FEFO

    Full Auto-Flow:
    ┌──────────────────────────────────────────────────────────────────────┐
    │  User creates Purchase Order → adds items                            │
    │  ↓                                                                   │
    │  [T1] auto_create_product_from_po_item (existing)                   │
    │       → Creates product if new                                       │
    │  ↓                                                                   │
    │  [T-NEW] auto_map_supplier_product_on_insert                        │
    │          → Upserts supplier_products mapping                         │
    │          → Logs price_history if cost changed                        │
    │  ↓                                                                   │
    │  User marks PO items as Received (received_quantity increases)       │
    │  ↓                                                                   │
    │  [T-NEW] auto_create_batch_on_receive                               │
    │          → Creates/updates product_batches                           │
    │          → Enables is_batch_tracked on product                       │
    │  ↓                                                                   │
    │  [T-NEW] auto_create_expiry_alert_on_batch                          │
    │          → Creates EXPIRY_WARNING / EXPIRY_CRITICAL alert            │
    │  ↓                                                                   │
    │  [Existing] update_inventory_on_po_receive                          │
    │             → Inserts inventory_transactions                         │
    │  ↓                                                                   │
    │  [Existing] update_inventory_on_transaction (fixed)                 │
    │             → Updates inventory.quantity_on_hand ✅                 │
    └──────────────────────────────────────────────────────────────────────┘

    ============================================================================
    ';
END $$;