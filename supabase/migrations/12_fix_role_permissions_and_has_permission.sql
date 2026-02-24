-- =============================================================================
-- Migration 12: Fix role permissions, has_permission fallthrough, and
--               inventory ON CONFLICT partial-index bug
-- =============================================================================
-- Fix A: store_admin role missing "manage_products" → silent 0-row UPDATE
-- Fix B: has_permission() short-circuits on custom_permissions, ignoring role
-- Fix C: update_inventory_on_transaction uses ON CONFLICT (store_id, product_id,
--         variant_id) — PostgreSQL cannot infer the partial unique indexes
--         (WHERE variant_id IS NULL / WHERE variant_id IS NOT NULL) from a plain
--         column list → error 42P10 "no unique or exclusion constraint matching
--         the ON CONFLICT specification".
--         Fix: split the upsert into two IF/ELSE branches keyed on variant_id.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- C. Fix update_inventory_on_transaction — split ON CONFLICT by variant_id
-- ---------------------------------------------------------------------------
-- The two partial indexes created in migration 11 are:
--   idx_inventory_unique_product_no_variant   ON (store_id, product_id)        WHERE variant_id IS NULL
--   idx_inventory_unique_product_with_variant ON (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
--
-- PostgreSQL's ON CONFLICT column-inference cannot resolve partial indexes from
-- a plain column list.  You must either spell out the WHERE predicate in the
-- ON CONFLICT clause, or use two separate INSERT statements.  We use IF/ELSE.
-- ---------------------------------------------------------------------------

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
        IF NEW.reference_type IN ('purchase_return') THEN
            v_new_quantity := GREATEST(v_current_quantity - NEW.quantity, 0);
        ELSE
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

    -- Stamp previous/new quantity on the transaction row (BEFORE trigger)
    NEW.previous_quantity := v_current_quantity;
    NEW.new_quantity      := v_new_quantity;

    -- -----------------------------------------------------------------------
    -- Upsert inventory — split by variant_id to match the two partial indexes.
    -- ON CONFLICT cannot infer a partial index from a plain column list, so we
    -- use IF/ELSE and embed the WHERE predicate directly in each branch.
    -- -----------------------------------------------------------------------
    IF NEW.variant_id IS NULL THEN
        -- Base-product row (no variant) — uses idx_inventory_unique_product_no_variant
        INSERT INTO inventory (
            store_id, product_id, variant_id,
            quantity_on_hand, average_cost,
            last_updated_at, is_active, created_at, updated_at
        ) VALUES (
            NEW.store_id, NEW.product_id, NULL,
            v_new_quantity, v_avg_cost,
            NOW(), true, NOW(), NOW()
        )
        ON CONFLICT (store_id, product_id) WHERE variant_id IS NULL
        DO UPDATE SET
            quantity_on_hand = EXCLUDED.quantity_on_hand,
            average_cost     = COALESCE(EXCLUDED.average_cost, inventory.average_cost),
            last_updated_at  = NOW(),
            updated_at       = NOW();
    ELSE
        -- Variant row — uses idx_inventory_unique_product_with_variant
        INSERT INTO inventory (
            store_id, product_id, variant_id,
            quantity_on_hand, average_cost,
            last_updated_at, is_active, created_at, updated_at
        ) VALUES (
            NEW.store_id, NEW.product_id, NEW.variant_id,
            v_new_quantity, v_avg_cost,
            NOW(), true, NOW(), NOW()
        )
        ON CONFLICT (store_id, product_id, variant_id) WHERE variant_id IS NOT NULL
        DO UPDATE SET
            quantity_on_hand = EXCLUDED.quantity_on_hand,
            average_cost     = COALESCE(EXCLUDED.average_cost, inventory.average_cost),
            last_updated_at  = NOW(),
            updated_at       = NOW();
    END IF;

    -- Keep products.average_cost in sync for quick access
    UPDATE products
       SET average_cost = v_avg_cost,
           updated_at   = NOW()
     WHERE id = NEW.product_id
       AND v_avg_cost IS NOT NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach as BEFORE trigger so we can stamp previous_quantity / new_quantity
DROP TRIGGER IF EXISTS update_inventory_trigger ON inventory_transactions;

CREATE TRIGGER update_inventory_trigger
    BEFORE INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_transaction();


-- ---------------------------------------------------------------------------
-- A. Patch role permissions
-- ---------------------------------------------------------------------------

-- store_admin: add all product + purchase-order related permissions it was
--              missing while keeping every existing permission intact.
UPDATE roles
SET permissions = permissions || '{
    "manage_products":          true,
    "manage_barcodes":          true,
    "manage_purchase_orders":   true,
    "process_purchase_orders":  true,
    "adjust_stock":             true,
    "view_stock_alerts":        true,
    "view_stock_reports":       true,
    "import_products":          true,
    "manage_units":             true
}'::jsonb
WHERE name = 'store_admin';

-- manager: also needs manage_products (they run day-to-day inventory)
UPDATE roles
SET permissions = permissions || '{
    "manage_products":          true,
    "manage_barcodes":          true,
    "process_purchase_orders":  true,
    "adjust_stock":             true,
    "view_stock_alerts":        true,
    "view_stock_reports":       true
}'::jsonb
WHERE name = 'manager';


-- ---------------------------------------------------------------------------
-- B. Fix has_permission() — custom_permissions are additive, not exclusive
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(
    p_permission TEXT,
    p_store_id   UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_id     UUID;
    v_role_perms   JSONB;
    v_custom_perms JSONB;
BEGIN
    -- Super-admins bypass all permission checks
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;

    v_store_id := COALESCE(p_store_id, public.get_user_store());

    IF v_store_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT r.permissions, su.custom_permissions
    INTO   v_role_perms, v_custom_perms
    FROM   store_users su
    JOIN   roles r ON r.id = su.role_id
    WHERE  su.user_id  = auth.uid()
    AND    su.store_id = v_store_id
    AND    su.is_active = true
    AND    su.is_banned = false
    LIMIT  1;

    -- No store_users row found → no access
    IF v_role_perms IS NULL AND v_custom_perms IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Check custom_permissions first (additive grants only).
    --    If the custom object explicitly grants "all" or the specific
    --    permission we're done — but we do NOT return false here.
    IF v_custom_perms IS NOT NULL THEN
        IF COALESCE((v_custom_perms->>'all')::boolean, false)
           OR COALESCE((v_custom_perms->>p_permission)::boolean, false)
        THEN
            RETURN true;
        END IF;
    END IF;

    -- 2. Fall through to the role's baseline permissions.
    IF v_role_perms IS NOT NULL THEN
        RETURN COALESCE((v_role_perms->>'all')::boolean, false)
            OR COALESCE((v_role_perms->>p_permission)::boolean, false);
    END IF;

    RETURN false;
END;
$$;
