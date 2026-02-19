-- ============================================================================
-- FIX: Invitations Table RLS + Policy Issues
--
-- Bugs fixed:
--
-- 1. 403 Forbidden on POST /invitations
--    Root cause: the original FOR ALL policy uses a single USING expression.
--    PostgreSQL uses USING as the implicit WITH CHECK for INSERT rows.
--    get_user_store() relies on the EXISTING store_users row for the current
--    user, which is correct — but pairing it with has_permission() in the
--    same USING clause is redundant and fragile when the roles table returns
--    edge-cases. Split into four explicit per-operation policies instead.
--
-- 2. 42501  (permission denied for table users)
--    The SELECT policy does: email = (SELECT email FROM auth.users WHERE
--    id = auth.uid())  ← regular authenticated users cannot read auth.users.
--    Fixed by reading from the public.profiles table instead.
--
-- 3. PGRST116 (result contains 0 rows)
--    Service-side bug: .single() is used when no invitation/profile row
--    exists yet.  Fixed in store-users.service.ts (see that file).
-- ============================================================================


-- ============================================================================
-- STEP 1 – Drop all existing invitations policies
-- ============================================================================
DROP POLICY IF EXISTS "Store admins and managers can manage invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email"   ON invitations;

-- Safety net: drop any re-run variants too
DROP POLICY IF EXISTS "invitations_select_policy"  ON invitations;
DROP POLICY IF EXISTS "invitations_insert_policy"  ON invitations;
DROP POLICY IF EXISTS "invitations_update_policy"  ON invitations;
DROP POLICY IF EXISTS "invitations_delete_policy"  ON invitations;


-- ============================================================================
-- STEP 2 – Recreate policies: one per operation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT
--   • store_admin / manager of that store  (has manage_employees permission)
--   • super_admin sees everything
--   • the invited person can see their own invitation
--     (uses profiles, NOT auth.users — fixes 42501)
-- ----------------------------------------------------------------------------
CREATE POLICY "invitations_select_policy"
    ON invitations
    FOR SELECT
    USING (
        public.is_super_admin()
        OR public.has_permission('manage_employees', store_id)
        OR email = (
            SELECT p.email
            FROM   public.profiles p
            WHERE  p.id = auth.uid()
            LIMIT  1
        )
    );

-- ----------------------------------------------------------------------------
-- INSERT
--   WITH CHECK (not USING) is correct for INSERT rows.
--   We do NOT require store_id = get_user_store() here because the
--   caller supplies the store_id explicitly; has_permission already
--   verifies the caller belongs to that store with the right role.
-- ----------------------------------------------------------------------------
CREATE POLICY "invitations_insert_policy"
    ON invitations
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
        OR public.has_permission('manage_employees', store_id)
    );

-- ----------------------------------------------------------------------------
-- UPDATE
--   Allow the managing role to update status / reminder counts etc.
-- ----------------------------------------------------------------------------
CREATE POLICY "invitations_update_policy"
    ON invitations
    FOR UPDATE
    USING (
        public.is_super_admin()
        OR public.has_permission('manage_employees', store_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.has_permission('manage_employees', store_id)
    );

-- ----------------------------------------------------------------------------
-- DELETE
--   Restricted to store_admin of that store + super_admin.
-- ----------------------------------------------------------------------------
CREATE POLICY "invitations_delete_policy"
    ON invitations
    FOR DELETE
    USING (
        public.is_super_admin()
        OR (
            public.is_store_owner(store_id)
            AND public.has_permission('manage_employees', store_id)
        )
    );


-- ============================================================================
-- STEP 3 – Helper: accept_invitation(token)
--
-- Called when an authenticated user clicks the accept link.
-- Runs as SECURITY DEFINER so it can write to store_users even though
-- the new user has no existing store membership yet.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation  invitations%ROWTYPE;
    v_user_id     UUID := auth.uid();
    v_user_email  TEXT;
    v_existing    UUID;
BEGIN
    -- 1. Validate token
    SELECT *
    INTO   v_invitation
    FROM   invitations
    WHERE  token  = p_token
      AND  status = 'pending'
      AND  expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or expired');
    END IF;

    -- 2. Confirm the authenticated user's email matches
    SELECT p.email
    INTO   v_user_email
    FROM   profiles p
    WHERE  p.id = v_user_id;

    IF lower(v_user_email) != lower(v_invitation.email) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email mismatch');
    END IF;

    -- 3. Check if already a member
    SELECT id INTO v_existing
    FROM   store_users
    WHERE  store_id = v_invitation.store_id
      AND  user_id  = v_user_id;

    IF FOUND THEN
        -- Still mark invitation accepted
        UPDATE invitations
        SET    status      = 'accepted',
               accepted_at = NOW(),
               accepted_by = v_user_id,
               updated_at  = NOW()
        WHERE  id = v_invitation.id;

        RETURN jsonb_build_object('success', true, 'already_member', true);
    END IF;

    -- 4. Create store_users row
    INSERT INTO store_users (
        store_id,
        user_id,
        role_id,
        designation,
        department,
        is_active
    )
    SELECT
        v_invitation.store_id,
        v_user_id,
        v_invitation.role_id,
        COALESCE(v_invitation.employee_data->>'designation', NULL),
        COALESCE(v_invitation.employee_data->>'department',  NULL),
        true
    ;

    -- 5. Mark invitation accepted
    UPDATE invitations
    SET    status      = 'accepted',
           accepted_at = NOW(),
           accepted_by = v_user_id,
           updated_at  = NOW()
    WHERE  id = v_invitation.id;

    RETURN jsonb_build_object(
        'success',    true,
        'store_id',   v_invitation.store_id,
        'role_id',    v_invitation.role_id
    );
END;
$$;

COMMENT ON FUNCTION public.accept_invitation IS
    'Lets an authenticated user accept a pending invitation by token. SECURITY DEFINER bypasses RLS on store_users for new members.';


-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================
    ✅  INVITATIONS RLS FIXED  (migration 5)
    ============================================================

    Policies recreated (split by operation):
      invitations_select_policy  — store managers + invited user (via profiles)
      invitations_insert_policy  — WITH CHECK: store managers / super_admin
      invitations_update_policy  — store managers / super_admin
      invitations_delete_policy  — store_admin / super_admin

    Errors resolved:
      403 Forbidden  → was: FOR ALL USING (get_user_store() mismatch)
      42501          → was: SELECT from auth.users; fixed to use profiles
      PGRST116       → fixed in store-users.service.ts (.maybeSingle)

    New helper function:
      public.accept_invitation(token TEXT) → JSONB
      Called after a new user signs up to accept their invite.
    ============================================================
    ';
END $$;
