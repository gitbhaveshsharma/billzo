-- =============================================================================
-- Migration 12: Fix role permissions & has_permission fallthrough bug
-- =============================================================================
-- Root cause of silent UPDATE failure on `products`:
--
--   1. The `store_admin` role is missing "manage_products": true in its
--      permissions JSONB.  The RLS policy "Inventory managers can manage
--      products" calls has_permission('manage_products', store_id), which
--      returns false for store_admin → UPDATE silently affects 0 rows (204).
--
--   2. has_permission() short-circuits on custom_permissions: if the column
--      is NOT NULL (e.g. an empty {} or a partial object), it returns false
--      without ever consulting the role permissions.  This means any user
--      whose custom_permissions was set to {} can never pass a permission
--      check, regardless of their role.
--
-- Fix:
--   A. Add missing product / purchase-order permissions to store_admin and
--      manager roles.
--   B. Rewrite has_permission() so custom_permissions can only GRANT extra
--      permissions, never implicitly deny them — role permissions are always
--      the baseline fallback.
-- =============================================================================


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
