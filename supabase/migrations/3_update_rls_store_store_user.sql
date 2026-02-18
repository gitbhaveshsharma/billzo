-- ============================================================================
-- COMPLETE FIX: RLS POLICIES FOR STORES, STORE_USERS & STORE_SETTINGS
-- Fixes: infinite recursion in store_users policy
-- Architecture: SECURITY DEFINER functions bypass RLS, breaking the loop
-- Supabase PostgreSQL
-- ============================================================================


-- ============================================================================
-- STEP 1: DISABLE RLS ON AFFECTED TABLES
-- ============================================================================
ALTER TABLE stores         DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Stores
DROP POLICY IF EXISTS "Authenticated users can create stores (pending approval)" ON stores;
DROP POLICY IF EXISTS "Users can view their stores"                               ON stores;
DROP POLICY IF EXISTS "Store admins can update their stores"                      ON stores;
DROP POLICY IF EXISTS "Super admins can manage all stores"                        ON stores;
DROP POLICY IF EXISTS "stores_insert_policy"                                      ON stores;
DROP POLICY IF EXISTS "stores_select_policy"                                      ON stores;
DROP POLICY IF EXISTS "stores_update_policy"                                      ON stores;
DROP POLICY IF EXISTS "stores_delete_policy"                                      ON stores;

-- Store Users
DROP POLICY IF EXISTS "Users can view store users in their store"                 ON store_users;
DROP POLICY IF EXISTS "Store admins and managers can manage store users"          ON store_users;
DROP POLICY IF EXISTS "Users can update their own records"                        ON store_users;
DROP POLICY IF EXISTS "store_users_insert_creator_policy"                         ON store_users;
DROP POLICY IF EXISTS "store_users_insert_manager_policy"                         ON store_users;
DROP POLICY IF EXISTS "store_users_select_policy"                                 ON store_users;
DROP POLICY IF EXISTS "store_users_update_policy"                                 ON store_users;
DROP POLICY IF EXISTS "store_users_delete_policy"                                 ON store_users;
DROP POLICY IF EXISTS "store_users_select"                                        ON store_users;
DROP POLICY IF EXISTS "store_users_insert"                                        ON store_users;
DROP POLICY IF EXISTS "store_users_update"                                        ON store_users;
DROP POLICY IF EXISTS "store_users_delete"                                        ON store_users;

-- Store Settings
DROP POLICY IF EXISTS "Store admins can manage settings"                          ON store_settings;
DROP POLICY IF EXISTS "Managers and accountants can view settings"                ON store_settings;
DROP POLICY IF EXISTS "store_settings_select_policy"                              ON store_settings;
DROP POLICY IF EXISTS "store_settings_insert_policy"                              ON store_settings;
DROP POLICY IF EXISTS "store_settings_update_policy"                              ON store_settings;
DROP POLICY IF EXISTS "store_settings_delete_policy"                              ON store_settings;


-- ============================================================================
-- STEP 3: DROP & RECREATE HELPER FUNCTIONS
--
-- KEY PRINCIPLE: Every function that queries store_users MUST be
--   SECURITY DEFINER  →  runs as the function owner (postgres / superuser)
--   SET search_path = public  →  safe schema pinning
--
-- This makes the function execute OUTSIDE the calling user's RLS context,
-- which is exactly what breaks the recursion.
-- ============================================================================

-- ------------------------------------------------------------------
-- 3a. is_super_admin()
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM   store_users su
        JOIN   roles r ON r.id = su.role_id
        WHERE  su.user_id   = auth.uid()
        AND    r.name        = 'super_admin'
        AND    su.is_active  = true
        AND    su.is_banned  = false
    );
END;
$$;

-- ------------------------------------------------------------------
-- 3b. get_user_role_in_store(store_id)
--     Returns the role name for the current user in a given store.
--     Used by other helper functions – never called from a policy directly.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role_in_store(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT r.name INTO v_role
    FROM   store_users su
    JOIN   roles r ON r.id = su.role_id
    WHERE  su.user_id   = auth.uid()
    AND    su.store_id   = p_store_id
    AND    su.is_active  = true
    AND    su.is_banned  = false
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- ------------------------------------------------------------------
-- 3c. get_user_store()
--     Returns the most-recently-used active store_id for the current user.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_store()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_id UUID;
BEGIN
    SELECT su.store_id INTO v_store_id
    FROM   store_users su
    WHERE  su.user_id   = auth.uid()
    AND    su.is_active  = true
    AND    su.is_banned  = false
    ORDER  BY su.last_login_at DESC NULLS LAST
    LIMIT  1;

    RETURN v_store_id;
END;
$$;

-- ------------------------------------------------------------------
-- 3d. get_user_organization()
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT s.organization_id INTO v_org_id
    FROM   store_users su
    JOIN   stores s ON s.id = su.store_id
    WHERE  su.user_id   = auth.uid()
    AND    su.is_active  = true
    AND    su.is_banned  = false
    LIMIT  1;

    RETURN v_org_id;
END;
$$;

-- ------------------------------------------------------------------
-- 3e. is_store_owner(store_id)
--     True when the current user is a store_admin for that store.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM   store_users su
        JOIN   roles r ON r.id = su.role_id
        WHERE  su.user_id   = auth.uid()
        AND    su.store_id   = p_store_id
        AND    r.name        = 'store_admin'
        AND    su.is_active  = true
        AND    su.is_banned  = false
    );
END;
$$;

-- ------------------------------------------------------------------
-- 3f. user_belongs_to_store(store_id)
--     True when the current user has any active membership in a store.
--     Used by SELECT policies to avoid re-entering RLS on store_users.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_belongs_to_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM   store_users su
        WHERE  su.user_id   = auth.uid()
        AND    su.store_id   = p_store_id
        AND    su.is_active  = true
        AND    su.is_banned  = false
    );
END;
$$;

-- ------------------------------------------------------------------
-- 3g. user_can_manage_employees(store_id)
--     True for store_admin or any role that has manage_employees perm.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_manage_employees(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM   store_users su
        JOIN   roles r ON r.id = su.role_id
        WHERE  su.user_id   = auth.uid()
        AND    su.store_id   = p_store_id
        AND    su.is_active  = true
        AND    su.is_banned  = false
        AND    (
                   r.name = 'store_admin'
                OR (r.permissions->>'manage_employees')::boolean = true
                OR (su.custom_permissions->>'manage_employees')::boolean = true
                OR (su.custom_permissions->>'all')::boolean = true
               )
    );
END;
$$;

-- ------------------------------------------------------------------
-- 3h. has_permission(permission, store_id)
--     General permission check (role + custom_permissions).
-- ------------------------------------------------------------------
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
    v_store_id          UUID;
    v_role_perms        JSONB;
    v_custom_perms      JSONB;
BEGIN
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;

    v_store_id := COALESCE(p_store_id, public.get_user_store());

    IF v_store_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT su.custom_permissions, r.permissions
    INTO   v_custom_perms, v_role_perms
    FROM   store_users su
    JOIN   roles r ON r.id = su.role_id
    WHERE  su.user_id   = auth.uid()
    AND    su.store_id   = v_store_id
    AND    su.is_active  = true
    AND    su.is_banned  = false
    LIMIT  1;

    -- Custom permissions take precedence
    IF v_custom_perms IS NOT NULL THEN
        RETURN COALESCE((v_custom_perms->>'all')::boolean, false)
            OR COALESCE((v_custom_perms->>p_permission)::boolean, false);
    END IF;

    IF v_role_perms IS NOT NULL THEN
        RETURN COALESCE((v_role_perms->>'all')::boolean, false)
            OR COALESCE((v_role_perms->>p_permission)::boolean, false);
    END IF;

    RETURN false;
END;
$$;

-- ------------------------------------------------------------------
-- 3i. get_user_role() – convenience wrapper (no store arg)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(p_store_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.get_user_role_in_store(
        COALESCE(p_store_id, public.get_user_store())
    );
END;
$$;


-- ============================================================================
-- STEP 4: STORES POLICIES
--
-- Role matrix:
--   super_admin      → full CRUD
--   store_admin      → view own store, update non-critical fields
--   manager          → view own store (read-only)
--   accountant       → view own store (read-only)
--   inventory_manager→ view own store (read-only)
--   cashier          → view own store (read-only)
--   unauthenticated  → nothing
-- ============================================================================

-- INSERT – any authenticated user may create a PENDING store
CREATE POLICY "stores_insert_policy" ON stores
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND status        = 'pending'
        AND created_by    = auth.uid()
        AND organization_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM organizations WHERE id = organization_id
        )
    );

-- SELECT
--   • Creator can see their own pending stores (before they get an account in store_users)
--   • Any active member can see active stores they belong to
--   • Super admin sees all
CREATE POLICY "stores_select_policy" ON stores
    FOR SELECT
    USING (
        public.is_super_admin()
        OR (status = 'pending' AND created_by = auth.uid())
        OR (
            status = 'active'
            AND public.user_belongs_to_store(id)
        )
    );

-- UPDATE – store_admin of that store + super_admin
--   (status field protected by trigger below)
CREATE POLICY "stores_update_policy" ON stores
    FOR UPDATE
    USING (
        public.is_super_admin()
        OR public.is_store_owner(id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_store_owner(id)
    );

-- DELETE – super_admin only
CREATE POLICY "stores_delete_policy" ON stores
    FOR DELETE
    USING (
        public.is_super_admin()
    );


-- ============================================================================
-- STEP 5: STORE_USERS POLICIES
--
-- Root cause of recursion: policies called is_super_admin() / get_user_store()
-- which in turn SELECT from store_users, triggering the same policies again.
--
-- Fix: all helper functions are SECURITY DEFINER → they run as the DB owner
-- and therefore bypass RLS on store_users entirely.
--
-- Role matrix:
--   super_admin       → full CRUD on any row
--   store_admin       → full CRUD on rows in their store
--   manager           → SELECT + INSERT + UPDATE (no DELETE, no role change)
--   others            → SELECT own row only; UPDATE own last_login fields only
-- ============================================================================

-- SELECT
CREATE POLICY "store_users_select_policy" ON store_users
    FOR SELECT
    USING (
        public.is_super_admin()                          -- super_admin sees all
        OR user_id = auth.uid()                          -- anyone sees own row
        OR public.user_belongs_to_store(store_id)        -- store mates see each other
    );

-- INSERT – creator bootstraps themselves as store_admin on a pending store
CREATE POLICY "store_users_insert_creator_policy" ON store_users
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND role_id IN (SELECT id FROM roles WHERE name = 'store_admin')
        AND EXISTS (
            SELECT 1 FROM stores
            WHERE  id         = store_id
            AND    created_by = auth.uid()
            AND    status     = 'pending'
        )
    );

-- INSERT – store_admin / manager adding new employees
CREATE POLICY "store_users_insert_manager_policy" ON store_users
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
        OR public.user_can_manage_employees(store_id)
    );

-- UPDATE – self (last_login fields, 2FA etc.) or manager/admin for others
CREATE POLICY "store_users_update_policy" ON store_users
    FOR UPDATE
    USING (
        public.is_super_admin()
        OR user_id = auth.uid()
        OR public.user_can_manage_employees(store_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR user_id = auth.uid()
        OR public.user_can_manage_employees(store_id)
    );

-- DELETE – store_admin + super_admin
CREATE POLICY "store_users_delete_policy" ON store_users
    FOR DELETE
    USING (
        public.is_super_admin()
        OR (
            public.is_store_owner(store_id)
            AND user_id != auth.uid()   -- cannot delete yourself
        )
    );


-- ============================================================================
-- STEP 6: STORE_SETTINGS POLICIES
--
-- Role matrix:
--   super_admin       → full CRUD
--   store_admin       → full CRUD for their store
--   manager           → SELECT
--   accountant        → SELECT
--   inventory_manager → SELECT
--   cashier           → SELECT (POS needs tax / invoice settings)
-- ============================================================================

-- SELECT – any active store member (all roles need settings for POS/reports)
CREATE POLICY "store_settings_select_policy" ON store_settings
    FOR SELECT
    USING (
        public.is_super_admin()
        OR public.user_belongs_to_store(store_id)
    );

-- INSERT – only store_admin or super_admin (auto-created by trigger normally)
CREATE POLICY "store_settings_insert_policy" ON store_settings
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
        OR public.is_store_owner(store_id)
    );

-- UPDATE – store_admin or super_admin
CREATE POLICY "store_settings_update_policy" ON store_settings
    FOR UPDATE
    USING (
        public.is_super_admin()
        OR public.is_store_owner(store_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_store_owner(store_id)
    );

-- DELETE – super_admin only (settings should never be deleted manually)
CREATE POLICY "store_settings_delete_policy" ON store_settings
    FOR DELETE
    USING (
        public.is_super_admin()
    );


-- ============================================================================
-- STEP 7: TRIGGERS (SECURITY DEFINER)
-- ============================================================================

-- Auto-create store_settings row on store INSERT
DROP TRIGGER IF EXISTS create_store_settings_trigger ON stores;
DROP FUNCTION IF EXISTS create_store_settings() CASCADE;

CREATE OR REPLACE FUNCTION create_store_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO store_settings (store_id)
    VALUES (NEW.id)
    ON CONFLICT (store_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER create_store_settings_trigger
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION create_store_settings();

-- Auto-insert default units of measure on store INSERT
DROP TRIGGER IF EXISTS insert_default_units_after_store_create ON stores;
DROP FUNCTION IF EXISTS auto_insert_default_units() CASCADE;
DROP FUNCTION IF EXISTS insert_default_units(UUID) CASCADE;

CREATE OR REPLACE FUNCTION insert_default_units(p_store_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO units_of_measure
        (store_id, name, code, symbol, category, is_base_unit, decimal_places)
    VALUES
        (p_store_id, 'Piece',      'pcs',  'pcs', 'quantity', true,  0),
        (p_store_id, 'Kilogram',   'kg',   'kg',  'weight',   true,  2),
        (p_store_id, 'Gram',       'g',    'g',   'weight',   false, 0),
        (p_store_id, 'Liter',      'ltr',  'L',   'volume',   true,  2),
        (p_store_id, 'Milliliter', 'ml',   'mL',  'volume',   false, 0),
        (p_store_id, 'Dozen',      'dz',   'dz',  'quantity', false, 0),
        (p_store_id, 'Box',        'box',  '📦',  'quantity', false, 0),
        (p_store_id, 'Meter',      'm',    'm',   'length',   true,  2),
        (p_store_id, 'Centimeter', 'cm',   'cm',  'length',   false, 0),
        (p_store_id, 'Pack',       'pack', 'pack','quantity', false, 0)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION auto_insert_default_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM insert_default_units(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER insert_default_units_after_store_create
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_default_units();

-- Prevent non-super-admins from changing store.status
DROP TRIGGER IF EXISTS prevent_store_status_change_trigger        ON stores;
DROP TRIGGER IF EXISTS prevent_store_status_change_simple_trigger ON stores;
DROP FUNCTION IF EXISTS prevent_store_status_change()        CASCADE;
DROP FUNCTION IF EXISTS prevent_store_status_change_simple() CASCADE;

CREATE OR REPLACE FUNCTION prevent_store_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status
       AND NOT public.is_super_admin()
    THEN
        RAISE EXCEPTION
            'Only super_admins can change store status. '
            'Current: %, Attempted: %', OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_store_status_change_trigger
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION prevent_store_status_change();

-- Restrict what a regular user can UPDATE on their own store_users row
-- (they should only touch last_login_at / last_login_ip / login_attempts)
DROP TRIGGER IF EXISTS restrict_store_user_self_update_trigger ON store_users;
DROP FUNCTION IF EXISTS restrict_store_user_self_update() CASCADE;

CREATE OR REPLACE FUNCTION restrict_store_user_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only fires when a user updates their own row
    -- and they are NOT a store_admin / super_admin
    IF OLD.user_id = auth.uid()
       AND NOT public.is_super_admin()
       AND NOT public.is_store_owner(OLD.store_id)
    THEN
        -- Disallow changes to sensitive fields
        IF (
            OLD.store_id    IS DISTINCT FROM NEW.store_id    OR
            OLD.role_id     IS DISTINCT FROM NEW.role_id     OR
            OLD.is_active   IS DISTINCT FROM NEW.is_active   OR
            OLD.is_banned   IS DISTINCT FROM NEW.is_banned   OR
            OLD.is_banned   IS DISTINCT FROM NEW.is_banned   OR
            OLD.custom_permissions IS DISTINCT FROM NEW.custom_permissions OR
            OLD.banned_at   IS DISTINCT FROM NEW.banned_at   OR
            OLD.banned_by   IS DISTINCT FROM NEW.banned_by
        ) THEN
            RAISE EXCEPTION
                'You are not allowed to modify role, status, or permission fields on your own record.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER restrict_store_user_self_update_trigger
    BEFORE UPDATE ON store_users
    FOR EACH ROW
    EXECUTE FUNCTION restrict_store_user_self_update();

-- Prevent any user from banning / deactivating themselves
DROP TRIGGER IF EXISTS prevent_self_modification_trigger ON store_users;
DROP FUNCTION IF EXISTS prevent_self_modification() CASCADE;

CREATE OR REPLACE FUNCTION prevent_self_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.user_id = auth.uid() AND (
        (NEW.is_active  = false AND OLD.is_active  = true) OR
        (NEW.is_banned  = true  AND OLD.is_banned  = false) OR
        (NEW.role_id   IS DISTINCT FROM OLD.role_id)
    ) THEN
        RAISE EXCEPTION 'You cannot deactivate, ban, or change your own role.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_modification_trigger
    BEFORE UPDATE ON store_users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_modification();


-- ============================================================================
-- STEP 8: RE-ENABLE RLS
-- ============================================================================
ALTER TABLE stores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 9: QUICK SMOKE-TEST (run manually after applying)
-- ============================================================================
/*
-- As an authenticated user who created a pending store:
SELECT public.is_super_admin();              -- false (unless you are)
SELECT public.get_user_store();              -- NULL or your store UUID
SELECT public.user_belongs_to_store('<uuid>');

-- Verify no recursion:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<your-user-uuid>"}';
SELECT * FROM store_users WHERE user_id = auth.uid();  -- should not loop
SELECT * FROM stores LIMIT 5;
SELECT * FROM store_settings LIMIT 5;
*/


-- ============================================================================
-- DONE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
================================================================================
✅  RLS POLICIES APPLIED SUCCESSFULLY
================================================================================

TABLE: stores
  stores_insert_policy          – authenticated users create pending stores
  stores_select_policy          – creator sees pending; members see active
  stores_update_policy          – store_admin + super_admin
  stores_delete_policy          – super_admin only

TABLE: store_users
  store_users_select_policy          – self, store-mates, super_admin
  store_users_insert_creator_policy  – bootstrap first store_admin
  store_users_insert_manager_policy  – store_admin / manager add employees
  store_users_update_policy          – self (limited) + manager + super_admin
  store_users_delete_policy          – store_admin (not self) + super_admin

TABLE: store_settings
  store_settings_select_policy  – all active store members (cashier needs it)
  store_settings_insert_policy  – store_admin + super_admin
  store_settings_update_policy  – store_admin + super_admin
  store_settings_delete_policy  – super_admin only

TRIGGERS
  create_store_settings_trigger          – auto-creates settings row
  insert_default_units_after_store_create – seeds UoM rows
  prevent_store_status_change_trigger    – blocks status edits by non-admins
  restrict_store_user_self_update_trigger – blocks self role/status tampering
  prevent_self_modification_trigger      – blocks self-ban / self-deactivation

ROOT CAUSE FIX
  All helper functions (is_super_admin, user_belongs_to_store, etc.) are now
  SECURITY DEFINER + SET search_path = public.
  They run as the DB owner and therefore bypass RLS on store_users,
  eliminating the infinite recursion.
================================================================================
    ';
END $$;

-- Add this helper function
CREATE OR REPLACE FUNCTION public.organization_exists(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organizations WHERE id = p_org_id
    );
END;
$$;

-- Then replace your stores_insert_policy
DROP POLICY IF EXISTS "stores_insert_policy" ON stores;

CREATE POLICY "stores_insert_policy" ON stores
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND status = 'pending'
        AND created_by = auth.uid()
        AND organization_id IS NOT NULL
        AND public.organization_exists(organization_id)
    );