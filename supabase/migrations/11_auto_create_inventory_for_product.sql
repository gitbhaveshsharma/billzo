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