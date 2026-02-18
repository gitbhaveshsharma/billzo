-- -- ============================================================================
-- -- SCHEMA UPDATE: Profile Completion Tracking with Role-Based Dashboard Redirects
-- -- Tracks onboarding progress for users and redirects based on role
-- -- ============================================================================

-- -- Add onboarding_status column to profiles table
-- ALTER TABLE profiles 
-- ADD COLUMN onboarding_status TEXT DEFAULT 'incomplete' CHECK (
--     onboarding_status IN ('incomplete', 'organization_created', 'store_created', 'completed')
-- ),
-- ADD COLUMN onboarding_step TEXT DEFAULT 'create_organization' CHECK (
--     onboarding_step IN ('create_organization', 'create_store', 'pending_approval', 'completed')
-- ),
-- ADD COLUMN onboarding_completed_at TIMESTAMPTZ,
-- ADD COLUMN onboarding_metadata JSONB DEFAULT '{
--     "has_organization": false,
--     "has_store": false,
--     "store_approved": false,
--     "last_step": null,
--     "skipped_steps": []
-- }'::jsonb;

-- -- Add comments for documentation
-- COMMENT ON COLUMN profiles.onboarding_status IS 'Overall onboarding completion status';
-- COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in the onboarding process';
-- COMMENT ON COLUMN profiles.onboarding_completed_at IS 'When the user completed full onboarding';
-- COMMENT ON COLUMN profiles.onboarding_metadata IS 'Detailed onboarding progress tracking';

-- ============================================================================
-- Helper Function: Get User Role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role_info(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_role_name TEXT;
    v_role_display TEXT;
    v_permissions JSONB;
    v_store_id UUID;
    v_store_name TEXT;
    v_result JSONB;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get user's role from store_users
    SELECT 
        r.name,
        r.display_name,
        r.permissions,
        su.store_id,
        s.name as store_name
    INTO 
        v_role_name,
        v_role_display,
        v_permissions,
        v_store_id,
        v_store_name
    FROM store_users su
    JOIN roles r ON su.role_id = r.id
    JOIN stores s ON su.store_id = s.id
    WHERE su.user_id = v_user_id
    AND su.is_active = true
    AND su.is_banned = false
    ORDER BY su.last_login_at DESC NULLS LAST
    LIMIT 1;
    
    -- Build result
    v_result := jsonb_build_object(
        'has_role', v_role_name IS NOT NULL,
        'role_name', v_role_name,
        'role_display', v_role_display,
        'permissions', v_permissions,
        'store_id', v_store_id,
        'store_name', v_store_name,
        
        -- Dashboard based on role
        'dashboard_path', CASE v_role_name
            WHEN 'super_admin' THEN '/super-admin/dashboard'
            WHEN 'store_admin' THEN '/store-admin/dashboard'
            WHEN 'manager' THEN '/manager/dashboard'
            WHEN 'accountant' THEN '/accountant/dashboard'
            WHEN 'inventory_manager' THEN '/inventory/dashboard'
            WHEN 'cashier' THEN '/pos'  -- Cashiers go directly to POS
            ELSE '/dashboard'  -- Default fallback
        END,
        
        -- Dashboard name for display
        'dashboard_name', CASE v_role_name
            WHEN 'super_admin' THEN 'Super Admin Dashboard'
            WHEN 'store_admin' THEN 'Store Admin Dashboard'
            WHEN 'manager' THEN 'Manager Dashboard'
            WHEN 'accountant' THEN 'Accountant Dashboard'
            WHEN 'inventory_manager' THEN 'Inventory Dashboard'
            WHEN 'cashier' THEN 'Point of Sale'
            ELSE 'Dashboard'
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Helper Function: Get User Onboarding Status (UPDATED with role-based redirect)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_onboarding_status(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_has_organization BOOLEAN;
    v_has_store BOOLEAN;
    v_store_status TEXT;
    v_is_store_user BOOLEAN;
    v_role_info JSONB;
    v_result JSONB;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get user role info
    v_role_info := public.get_user_role_info(v_user_id);
    
    -- Check if user has created an organization
    SELECT EXISTS (
        SELECT 1 FROM organizations 
        WHERE created_by = v_user_id
    ) INTO v_has_organization;
    
    -- Check if user has created a store
    SELECT EXISTS (
        SELECT 1 FROM stores 
        WHERE created_by = v_user_id
    ) INTO v_has_store;
    
    -- Get store status if exists
    SELECT status INTO v_store_status
    FROM stores
    WHERE created_by = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if user is assigned to any store (via invitation)
    SELECT EXISTS (
        SELECT 1 FROM store_users
        WHERE user_id = v_user_id
        AND is_active = true
    ) INTO v_is_store_user;
    
    -- Determine next step and status
    v_result := jsonb_build_object(
        'has_organization', v_has_organization,
        'has_store', v_has_store,
        'store_status', v_store_status,
        'is_store_user', v_is_store_user,
        
        -- Role info
        'role', v_role_info,
        
        -- Next step based on onboarding progress
        'next_step', CASE
            -- If user already has role, onboarding is complete for them
            WHEN v_role_info->>'has_role' = 'true' THEN 'completed'
            -- Otherwise follow standard onboarding flow
            WHEN NOT v_has_organization THEN 'create_organization'
            WHEN NOT v_has_store THEN 'create_store'
            WHEN v_store_status = 'pending' THEN 'pending_approval'
            WHEN v_store_status = 'active' AND NOT v_is_store_user THEN 'waiting_for_invitation'
            WHEN v_store_status = 'active' AND v_is_store_user THEN 'completed'
            WHEN v_store_status = 'rejected' THEN 'store_rejected'
            WHEN v_store_status = 'suspended' THEN 'store_suspended'
            ELSE 'unknown'
        END,
        
        -- Redirect URL based on role and onboarding status
        'redirect_to', CASE
            -- ROLE-BASED REDIRECTS (when user has a role)
            WHEN v_role_info->>'has_role' = 'true' THEN v_role_info->>'dashboard_path'
            
            -- ONBOARDING FLOW (when user has no role yet)
            WHEN NOT v_has_organization THEN '/create-organization'
            WHEN NOT v_has_store THEN '/create-store'
            WHEN v_store_status = 'pending' THEN '/pending-approval'
            WHEN v_store_status = 'rejected' THEN '/store-rejected'
            WHEN v_store_status = 'suspended' THEN '/account-suspended'
            WHEN v_store_status = 'active' AND NOT v_is_store_user THEN '/welcome?status=store_created'
            ELSE '/dashboard'
        END,
        
        -- Is onboarding complete?
        -- User must have active role AND store must not be pending
        'is_onboarding_complete', (
            (v_role_info->>'has_role' = 'true' AND COALESCE(v_store_status, 'active') != 'pending') OR
            (v_has_organization AND v_has_store AND v_store_status = 'active' AND v_is_store_user)
        ),
        
        -- Display message based on role
        'welcome_message', CASE
            WHEN v_role_info->>'role_name' = 'super_admin' THEN 'Welcome to Super Admin Dashboard'
            WHEN v_role_info->>'role_name' = 'store_admin' THEN 'Welcome to Store Admin Dashboard'
            WHEN v_role_info->>'role_name' = 'manager' THEN 'Welcome to Manager Dashboard'
            WHEN v_role_info->>'role_name' = 'accountant' THEN 'Welcome to Accountant Dashboard'
            WHEN v_role_info->>'role_name' = 'inventory_manager' THEN 'Welcome to Inventory Dashboard'
            WHEN v_role_info->>'role_name' = 'cashier' THEN 'Ready to start selling?'
            WHEN NOT v_has_organization THEN 'Let''s set up your organization'
            WHEN NOT v_has_store THEN 'Now create your first store'
            WHEN v_store_status = 'pending' THEN 'Your store is under review'
            ELSE 'Welcome to the platform'
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Helper Function: Update Onboarding Progress
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_onboarding_progress(
    p_user_id UUID,
    p_step TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_status JSONB;
BEGIN
    -- Get current onboarding status
    v_current_status := public.get_onboarding_status(p_user_id);
    
    -- Update profile with new onboarding info
    UPDATE profiles
    SET 
        onboarding_step = p_step,
        onboarding_status = CASE
            WHEN p_step = 'completed' THEN 'completed'
            WHEN p_step = 'create_store' THEN 'organization_created'
            WHEN p_step = 'pending_approval' THEN 'store_created'
            ELSE 'incomplete'
        END,
        onboarding_completed_at = CASE
            WHEN p_step = 'completed' THEN NOW()
            ELSE NULL
        END,
        onboarding_metadata = COALESCE(p_metadata, v_current_status),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Trigger: Auto-update onboarding when organization is created
-- ============================================================================
CREATE OR REPLACE FUNCTION update_onboarding_on_organization_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the creator's profile
    PERFORM public.update_onboarding_progress(
        NEW.created_by,
        'create_store',
        jsonb_build_object(
            'has_organization', true,
            'organization_id', NEW.id,
            'organization_name', NEW.name,
            'has_store', false,
            'store_approved', false
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_on_organization_create_trigger
    AFTER INSERT ON organizations
    FOR EACH ROW
    WHEN (NEW.created_by IS NOT NULL)
    EXECUTE FUNCTION update_onboarding_on_organization_create();

-- ============================================================================
-- Trigger: Auto-update onboarding when store is created
-- ============================================================================
CREATE OR REPLACE FUNCTION update_onboarding_on_store_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the creator's profile
    PERFORM public.update_onboarding_progress(
        NEW.created_by,
        'pending_approval',
        jsonb_build_object(
            'has_organization', true,
            'has_store', true,
            'store_id', NEW.id,
            'store_name', NEW.name,
            'store_status', NEW.status,
            'store_approved', false
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_on_store_create_trigger
    AFTER INSERT ON stores
    FOR EACH ROW
    WHEN (NEW.created_by IS NOT NULL)
    EXECUTE FUNCTION update_onboarding_on_store_create();

-- ============================================================================
-- Trigger: Auto-update onboarding when store is approved
-- ============================================================================
CREATE OR REPLACE FUNCTION update_onboarding_on_store_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_role_info JSONB;
BEGIN
    -- Only trigger if status changed to 'active'
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Get role info for the creator
        v_role_info := public.get_user_role_info(NEW.created_by);
        
        -- Update the creator's profile
        PERFORM public.update_onboarding_progress(
            NEW.created_by,
            CASE 
                WHEN v_role_info->>'has_role' = 'true' THEN 'completed'
                ELSE 'pending_approval'
            END,
            jsonb_build_object(
                'has_organization', true,
                'has_store', true,
                'store_id', NEW.id,
                'store_name', NEW.name,
                'store_status', 'active',
                'store_approved', true,
                'approved_at', NEW.approved_at,
                'approved_by', NEW.approved_by,
                'user_role', v_role_info->>'role_name'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_on_store_approval_trigger
    AFTER UPDATE ON stores
    FOR EACH ROW
    WHEN (NEW.created_by IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_onboarding_on_store_approval();

-- ============================================================================
-- Trigger: Auto-update onboarding when user accepts invitation
-- ============================================================================
CREATE OR REPLACE FUNCTION update_onboarding_on_invitation_accept()
RETURNS TRIGGER AS $$
DECLARE
    v_role_info JSONB;
BEGIN
    -- If this is an accepted invitation
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Get role info for the accepted user
        v_role_info := public.get_user_role_info(NEW.accepted_by);
        
        -- Update the invited user's profile to completed
        -- (they skip org/store creation since they're joining existing store)
        PERFORM public.update_onboarding_progress(
            NEW.accepted_by,
            'completed',
            jsonb_build_object(
                'has_organization', false,
                'has_store', false,
                'store_id', NEW.store_id,
                'store_approved', true,
                'joined_via', 'invitation',
                'invited_by', NEW.invited_by,
                'accepted_at', NEW.accepted_at,
                'user_role', v_role_info->>'role_name'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_on_invitation_accept_trigger
    AFTER UPDATE ON invitations
    FOR EACH ROW
    WHEN (NEW.accepted_by IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_onboarding_on_invitation_accept();

-- ============================================================================
-- View: User Onboarding Status (UPDATED with role info)
-- ============================================================================
CREATE OR REPLACE VIEW v_user_onboarding_status AS
SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    p.onboarding_status,
    p.onboarding_step,
    p.onboarding_completed_at,
    p.onboarding_metadata,
    
    -- Organization info
    o.id AS organization_id,
    o.name AS organization_name,
    o.is_active AS organization_active,
    
    -- Store info
    s.id AS store_id,
    s.name AS store_name,
    s.store_code,
    s.status AS store_status,
    s.approved_at AS store_approved_at,
    
    -- Role info
    r.name AS role_name,
    r.display_name AS role_display_name,
    su.id AS store_user_id,
    
    -- Computed fields
    (p.onboarding_metadata->>'has_organization')::boolean AS has_organization,
    (p.onboarding_metadata->>'has_store')::boolean AS has_store,
    (p.onboarding_metadata->>'store_approved')::boolean AS store_approved,
    
    -- Next action text
    CASE
        WHEN r.name = 'cashier' THEN 'Go to POS'
        WHEN r.name = 'store_admin' THEN 'Go to Store Admin Dashboard'
        WHEN r.name = 'manager' THEN 'Go to Manager Dashboard'
        WHEN r.name = 'accountant' THEN 'Go to Accountant Dashboard'
        WHEN r.name = 'inventory_manager' THEN 'Go to Inventory Dashboard'
        WHEN r.name = 'super_admin' THEN 'Go to Super Admin Dashboard'
        WHEN p.onboarding_step = 'create_organization' THEN 'Create your organization'
        WHEN p.onboarding_step = 'create_store' THEN 'Create your first store'
        WHEN p.onboarding_step = 'pending_approval' THEN 'Wait for store approval'
        WHEN p.onboarding_step = 'completed' THEN 'Onboarding complete'
        ELSE 'Continue onboarding'
    END AS next_action,
    
    -- Role-based redirect URL
    CASE
        -- Role-based redirects take priority
        WHEN r.name = 'cashier' THEN '/pos'
        WHEN r.name = 'store_admin' THEN '/store-admin/dashboard'
        WHEN r.name = 'manager' THEN '/manager/dashboard'
        WHEN r.name = 'accountant' THEN '/accountant/dashboard'
        WHEN r.name = 'inventory_manager' THEN '/inventory/dashboard'
        WHEN r.name = 'super_admin' THEN '/super-admin/dashboard'
        
        -- Onboarding flow for users without roles
        WHEN p.onboarding_step = 'create_organization' THEN '/create-organization'
        WHEN p.onboarding_step = 'create_store' THEN '/create-store'
        WHEN p.onboarding_step = 'pending_approval' THEN '/pending-approval'
        WHEN p.onboarding_step = 'completed' THEN '/dashboard'
        ELSE '/dashboard'
    END AS redirect_url,
    
    -- Dashboard type for UI
    CASE
        WHEN r.name = 'cashier' THEN 'pos'
        WHEN r.name = 'store_admin' THEN 'admin'
        WHEN r.name = 'manager' THEN 'manager'
        WHEN r.name = 'accountant' THEN 'accountant'
        WHEN r.name = 'inventory_manager' THEN 'inventory'
        WHEN r.name = 'super_admin' THEN 'super-admin'
        ELSE 'default'
    END AS dashboard_type

FROM profiles p
LEFT JOIN organizations o ON o.created_by = p.id
LEFT JOIN stores s ON s.created_by = p.id
LEFT JOIN store_users su ON su.user_id = p.id AND su.is_active = true AND su.is_banned = false
LEFT JOIN roles r ON su.role_id = r.id
ORDER BY p.created_at DESC;

-- ============================================================================
-- Function: Get Dashboard Redirect for User
-- Simplified function for use in middleware/after login
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_dashboard_redirect(p_user_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID;
    v_redirect TEXT;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    SELECT redirect_url INTO v_redirect
    FROM v_user_onboarding_status
    WHERE user_id = v_user_id;
    
    RETURN COALESCE(v_redirect, '/dashboard');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Function: Check if user can access a specific dashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_dashboard(
    p_user_id UUID,
    p_dashboard_type TEXT -- 'admin', 'manager', 'pos', 'accountant', 'inventory', 'super-admin'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Get user role
    SELECT role_name INTO v_user_role
    FROM v_user_onboarding_status
    WHERE user_id = p_user_id;
    
    -- Check access based on dashboard type
    RETURN CASE
        -- Super admin can access everything
        WHEN v_user_role = 'super_admin' THEN true
        
        -- Dashboard-specific access
        WHEN p_dashboard_type = 'admin' AND v_user_role = 'store_admin' THEN true
        WHEN p_dashboard_type = 'manager' AND v_user_role IN ('manager', 'store_admin') THEN true
        WHEN p_dashboard_type = 'pos' AND v_user_role IN ('cashier', 'manager', 'store_admin') THEN true
        WHEN p_dashboard_type = 'accountant' AND v_user_role IN ('accountant', 'manager', 'store_admin') THEN true
        WHEN p_dashboard_type = 'inventory' AND v_user_role IN ('inventory_manager', 'manager', 'store_admin') THEN true
        ELSE false
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.get_onboarding_status IS 'Get detailed onboarding status with role-based redirects';
COMMENT ON FUNCTION public.get_user_role_info IS 'Get user role and permissions with dashboard path';
COMMENT ON FUNCTION public.get_user_dashboard_redirect IS 'Get redirect URL based on user role (for middleware)';
COMMENT ON FUNCTION public.can_access_dashboard IS 'Check if user can access a specific dashboard type';
COMMENT ON VIEW v_user_onboarding_status IS 'Comprehensive view with role-based dashboard redirects';

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ PROFILE COMPLETION TRACKING UPDATED WITH ROLE-BASED REDIRECTS
    ============================================================================
    
    New Features:
    - Role detection via get_user_role_info()
    - Role-based dashboard redirects:
        * Super Admin → /super-admin/dashboard
        * Store Admin → /store-admin/dashboard
        * Manager → /manager/dashboard
        * Accountant → /accountant/dashboard
        * Inventory Manager → /inventory/dashboard
        * Cashier → /pos (direct to POS)
    
    Helper Functions:
    - get_user_role_info(user_id) - Returns role and dashboard path
    - get_onboarding_status(user_id) - Now includes role-based redirect
    - get_user_dashboard_redirect(user_id) - Quick redirect for middleware
    - can_access_dashboard(user_id, dashboard_type) - Permission check
    
    View:
    - v_user_onboarding_status - Now includes role_name and role-based redirect_url
    
    Usage in Next.js:
    
    // After login/authentication
    const { data } = await supabase.rpc(''get_onboarding_status'');
    
    // Redirect based on role:
    if (data.redirect_to === ''/pos'') {
        // Send cashier directly to POS
        router.push(''/pos'');
    } else if (data.redirect_to === ''/store-admin/dashboard'') {
        router.push(''/store-admin/dashboard'');
    } else if (data.redirect_to === ''/manager/dashboard'') {
        router.push(''/manager/dashboard'');
    } else {
        router.push(data.redirect_to);
    }
    
    // Or use the simple function in middleware:
    const redirect = await supabase.rpc(''get_user_dashboard_redirect'');
    response.redirect(redirect);
    
    ============================================================================
    ';
END $$;