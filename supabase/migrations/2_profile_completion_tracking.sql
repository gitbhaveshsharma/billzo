-- ============================================================================
-- SCHEMA UPDATE: Profile Completion Tracking
-- Tracks onboarding progress for users
-- ============================================================================

-- Add onboarding_status column to profiles table
ALTER TABLE profiles 
ADD COLUMN onboarding_status TEXT DEFAULT 'incomplete' CHECK (
    onboarding_status IN ('incomplete', 'organization_created', 'store_created', 'completed')
),
ADD COLUMN onboarding_step TEXT DEFAULT 'create_organization' CHECK (
    onboarding_step IN ('create_organization', 'create_store', 'pending_approval', 'completed')
),
ADD COLUMN onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN onboarding_metadata JSONB DEFAULT '{
    "has_organization": false,
    "has_store": false,
    "store_approved": false,
    "last_step": null,
    "skipped_steps": []
}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN profiles.onboarding_status IS 'Overall onboarding completion status';
COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in the onboarding process';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'When the user completed full onboarding';
COMMENT ON COLUMN profiles.onboarding_metadata IS 'Detailed onboarding progress tracking';

-- ============================================================================
-- Helper Function: Get User Onboarding Status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_onboarding_status(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_has_organization BOOLEAN;
    v_has_store BOOLEAN;
    v_store_status TEXT;
    v_is_store_user BOOLEAN;
    v_result JSONB;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
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
        'next_step', CASE
            WHEN NOT v_has_organization THEN 'create_organization'
            WHEN NOT v_has_store THEN 'create_store'
            WHEN v_store_status = 'pending' THEN 'pending_approval'
            WHEN v_store_status = 'active' AND v_is_store_user THEN 'completed'
            WHEN v_store_status = 'rejected' THEN 'store_rejected'
            WHEN v_store_status = 'suspended' THEN 'store_suspended'
            ELSE 'unknown'
        END,
        'redirect_to', CASE
            WHEN NOT v_has_organization THEN '/create-organization'
            WHEN NOT v_has_store THEN '/create-store'
            WHEN v_store_status = 'pending' THEN '/pending-approval'
            WHEN v_store_status = 'active' AND v_is_store_user THEN '/dashboard'
            WHEN v_store_status = 'rejected' THEN '/store-rejected'
            WHEN v_store_status = 'suspended' THEN '/account-suspended'
            ELSE '/dashboard'
        END,
        'is_onboarding_complete', (
            v_has_organization AND 
            v_has_store AND 
            v_store_status = 'active' AND 
            v_is_store_user
        )
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
BEGIN
    -- Only trigger if status changed to 'active'
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Update the creator's profile to completed
        PERFORM public.update_onboarding_progress(
            NEW.created_by,
            'completed',
            jsonb_build_object(
                'has_organization', true,
                'has_store', true,
                'store_id', NEW.id,
                'store_name', NEW.name,
                'store_status', 'active',
                'store_approved', true,
                'approved_at', NEW.approved_at,
                'approved_by', NEW.approved_by
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
BEGIN
    -- If this is an accepted invitation
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
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
                'accepted_at', NEW.accepted_at
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
-- View: User Onboarding Status
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
    
    -- Computed fields
    (p.onboarding_metadata->>'has_organization')::boolean AS has_organization,
    (p.onboarding_metadata->>'has_store')::boolean AS has_store,
    (p.onboarding_metadata->>'store_approved')::boolean AS store_approved,
    
    -- Next action
    CASE
        WHEN p.onboarding_step = 'create_organization' THEN 'Create your organization'
        WHEN p.onboarding_step = 'create_store' THEN 'Create your first store'
        WHEN p.onboarding_step = 'pending_approval' THEN 'Wait for store approval'
        WHEN p.onboarding_step = 'completed' THEN 'Onboarding complete'
        ELSE 'Continue onboarding'
    END AS next_action,
    
    -- Redirect URL
    CASE
        WHEN p.onboarding_step = 'create_organization' THEN '/create-organization'
        WHEN p.onboarding_step = 'create_store' THEN '/create-store'
        WHEN p.onboarding_step = 'pending_approval' THEN '/pending-approval'
        WHEN p.onboarding_step = 'completed' THEN '/dashboard'
        ELSE '/dashboard'
    END AS redirect_url

FROM profiles p
LEFT JOIN organizations o ON o.created_by = p.id
LEFT JOIN stores s ON s.created_by = p.id
ORDER BY p.created_at DESC;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION public.get_onboarding_status IS 'Get detailed onboarding status for a user';
COMMENT ON FUNCTION public.update_onboarding_progress IS 'Update user onboarding progress';
COMMENT ON VIEW v_user_onboarding_status IS 'Comprehensive view of user onboarding progress';

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ PROFILE COMPLETION TRACKING ADDED SUCCESSFULLY
    ============================================================================
    
    New Features:
    - onboarding_status column (incomplete/organization_created/store_created/completed)
    - onboarding_step column (tracks current step)
    - onboarding_completed_at timestamp
    - onboarding_metadata JSONB (detailed tracking)
    
    Helper Functions:
    - get_onboarding_status(user_id) - Returns detailed onboarding info
    - update_onboarding_progress(user_id, step, metadata) - Update progress
    
    Automatic Triggers:
    - Auto-updates when organization is created
    - Auto-updates when store is created
    - Auto-updates when store is approved
    - Auto-updates when user accepts invitation
    
    View:
    - v_user_onboarding_status - Complete onboarding overview
    
    Usage in Next.js:
    1. After login, call get_onboarding_status(user_id)
    2. Redirect user based on "redirect_to" field
    3. Show progress indicator based on "next_step"
    
    ============================================================================
    ';
END $$;