-- ============================================================================
-- FIX: Invited users redirected to /create-organization after accepting invite
--
-- Root cause A (get_onboarding_status):
--   The function computes status purely from organizations/stores ownership.
--   It never reads profiles.onboarding_status.  An invited employee has no
--   owned org, so they always hit "NOT v_has_organization → /create-organization".
--
-- Root cause B (accept_invitation):
--   Inserts a store_users row but never marks the profile as onboarding-
--   complete, so even if get_onboarding_status were fixed nothing writes the
--   flag.
--
-- Fix A – accept_invitation():
--   After inserting store_users, also UPDATE profiles to set
--     onboarding_status  = 'completed'
--     onboarding_step    = 'completed'
--     onboarding_completed_at = NOW()
--     onboarding_metadata = {joined_via: 'invitation', …}
--
-- Fix B – get_onboarding_status():
--   At the very top read profiles.onboarding_status.  When it is 'completed'
--   AND the user has an active role, return is_onboarding_complete = true
--   with the role dashboard immediately — skipping all org/store checks.
--
-- Fix C – Back-fill:
--   UPDATE existing accepted-invite profiles that missed the flag.
-- ============================================================================


-- ============================================================================
-- PART 1 – accept_invitation: mark profile as onboarding-complete
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
    v_role_name   TEXT;
BEGIN
    -- 1. Validate token
    SELECT *
    INTO   v_invitation
    FROM   invitations
    WHERE  token    = p_token
      AND  status   = 'pending'
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

        -- Ensure profile is marked complete even for re-accepts
        UPDATE profiles
        SET    onboarding_status       = 'completed',
               onboarding_step         = 'completed',
               onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
               updated_at              = NOW()
        WHERE  id = v_user_id;

        RETURN jsonb_build_object('success', true, 'already_member', true);
    END IF;

    -- 4. Create store_users row
    INSERT INTO store_users (
        store_id, user_id, role_id, designation, department, is_active
    )
    SELECT
        v_invitation.store_id,
        v_user_id,
        v_invitation.role_id,
        COALESCE(v_invitation.employee_data->>'designation', NULL),
        COALESCE(v_invitation.employee_data->>'department',  NULL),
        true
    ;

    -- 5. Look up the role name for metadata
    SELECT name INTO v_role_name FROM roles WHERE id = v_invitation.role_id;

    -- 6. Mark profile as onboarding-complete with invite metadata
    UPDATE profiles
    SET    onboarding_status       = 'completed',
           onboarding_step         = 'completed',
           onboarding_completed_at = NOW(),
           onboarding_metadata     = jsonb_build_object(
               'joined_via',       'invitation',
               'store_id',         v_invitation.store_id,
               'invited_by',       v_invitation.invited_by,
               'accepted_at',      NOW(),
               'user_role',        v_role_name,
               'has_organization', false,
               'has_store',        false,
               'store_approved',   true
           ),
           updated_at              = NOW()
    WHERE  id = v_user_id;

    -- 7. Mark invitation accepted
    UPDATE invitations
    SET    status      = 'accepted',
           accepted_at = NOW(),
           accepted_by = v_user_id,
           updated_at  = NOW()
    WHERE  id = v_invitation.id;

    RETURN jsonb_build_object(
        'success',  true,
        'store_id', v_invitation.store_id,
        'role_id',  v_invitation.role_id
    );
END;
$$;

COMMENT ON FUNCTION public.accept_invitation IS
    'Accept a pending invitation. Inserts store_users row AND marks '
    'profiles.onboarding_status = completed so the user skips onboarding.';


-- ============================================================================
-- PART 2 – get_onboarding_status: honour profiles.onboarding_status first
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_onboarding_status(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_user_id              UUID;
    v_profile_status       TEXT;   -- profiles.onboarding_status
    v_has_organization     BOOLEAN;
    v_has_store            BOOLEAN;
    v_store_status         TEXT;
    v_is_store_user        BOOLEAN;
    v_role_info            JSONB;
    v_result               JSONB;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());

    -- ── Fast-path: read the profile flag FIRST ──────────────────────────────
    -- accept_invitation() sets onboarding_status = 'completed' on the profile.
    -- If that flag is already set AND the user has an active role, we can
    -- return immediately without any org/store ownership queries.

    SELECT onboarding_status
    INTO   v_profile_status
    FROM   profiles
    WHERE  id = v_user_id;

    -- Get role info (needed for dashboard_path in all branches)
    v_role_info := public.get_user_role_info(v_user_id);

    IF v_profile_status = 'completed' AND v_role_info->>'has_role' = 'true' THEN
        RETURN jsonb_build_object(
            'has_organization',       false,
            'has_store',              false,
            'store_status',           null,
            'is_store_user',          true,
            'role',                   v_role_info,
            'next_step',              'completed',
            'redirect_to',            v_role_info->>'dashboard_path',
            'is_onboarding_complete', true,
            'welcome_message',        COALESCE(
                CASE v_role_info->>'role_name'
                    WHEN 'super_admin'        THEN 'Welcome to Super Admin Dashboard'
                    WHEN 'store_admin'        THEN 'Welcome to Store Admin Dashboard'
                    WHEN 'manager'            THEN 'Welcome to Manager Dashboard'
                    WHEN 'accountant'         THEN 'Welcome to Accountant Dashboard'
                    WHEN 'inventory_manager'  THEN 'Welcome to Inventory Dashboard'
                    WHEN 'cashier'            THEN 'Ready to start selling?'
                    ELSE NULL
                END,
                'Welcome!'
            )
        );
    END IF;

    -- ── Normal path: compute from org / store tables ────────────────────────

    -- Check if user has created an organization (org-owner path)
    SELECT EXISTS (
        SELECT 1 FROM organizations WHERE created_by = v_user_id
    ) INTO v_has_organization;

    -- Check if user has created a store
    SELECT EXISTS (
        SELECT 1 FROM stores WHERE created_by = v_user_id
    ) INTO v_has_store;

    -- Get store status for stores they own
    SELECT status INTO v_store_status
    FROM   stores
    WHERE  created_by = v_user_id
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Check if user is assigned to any store via invitation
    SELECT EXISTS (
        SELECT 1 FROM store_users
        WHERE  user_id  = v_user_id
          AND  is_active = true
    ) INTO v_is_store_user;

    -- -------------------------------------------------------------------------
    -- Build result
    -- PRIORITY ORDER:
    --   1. Invited store user with role           → go to their role dashboard
    --   2. No organisation yet                    → /create-organization
    --   3. Has org but no store                   → /create-store
    --   4. Store pending/rejected/suspended       → respective page
    --   5. Store active + role assigned           → role dashboard
    --   6. Store active but no role               → /welcome
    -- -------------------------------------------------------------------------
    v_result := jsonb_build_object(
        'has_organization', v_has_organization,
        'has_store',        v_has_store,
        'store_status',     v_store_status,
        'is_store_user',    v_is_store_user,

        -- Role info passthrough
        'role', v_role_info,

        'next_step', CASE
            -- ① Invited employee who already has a role → done
            WHEN v_is_store_user AND v_role_info->>'has_role' = 'true'
                THEN 'completed'
            -- ② Org-owner onboarding path
            WHEN NOT v_has_organization             THEN 'create_organization'
            WHEN NOT v_has_store                    THEN 'create_store'
            WHEN v_store_status = 'pending'         THEN 'pending_approval'
            WHEN v_store_status = 'rejected'        THEN 'store_rejected'
            WHEN v_store_status = 'suspended'       THEN 'store_suspended'
            WHEN v_store_status = 'active'
              AND v_role_info->>'has_role' = 'true' THEN 'completed'
            WHEN v_store_status = 'active'
              AND NOT v_is_store_user               THEN 'waiting_for_invitation'
            WHEN v_store_status = 'active'
              AND v_is_store_user                   THEN 'completed'
            ELSE 'unknown'
        END,

        'redirect_to', CASE
            -- ① Invited employee who already has a role → role dashboard
            WHEN v_is_store_user AND v_role_info->>'has_role' = 'true'
                THEN v_role_info->>'dashboard_path'
            -- ② Org-owner onboarding path
            WHEN NOT v_has_organization             THEN '/create-organization'
            WHEN NOT v_has_store                    THEN '/create-store'
            WHEN v_store_status = 'pending'         THEN '/pending-approval'
            WHEN v_store_status = 'rejected'        THEN '/store-rejected'
            WHEN v_store_status = 'suspended'       THEN '/account-suspended'
            WHEN v_store_status = 'active'
              AND v_role_info->>'has_role' = 'true' THEN v_role_info->>'dashboard_path'
            WHEN v_store_status = 'active'
              AND NOT v_is_store_user               THEN '/welcome?status=store_created'
            ELSE '/dashboard'
        END,

        -- Onboarding is complete when the user has an active role,
        -- regardless of whether they own an org or were invited.
        'is_onboarding_complete', (
            -- Invited user with role
            (v_is_store_user AND v_role_info->>'has_role' = 'true')
            OR
            -- Org-owner with active store and role
            (
                v_role_info->>'has_role' = 'true'
                AND COALESCE(v_store_status, 'active') != 'pending'
            )
            OR
            -- Legacy: org + store + active + is store user
            (
                v_has_organization
                AND v_has_store
                AND v_store_status = 'active'
                AND v_is_store_user
            )
        ),

        'welcome_message', CASE
            WHEN v_store_status = 'pending'                       THEN 'Your store is under review'
            WHEN v_store_status = 'rejected'                      THEN 'Store application was rejected'
            WHEN v_store_status = 'suspended'                     THEN 'Store is currently suspended'
            WHEN v_role_info->>'role_name' = 'super_admin'        THEN 'Welcome to Super Admin Dashboard'
            WHEN v_role_info->>'role_name' = 'store_admin'        THEN 'Welcome to Store Admin Dashboard'
            WHEN v_role_info->>'role_name' = 'manager'            THEN 'Welcome to Manager Dashboard'
            WHEN v_role_info->>'role_name' = 'accountant'         THEN 'Welcome to Accountant Dashboard'
            WHEN v_role_info->>'role_name' = 'inventory_manager'  THEN 'Welcome to Inventory Dashboard'
            WHEN v_role_info->>'role_name' = 'cashier'            THEN 'Ready to start selling?'
            WHEN NOT v_has_organization THEN 'Let''s set up your organization'
            WHEN NOT v_has_store        THEN 'Now create your first store'
            ELSE 'Welcome to the platform'
        END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_onboarding_status IS
    'Onboarding status with role-based redirects. '
    'Reads profiles.onboarding_status FIRST — invited users are marked '
    'completed by accept_invitation() so they bypass all org/store checks.';


-- ============================================================================
-- PART 3 – Back-fill: fix existing accepted-invite users whose profiles
--          were not updated (runs once, harmless on re-run)
-- ============================================================================

UPDATE profiles p
SET    onboarding_status       = 'completed',
       onboarding_step         = 'completed',
       onboarding_completed_at = COALESCE(p.onboarding_completed_at, NOW()),
       updated_at              = NOW()
WHERE  p.onboarding_status != 'completed'
  AND  EXISTS (
      SELECT 1 FROM store_users su
      WHERE  su.user_id   = p.id
        AND  su.is_active = true
  );


-- ============================================================================
-- DONE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================
    ✅  INVITED USER REDIRECT FIX  (migration 8)
    ============================================================

    Changes:
    1. accept_invitation()
       → Also UPDATEs profiles: onboarding_status = completed
       → Writes onboarding_metadata with store_id, role, invited_by

    2. get_onboarding_status()
       → Reads profiles.onboarding_status FIRST
       → If completed + has_role → return role dashboard immediately
       → Invited users NEVER reach the org/store ownership checks

    3. Back-fill UPDATE
       → Existing accepted-invite users whose profile was not
         marked completed are fixed immediately

    Result: invited employees go directly to their role dashboard.
    /create-organization is only shown to fresh org signups.
    ============================================================
    ';
END $$;
