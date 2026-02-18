-- ============================================================================
-- FIX: Onboarding Status for Pending Stores
-- Issue: Users with pending stores were marked as onboarding complete
-- Fix: Don't mark onboarding as complete when store is pending
-- ============================================================================

-- Update the get_onboarding_status function to properly handle pending stores
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
            -- If store is pending, must wait for approval
            WHEN v_store_status = 'pending' THEN 'pending_approval'
            -- If user already has role and store is not pending, onboarding is complete
            WHEN v_role_info->>'has_role' = 'true' AND COALESCE(v_store_status, 'active') != 'pending' THEN 'completed'
            -- Otherwise follow standard onboarding flow
            WHEN NOT v_has_organization THEN 'create_organization'
            WHEN NOT v_has_store THEN 'create_store'
            WHEN v_store_status = 'active' AND NOT v_is_store_user THEN 'waiting_for_invitation'
            WHEN v_store_status = 'active' AND v_is_store_user THEN 'completed'
            WHEN v_store_status = 'rejected' THEN 'store_rejected'
            WHEN v_store_status = 'suspended' THEN 'store_suspended'
            ELSE 'unknown'
        END,
        
        -- Redirect URL based on role and onboarding status
        'redirect_to', CASE
            -- PENDING STORE: Always redirect to pending-approval first
            WHEN v_store_status = 'pending' THEN '/pending-approval'
            
            -- ROLE-BASED REDIRECTS (when user has a role and store is not pending)
            WHEN v_role_info->>'has_role' = 'true' AND COALESCE(v_store_status, 'active') != 'pending' 
                THEN v_role_info->>'dashboard_path'
            
            -- ONBOARDING FLOW (when user has no role yet)
            WHEN NOT v_has_organization THEN '/create-organization'
            WHEN NOT v_has_store THEN '/create-store'
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
            WHEN v_store_status = 'pending' THEN 'Your store is under review'
            WHEN v_role_info->>'role_name' = 'super_admin' THEN 'Welcome to Super Admin Dashboard'
            WHEN v_role_info->>'role_name' = 'store_admin' THEN 'Welcome to Store Admin Dashboard'
            WHEN v_role_info->>'role_name' = 'manager' THEN 'Welcome to Manager Dashboard'
            WHEN v_role_info->>'role_name' = 'accountant' THEN 'Welcome to Accountant Dashboard'
            WHEN v_role_info->>'role_name' = 'inventory_manager' THEN 'Welcome to Inventory Dashboard'
            WHEN v_role_info->>'role_name' = 'cashier' THEN 'Ready to start selling?'
            WHEN NOT v_has_organization THEN 'Let''s set up your organization'
            WHEN NOT v_has_store THEN 'Now create your first store'
            ELSE 'Welcome to the platform'
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_onboarding_status IS 'Get detailed onboarding status - updated to handle pending stores correctly';
