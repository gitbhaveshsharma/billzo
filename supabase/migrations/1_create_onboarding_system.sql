-- ============================================================================
-- COMPLETE SUPABASE SCHEMA FOR SAAS POS SYSTEM
-- Multi-tenant architecture with Indian compliance (GST, PAN, Aadhar, etc.)
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================
CREATE TYPE registration_type AS ENUM ('private_limited', 'partnership', 'proprietorship', 'llp', 'public_limited', 'other');
CREATE TYPE store_type AS ENUM ('retail', 'warehouse', 'franchise', 'outlet', 'kiosk');
CREATE TYPE store_status AS ENUM ('pending', 'active', 'suspended', 'rejected', 'closed');
CREATE TYPE role_name AS ENUM ('super_admin', 'store_admin', 'manager', 'cashier', 'accountant', 'inventory_manager');
CREATE TYPE employee_type AS ENUM ('full_time', 'part_time', 'contractor', 'intern', 'trainee');
CREATE TYPE employment_status AS ENUM ('active', 'probation', 'notice_period', 'terminated', 'resigned', 'absconded');
CREATE TYPE pay_frequency AS ENUM ('monthly', 'weekly', 'daily', 'hourly');
CREATE TYPE whitelist_purpose AS ENUM ('pos_terminal', 'admin_access', 'api_access', 'backup_system', 'mobile_app');
CREATE TYPE gst_status AS ENUM ('active', 'suspended', 'cancelled', 'migrated');
CREATE TYPE tax_payer_type AS ENUM ('regular', 'composition', 'casual', 'non_resident', 'sez');
CREATE TYPE hsn_type AS ENUM ('hsn', 'sac');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled', 'bounced');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE blood_group_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated');
CREATE TYPE gst_calculation_method AS ENUM ('inclusive', 'exclusive');

-- ============================================================================
-- 01. PROFILES TABLE
-- Extends Supabase auth.users with additional profile information
-- ============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    alternate_phone TEXT,
    date_of_birth DATE,
    gender gender_type,
    profile_picture TEXT,
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "sms": false,
        "push": true,
        "marketing": false
    }'::jsonb,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- ============================================================================
-- 02. ORGANIZATIONS TABLE
-- Top-level entity representing a business/company
-- ============================================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    registration_type registration_type,
    
    -- Indian Business Registration Numbers
    pan_number TEXT UNIQUE,
    tan_number TEXT,
    gstin TEXT UNIQUE,
    cin_number TEXT UNIQUE,
    msme_number TEXT,
    iec_code TEXT, -- Import Export Code
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    landmark TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    
    -- Contact
    phone TEXT,
    alternate_phone TEXT,
    email TEXT,
    website TEXT,
    
    -- Branding
    logo_url TEXT,
    brand_color TEXT DEFAULT '#000000',
    
    -- Bank Details (encrypted)
    bank_name TEXT,
    bank_account_number TEXT, -- Will be encrypted
    ifsc_code TEXT,
    bank_branch TEXT,
    
    -- Subscription & Billing
    subscription_plan TEXT DEFAULT 'trial', -- trial, basic, premium, enterprise
    subscription_status TEXT DEFAULT 'active', -- active, suspended, cancelled
    subscription_start_date DATE DEFAULT CURRENT_DATE,
    subscription_end_date DATE,
    billing_email TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_pan CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    CONSTRAINT valid_gstin CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$'),
    CONSTRAINT valid_cin CHECK (cin_number IS NULL OR cin_number ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$')
);

-- ============================================================================
-- 03. STORES TABLE
-- Individual store/branch locations within an organization
-- ============================================================================
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    name TEXT NOT NULL,
    store_code TEXT UNIQUE NOT NULL,
    store_type store_type DEFAULT 'retail',
    display_name TEXT, -- For invoices/receipts
    
    -- GST Details (can be different from organization)
    gstin TEXT,
    state_code TEXT, -- 2-digit GST state code
    jurisdiction TEXT,
    jurisdiction_code TEXT,
    
    -- License & Compliance
    license_number TEXT, -- Shop & Establishment
    fssai_license TEXT,
    drug_license TEXT, -- If pharmacy
    pollution_certificate TEXT,
    fire_safety_certificate TEXT,
    
    -- Address
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    landmark TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact
    phone TEXT,
    alternate_phone TEXT,
    email TEXT,
    contact_person TEXT,
    whatsapp_number TEXT,
    
    -- Operational
    opening_date DATE,
    closing_date DATE,
    status store_status DEFAULT 'pending',
    rejection_reason TEXT,
    
    -- Area & Capacity
    floor_area DECIMAL(10, 2), -- in sq ft
    seating_capacity INTEGER,
    parking_spaces INTEGER,
    
    -- Store Features
    has_pos_system BOOLEAN DEFAULT true,
    has_online_ordering BOOLEAN DEFAULT false,
    has_delivery BOOLEAN DEFAULT false,
    has_dine_in BOOLEAN DEFAULT false,
    has_takeaway BOOLEAN DEFAULT true,
    
    -- Security
    encryption_salt TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
    ip_restriction_enabled BOOLEAN DEFAULT false,
    two_factor_required BOOLEAN DEFAULT false,
    
    -- Settings & Metadata
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_pincode CHECK (pincode ~ '^\d{6}$'),
    CONSTRAINT valid_state_code CHECK (state_code IS NULL OR state_code ~ '^\d{2}$'),
    CONSTRAINT valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

-- ============================================================================
-- 04. ROLES TABLE
-- Predefined roles with permission sets
-- ============================================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name role_name NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    priority INTEGER DEFAULT 0,
    is_system_role BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions, priority) VALUES
('super_admin', 'Super Admin', 'Platform owner with full access to all organizations and stores', 
 '{
    "all": true,
    "manage_platform": true,
    "manage_organizations": true,
    "manage_stores": true,
    "approve_stores": true,
    "manage_subscriptions": true,
    "view_audit_logs": true,
    "manage_system_settings": true,
    "bypass_restrictions": true
 }'::jsonb, 100),

('store_admin', 'Store Admin', 'Store owner/administrator with complete store control', 
 '{
    "manage_employees": true,
    "manage_ip_whitelist": true,
    "manage_store_settings": true,
    "view_reports": true,
    "export_reports": true,
    "manage_inventory": true,
    "process_sales": true,
    "void_transactions": true,
    "process_refunds": true,
    "view_audit_logs": true,
    "manage_taxes": true,
    "manage_discounts": true,
    "view_financials": true,
    "manage_backup": true,
    "manage_integrations": true,
    "manage_customers": true,
    "manage_suppliers": true,
    "manage_categories": true,
    "manage_payment_methods": true,
    "close_day": true,
    "modify_closed_sales": false
 }'::jsonb, 80),

('manager', 'Store Manager', 'Store manager with operational control', 
 '{
    "manage_employees": true,
    "view_reports": true,
    "manage_inventory": true,
    "process_sales": true,
    "void_transactions": true,
    "process_refunds": true,
    "manage_daily_sales": true,
    "manage_cash_drawer": true,
    "view_basic_financials": true,
    "manage_customers": true,
    "manage_suppliers": true,
    "close_day": true,
    "manage_categories": true,
    "apply_bulk_discounts": true,
    "modify_closed_sales": false
 }'::jsonb, 60),

('accountant', 'Accountant', 'Handles financial aspects and compliance', 
 '{
    "view_financials": true,
    "manage_taxes": true,
    "process_refunds": true,
    "view_reports": true,
    "export_reports": true,
    "manage_expenses": true,
    "reconcile_payments": true,
    "generate_gst_reports": true,
    "view_audit_logs": true,
    "manage_payment_methods": true,
    "view_invoices": true,
    "modify_closed_sales": false
 }'::jsonb, 50),

('inventory_manager', 'Inventory Manager', 'Manages stock and inventory', 
 '{
    "manage_inventory": true,
    "process_purchase_orders": true,
    "manage_suppliers": true,
    "manage_categories": true,
    "view_stock_alerts": true,
    "initiate_stock_transfers": true,
    "manage_products": true,
    "adjust_stock": true,
    "view_stock_reports": true,
    "manage_barcode": true,
    "import_products": true,
    "modify_closed_sales": false
 }'::jsonb, 40),

('cashier', 'Cashier', 'Processes sales and basic operations', 
 '{
    "process_sales": true,
    "view_inventory": true,
    "process_returns": true,
    "manage_cash_drawer": true,
    "apply_discounts": true,
    "view_basic_reports": true,
    "search_products": true,
    "manage_customers": true,
    "hold_transactions": true,
    "split_payments": true,
    "modify_closed_sales": false
 }'::jsonb, 20);

-- ============================================================================
-- 05. STORE_USERS TABLE
-- Junction table linking users to stores with roles
-- ============================================================================
CREATE TABLE store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    
    -- Employee Identification
    employee_id TEXT,
    designation TEXT,
    department TEXT,
    reporting_manager_id UUID REFERENCES store_users(id),
    
    -- Access Control
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    banned_at TIMESTAMPTZ,
    banned_reason TEXT,
    banned_by UUID REFERENCES auth.users(id),
    
    -- Login Tracking
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    backup_codes TEXT[], -- Array of backup codes
    
    -- Permissions Override (for special cases)
    custom_permissions JSONB DEFAULT NULL, -- Overrides role permissions if set
    
    -- Work Schedule
    work_schedule JSONB DEFAULT '{
        "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "saturday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "sunday": {"enabled": false, "start": null, "end": null}
    }'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(store_id, user_id),
    CONSTRAINT no_self_reporting CHECK (id != reporting_manager_id)
);

-- ============================================================================
-- 06. EMPLOYEES TABLE
-- Detailed employee information (extends store_users)
-- ============================================================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_user_id UUID NOT NULL REFERENCES store_users(id) ON DELETE CASCADE UNIQUE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Personal Information
    employee_code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    date_of_birth DATE,
    gender gender_type,
    blood_group blood_group_type,
    marital_status marital_status_type,
    spouse_name TEXT,
    anniversary_date DATE,
    father_name TEXT,
    mother_name TEXT,
    nationality TEXT DEFAULT 'Indian',
    
    -- Address
    present_address TEXT,
    permanent_address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    same_as_permanent BOOLEAN DEFAULT false,
    
    -- Official Details
    department TEXT,
    designation TEXT,
    employee_type employee_type DEFAULT 'full_time',
    employment_status employment_status DEFAULT 'probation',
    joining_date DATE NOT NULL,
    confirmation_date DATE,
    probation_end_date DATE,
    exit_date DATE,
    exit_reason TEXT,
    notice_period_days INTEGER DEFAULT 30,
    
    -- Compensation
    salary DECIMAL(12,2),
    pay_frequency pay_frequency DEFAULT 'monthly',
    basic_salary DECIMAL(12,2),
    hra DECIMAL(12,2), -- House Rent Allowance
    da DECIMAL(12,2), -- Dearness Allowance
    special_allowance DECIMAL(12,2),
    pf_applicable BOOLEAN DEFAULT true,
    esi_applicable BOOLEAN DEFAULT false,
    professional_tax DECIMAL(10,2),
    
    -- Bank Details (encrypted)
    bank_name TEXT,
    bank_account_number TEXT, -- Encrypted
    ifsc_code TEXT,
    bank_branch TEXT,
    account_holder_name TEXT,
    
    -- Government IDs (encrypted)
    pan_number TEXT, -- Encrypted
    uan_number TEXT, -- Universal Account Number (EPF)
    esic_number TEXT, -- Employee State Insurance
    aadhar_number TEXT UNIQUE, -- Encrypted
    passport_number TEXT, -- Encrypted
    driving_license TEXT, -- Encrypted
    voter_id TEXT, -- Encrypted
    
    -- Documents (stored as array of objects)
    documents JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"type": "aadhar", "url": "...", "verified": true, "uploaded_at": "2025-01-01"}]
    
    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_address TEXT,
    
    -- Education & Skills
    highest_qualification TEXT,
    institution_name TEXT,
    year_of_passing INTEGER,
    skills TEXT[],
    certifications JSONB DEFAULT '[]'::jsonb,
    
    -- Previous Employment
    previous_employer TEXT,
    previous_designation TEXT,
    previous_experience_years DECIMAL(4,2),
    total_experience_years DECIMAL(4,2),
    
    -- Performance & Attendance
    performance_rating DECIMAL(3,2), -- 0.00 to 5.00
    attendance_percentage DECIMAL(5,2),
    leaves_available INTEGER DEFAULT 0,
    leaves_taken INTEGER DEFAULT 0,
    
    -- System fields
    photo_url TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_employee_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_employee_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT valid_salary CHECK (salary >= 0),
    CONSTRAINT valid_rating CHECK (performance_rating IS NULL OR (performance_rating >= 0 AND performance_rating <= 5))
);

-- ============================================================================
-- 07. IP_WHITELIST TABLE
-- IP-based access control for stores
-- ============================================================================
CREATE TABLE ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- IP Configuration
    ip_address INET NOT NULL,
    ip_range_start INET,
    ip_range_end INET,
    subnet_mask TEXT, -- CIDR notation support
    
    -- Details
    description TEXT,
    purpose whitelist_purpose,
    device_name TEXT,
    mac_address TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    
    -- Tracking
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(store_id, ip_address),
    CONSTRAINT valid_ip_range CHECK (
        (ip_range_start IS NULL AND ip_range_end IS NULL) OR
        (ip_range_start IS NOT NULL AND ip_range_end IS NOT NULL AND ip_range_start <= ip_range_end)
    )
);

-- ============================================================================
-- 08. STORE_SETTINGS TABLE
-- Comprehensive store configuration
-- ============================================================================
CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
    
    -- Tax Settings (India GST)
    tax_settings JSONB DEFAULT '{
        "gst_enabled": true,
        "cgst_rate": 2.5,
        "sgst_rate": 2.5,
        "igst_rate": 5.0,
        "cess_rate": 0.0,
        "hsn_required": true,
        "gst_composition_scheme": false,
        "reverse_charge_applicable": false,
        "tcs_applicable": false,
        "tds_applicable": false
    }'::jsonb,
    
    -- Payment Gateway (encrypted credentials)
    payment_gateway JSONB DEFAULT '{
        "razorpay": {
            "enabled": false,
            "key_id": null,
            "key_secret": null,
            "webhook_secret": null,
            "auto_capture": true
        },
        "paytm": {
            "enabled": false,
            "merchant_id": null,
            "merchant_key": null
        },
        "phonepe": {
            "enabled": false,
            "merchant_id": null,
            "salt_key": null,
            "salt_index": null
        },
        "stripe": {
            "enabled": false,
            "publishable_key": null,
            "secret_key": null
        }
    }'::jsonb,
    
    -- Invoice Settings
    invoice_settings JSONB DEFAULT '{
        "prefix": "INV",
        "starting_number": 1001,
        "number_format": "INV-{YYYY}-{####}",
        "show_gst": true,
        "show_hsn": true,
        "show_cgst_sgst": true,
        "show_igst": false,
        "show_cess": false,
        "show_discount": true,
        "show_delivery_charges": false,
        "terms": "Goods once sold will not be taken back or exchanged.",
        "footer": "Thank you for your business!",
        "invoice_copy_count": 2,
        "enable_digital_signature": false,
        "signature_image_url": null,
        "authorized_signatory_name": null,
        "round_off": true,
        "decimal_places": 2
    }'::jsonb,
    
    -- Receipt Printer Settings
    printer_settings JSONB DEFAULT '{
        "type": "thermal",
        "paper_width": 80,
        "character_per_line": 42,
        "font_size": 12,
        "header": "",
        "footer": "Visit again!",
        "show_barcode": true,
        "show_qr_code": false,
        "show_logo": true,
        "logo_size": "small",
        "print_copies": 1,
        "auto_print": true,
        "cut_paper": true
    }'::jsonb,
    
    -- Business Hours
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "21:00", "closed": false, "breaks": []},
        "tuesday": {"open": "09:00", "close": "21:00", "closed": false, "breaks": []},
        "wednesday": {"open": "09:00", "close": "21:00", "closed": false, "breaks": []},
        "thursday": {"open": "09:00", "close": "21:00", "closed": false, "breaks": []},
        "friday": {"open": "09:00", "close": "21:00", "closed": false, "breaks": []},
        "saturday": {"open": "10:00", "close": "22:00", "closed": false, "breaks": []},
        "sunday": {"open": "10:00", "close": "20:00", "closed": false, "breaks": []}
    }'::jsonb,
    
    -- Holiday Calendar
    holidays JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"date": "2025-01-26", "name": "Republic Day", "closed": true}]
    
    -- Currency Settings
    currency_code TEXT DEFAULT 'INR',
    currency_symbol TEXT DEFAULT '₹',
    currency_position TEXT DEFAULT 'before', -- before or after
    thousand_separator TEXT DEFAULT ',',
    decimal_separator TEXT DEFAULT '.',
    decimal_places INTEGER DEFAULT 2,
    
    -- GST Calculation
    gst_calculation_method gst_calculation_method DEFAULT 'inclusive',
    
    -- Discount Settings
    discount_settings JSONB DEFAULT '{
        "max_discount_percentage": 50,
        "allow_item_discount": true,
        "allow_invoice_discount": true,
        "require_approval_above": 25,
        "discount_on_mrp": false
    }'::jsonb,
    
    -- Inventory Settings
    inventory_settings JSONB DEFAULT '{
        "low_stock_alert": true,
        "low_stock_threshold": 10,
        "negative_stock_allowed": false,
        "auto_generate_barcode": true,
        "barcode_prefix": "STORE",
        "enable_batch_tracking": false,
        "enable_expiry_tracking": false,
        "expiry_alert_days": 30
    }'::jsonb,
    
    -- Sales Settings
    sales_settings JSONB DEFAULT '{
        "allow_credit_sales": true,
        "max_credit_days": 30,
        "max_credit_amount": 50000,
        "require_customer_for_credit": true,
        "allow_hold_bills": true,
        "max_hold_bills": 10,
        "allow_layaway": false,
        "mandatory_customer_phone": false,
        "send_sms_receipt": false,
        "send_email_receipt": false,
        "send_whatsapp_receipt": false
    }'::jsonb,
    
    -- POS Settings
    pos_settings JSONB DEFAULT '{
        "offline_mode_enabled": true,
        "quick_billing_mode": false,
        "show_product_images": true,
        "barcode_scanner_enabled": true,
        "weighing_scale_enabled": false,
        "cash_drawer_enabled": true,
        "customer_display_enabled": false,
        "sound_on_scan": true,
        "shortcut_keys_enabled": true
    }'::jsonb,
    
    -- Notification Settings
    notification_settings JSONB DEFAULT '{
        "low_stock_alert": true,
        "expiry_alert": true,
        "daily_sales_report": false,
        "weekly_sales_report": false,
        "payment_received": true,
        "new_order": true
    }'::jsonb,
    
    -- Backup Settings
    backup_settings JSONB DEFAULT '{
        "auto_backup_enabled": true,
        "backup_frequency": "daily",
        "backup_time": "02:00",
        "retention_days": 30,
        "cloud_backup": true
    }'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 09. AUDIT_LOGS TABLE
-- Comprehensive audit trail
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Action Details
    action TEXT NOT NULL,
    action_type TEXT, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entity_type TEXT,
    entity_id UUID,
    
    -- Change Tracking
    old_data JSONB,
    new_data JSONB,
    changes JSONB, -- Specific fields that changed
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    device_info JSONB,
    
    -- Status & Result
    status TEXT DEFAULT 'success', -- success, failed, partial
    error_message TEXT,
    
    -- Additional Context
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_action_type CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'VOID', 'REFUND', 'EXPORT', 'IMPORT', 'OTHER'))
);

-- ============================================================================
-- 10. INVITATIONS TABLE
-- Employee invitation management
-- ============================================================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Invitation Details
    email TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Security
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Status
    status invitation_status DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    
    -- Employee Pre-fill Data (optional)
    employee_data JSONB DEFAULT '{}'::jsonb,
    -- Format: {"first_name": "John", "last_name": "Doe", "phone": "+919876543210", "designation": "Cashier"}
    
    -- Notification Tracking
    email_sent_at TIMESTAMPTZ,
    email_opened_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_invitation_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- ============================================================================
-- 11. SESSIONS TABLE
-- User session tracking
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Session Details
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    
    -- Device & Location
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    -- Format: {"type": "desktop", "os": "Windows", "browser": "Chrome", "version": "120"}
    
    location_info JSONB DEFAULT '{}'::jsonb,
    -- Format: {"city": "Delhi", "country": "India", "timezone": "Asia/Kolkata"}
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security
    login_method TEXT DEFAULT 'password', -- password, google, otp, biometric
    two_factor_verified BOOLEAN DEFAULT false,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT
);

-- ============================================================================
-- 12. GST_DETAILS TABLE
-- GST registration details for stores
-- ============================================================================
CREATE TABLE gst_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- GSTIN Details
    gstin TEXT NOT NULL,
    business_name TEXT NOT NULL,
    trade_name TEXT,
    constitution TEXT, -- Proprietorship, Partnership, Company, etc.
    
    -- Status
    gst_status gst_status DEFAULT 'active',
    registration_date DATE,
    cancellation_date DATE,
    cancellation_reason TEXT,
    
    -- Tax Payer Info
    tax_payer_type tax_payer_type DEFAULT 'regular',
    
    -- Jurisdiction
    jurisdiction TEXT,
    jurisdiction_center TEXT,
    ward TEXT,
    circle TEXT,
    division TEXT,
    
    -- Address from GSTIN
    principal_place_address TEXT,
    principal_place_city TEXT,
    principal_place_state TEXT,
    principal_place_pincode TEXT,
    
    -- Nature of Business
    nature_of_business TEXT[],
    -- Example: ['Retail Trade', 'Wholesale Trade']
    
    -- Additional Places of Business
    additional_places JSONB DEFAULT '[]'::jsonb,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verification_source TEXT, -- manual, api, government_portal
    
    -- GST Portal Credentials (encrypted)
    gst_username TEXT,
    gst_password TEXT, -- Encrypted
    
    -- Return Filing
    last_return_filed DATE,
    filing_frequency TEXT, -- monthly, quarterly, annually
    
    -- Compliance
    is_primary BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_gstin_format CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$')
);

-- ============================================================================
-- 13. HSN_SAC_CODES TABLE
-- HSN and SAC codes with tax rates
-- ============================================================================
CREATE TABLE hsn_sac_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Code Details
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    type hsn_type NOT NULL,
    
    -- Hierarchy (for HSN)
    chapter TEXT, -- 2 digits
    heading TEXT, -- 4 digits
    sub_heading TEXT, -- 6 digits
    tariff_item TEXT, -- 8 digits
    
    -- Tax Rates
    cgst_rate DECIMAL(5,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Additional Taxes
    compensation_cess DECIMAL(5,2) DEFAULT 0,
    additional_tax DECIMAL(5,2) DEFAULT 0,
    
    -- Validity
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Usage Tracking
    usage_count INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_rates CHECK (
        cgst_rate >= 0 AND sgst_rate >= 0 AND 
        igst_rate >= 0 AND cess_rate >= 0
    )
);

-- Insert common HSN/SAC codes
INSERT INTO hsn_sac_codes (code, description, type, cgst_rate, sgst_rate, igst_rate, chapter, heading) VALUES
-- Services (SAC)
('9983', 'Retail trade services', 'sac', 2.5, 2.5, 5.0, '99', '9983'),
('9984', 'Wholesale trade services', 'sac', 2.5, 2.5, 5.0, '99', '9984'),
('9985', 'Food and beverage serving services', 'sac', 2.5, 2.5, 5.0, '99', '9985'),
('9986', 'Transport and storage services', 'sac', 2.5, 2.5, 5.0, '99', '9986'),
('9987', 'Telecommunication services', 'sac', 9.0, 9.0, 18.0, '99', '9987'),
('9988', 'Financial and related services', 'sac', 9.0, 9.0, 18.0, '99', '9988'),
('9989', 'Real estate services', 'sac', 9.0, 9.0, 18.0, '99', '9989'),
('9990', 'Rental and leasing services', 'sac', 9.0, 9.0, 18.0, '99', '9990'),
('9991', 'Business support services', 'sac', 9.0, 9.0, 18.0, '99', '9991'),
('9992', 'Educational services', 'sac', 9.0, 9.0, 18.0, '99', '9992'),
('9993', 'Health and social care services', 'sac', 2.5, 2.5, 5.0, '99', '9993'),

-- Goods (HSN)
('1001', 'Wheat and meslin', 'hsn', 0, 0, 0, '10', '1001'),
('1006', 'Rice', 'hsn', 0, 0, 0, '10', '1006'),
('0402', 'Milk and cream, concentrated', 'hsn', 0, 0, 0, '04', '0402'),
('0901', 'Coffee', 'hsn', 2.5, 2.5, 5.0, '09', '0901'),
('0902', 'Tea', 'hsn', 2.5, 2.5, 5.0, '09', '0902'),
('1701', 'Cane or beet sugar', 'hsn', 0, 0, 0, '17', '1701'),
('2106', 'Food preparations not elsewhere specified', 'hsn', 9.0, 9.0, 18.0, '21', '2106'),
('3304', 'Beauty or make-up preparations', 'hsn', 14.0, 14.0, 28.0, '33', '3304'),
('6403', 'Footwear with outer soles of rubber', 'hsn', 2.5, 2.5, 5.0, '64', '6403'),
('8517', 'Telephone sets, mobile phones', 'hsn', 9.0, 9.0, 18.0, '85', '8517'),
('9403', 'Other furniture and parts thereof', 'hsn', 9.0, 9.0, 18.0, '94', '9403');

-- ============================================================================
-- 14. PASSWORD_RESET_TOKENS TABLE
-- Secure password reset flow
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    used_at TIMESTAMPTZ,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 15. NOTIFICATIONS TABLE
-- In-app notifications
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Notification Details
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- info, success, warning, error, alert
    category TEXT, -- inventory, sales, system, employee, compliance
    
    -- Action
    action_url TEXT,
    action_label TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT false,
    
    -- Priority
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Related Entity
    entity_type TEXT,
    entity_id UUID,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- 16. ACTIVITY_LOGS TABLE
-- User activity tracking (lighter than audit_logs)
-- ============================================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    
    -- Activity Details
    activity_type TEXT NOT NULL, -- page_view, button_click, search, export, print
    description TEXT,
    page_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- Organizations
CREATE INDEX idx_organizations_pan ON organizations(pan_number);
CREATE INDEX idx_organizations_gstin ON organizations(gstin);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- Stores
CREATE INDEX idx_stores_store_code ON stores(store_code);
CREATE INDEX idx_stores_organization_id ON stores(organization_id);
CREATE INDEX idx_stores_gstin ON stores(gstin);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_state_code ON stores(state_code);
CREATE INDEX idx_stores_city ON stores(city);

-- Store Users
CREATE INDEX idx_store_users_user_id ON store_users(user_id);
CREATE INDEX idx_store_users_store_id ON store_users(store_id);
CREATE INDEX idx_store_users_role_id ON store_users(role_id);
CREATE INDEX idx_store_users_is_active ON store_users(is_active);
CREATE INDEX idx_store_users_is_banned ON store_users(is_banned);
CREATE INDEX idx_store_users_last_login ON store_users(last_login_at DESC);

-- Employees
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_store_id ON employees(store_id);
CREATE INDEX idx_employees_store_user_id ON employees(store_user_id);
CREATE INDEX idx_employees_aadhar ON employees(aadhar_number);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_phone ON employees(phone);
CREATE INDEX idx_employees_employment_status ON employees(employment_status);

-- IP Whitelist
CREATE INDEX idx_ip_whitelist_store_id ON ip_whitelist(store_id);
CREATE INDEX idx_ip_whitelist_ip ON ip_whitelist(ip_address);
CREATE INDEX idx_ip_whitelist_is_active ON ip_whitelist(is_active);

-- Audit Logs
CREATE INDEX idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);

-- Invitations
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_store_id ON invitations(store_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

-- Sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_store_id ON sessions(store_id);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity DESC);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);

-- GST Details
CREATE INDEX idx_gst_details_gstin ON gst_details(gstin);
CREATE INDEX idx_gst_details_store_id ON gst_details(store_id);
CREATE INDEX idx_gst_details_gst_status ON gst_details(gst_status);

-- HSN/SAC Codes
CREATE INDEX idx_hsn_sac_codes_code ON hsn_sac_codes(code);
CREATE INDEX idx_hsn_sac_codes_type ON hsn_sac_codes(type);
CREATE INDEX idx_hsn_sac_codes_is_active ON hsn_sac_codes(is_active);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Activity Logs
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_store_id ON activity_logs(store_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM store_users su
        JOIN roles r ON su.role_id = r.id
        WHERE su.user_id = auth.uid()
        AND r.name = 'super_admin'
        AND su.is_active = true
        AND su.is_banned = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Get user's current store
CREATE OR REPLACE FUNCTION public.get_user_store()
RETURNS UUID AS $$
DECLARE
    v_store_id UUID;
BEGIN
    SELECT store_id INTO v_store_id
    FROM store_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND is_banned = false
    ORDER BY last_login_at DESC NULLS LAST
    LIMIT 1;
    
    RETURN v_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Get user's role in a store
CREATE OR REPLACE FUNCTION public.get_user_role(p_store_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_store_id UUID;
    v_role_name TEXT;
BEGIN
    v_store_id := COALESCE(p_store_id, public.get_user_store());
    
    SELECT r.name INTO v_role_name
    FROM store_users su
    JOIN roles r ON su.role_id = r.id
    WHERE su.user_id = auth.uid()
    AND su.store_id = v_store_id
    AND su.is_active = true
    AND su.is_banned = false;
    
    RETURN v_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT, p_store_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_store_id UUID;
    v_permissions JSONB;
    v_custom_permissions JSONB;
BEGIN
    v_store_id := COALESCE(p_store_id, public.get_user_store());
    
    -- Super admin has all permissions
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Get custom permissions first (if set)
    SELECT custom_permissions INTO v_custom_permissions
    FROM store_users
    WHERE user_id = auth.uid()
    AND store_id = v_store_id
    AND is_active = true
    AND is_banned = false;
    
    -- If custom permissions are set, use them
    IF v_custom_permissions IS NOT NULL THEN
        RETURN (v_custom_permissions->p_permission)::boolean OR (v_custom_permissions->>'all')::boolean;
    END IF;
    
    -- Otherwise use role permissions
    SELECT r.permissions INTO v_permissions
    FROM store_users su
    JOIN roles r ON su.role_id = r.id
    WHERE su.user_id = auth.uid()
    AND su.store_id = v_store_id
    AND su.is_active = true
    AND su.is_banned = false;
    
    RETURN (v_permissions->p_permission)::boolean OR (v_permissions->>'all')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Check if IP is whitelisted
CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(p_store_id UUID, p_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    v_ip_restriction_enabled BOOLEAN;
BEGIN
    -- Super admin bypass IP whitelist
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Check if IP restriction is enabled for the store
    SELECT ip_restriction_enabled INTO v_ip_restriction_enabled
    FROM stores
    WHERE id = p_store_id;
    
    -- If IP restriction is not enabled, allow access
    IF NOT v_ip_restriction_enabled THEN
        RETURN true;
    END IF;
    
    -- Check if IP is whitelisted
    RETURN EXISTS (
        SELECT 1 FROM ip_whitelist
        WHERE store_id = p_store_id
        AND (
            ip_address = p_ip OR 
            (ip_range_start IS NOT NULL AND p_ip BETWEEN ip_range_start AND ip_range_end)
        )
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Check store access
CREATE OR REPLACE FUNCTION public.can_access_store(p_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_store_status store_status;
BEGIN
    -- Super admin can access any store
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;
    
    -- Check if store exists and is active
    SELECT status INTO v_store_status
    FROM stores
    WHERE id = p_store_id;
    
    IF v_store_status IS NULL THEN
        RETURN false;
    END IF;
    
    -- Non-active stores are not accessible except for super admin
    IF v_store_status != 'active' THEN
        RETURN false;
    END IF;
    
    -- Check if user belongs to store and is active
    RETURN EXISTS (
        SELECT 1 FROM store_users
        WHERE store_id = p_store_id
        AND user_id = auth.uid()
        AND is_active = true
        AND is_banned = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT s.organization_id INTO v_org_id
    FROM store_users su
    JOIN stores s ON su.store_id = s.id
    WHERE su.user_id = auth.uid()
    AND su.is_active = true
    AND su.is_banned = false
    LIMIT 1;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Check if user owns the store
CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM store_users su
        JOIN roles r ON su.role_id = r.id
        WHERE su.user_id = auth.uid()
        AND su.store_id = p_store_id
        AND r.name = 'store_admin'
        AND su.is_active = true
        AND su.is_banned = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Secure login with all validations
CREATE OR REPLACE FUNCTION public.login_user(
    p_email TEXT,
    p_ip INET,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_store_id UUID;
    v_store_user_id UUID;
    v_role_name TEXT;
    v_store_status store_status;
    v_is_active BOOLEAN;
    v_is_banned BOOLEAN;
    v_locked_until TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_CREDENTIALS',
            'message', 'Invalid email or password'
        );
    END IF;
    
    -- Check if user has store assignment
    SELECT 
        su.id, su.store_id, su.is_active, su.is_banned, 
        su.locked_until, r.name, s.status
    INTO 
        v_store_user_id, v_store_id, v_is_active, v_is_banned,
        v_locked_until, v_role_name, v_store_status
    FROM store_users su
    JOIN roles r ON su.role_id = r.id
    JOIN stores s ON su.store_id = s.id
    WHERE su.user_id = v_user_id
    ORDER BY su.last_login_at DESC NULLS LAST
    LIMIT 1;
    
    IF v_store_id IS NULL THEN
        INSERT INTO audit_logs (user_id, action, action_type, status, ip_address, error_message)
        VALUES (v_user_id, 'LOGIN_FAILED', 'LOGIN', 'failed', p_ip, 'No store assignment');
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'NO_STORE_ASSIGNMENT',
            'message', 'No active store assignment found. Please contact administrator.'
        );
    END IF;
    
    -- Check if account is locked
    IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCOUNT_LOCKED',
            'message', 'Account is temporarily locked. Please try again later.',
            'locked_until', v_locked_until
        );
    END IF;
    
    -- Check if user is banned
    IF v_is_banned THEN
        INSERT INTO audit_logs (store_id, user_id, action, action_type, status, ip_address, error_message)
        VALUES (v_store_id, v_user_id, 'LOGIN_FAILED', 'LOGIN', 'failed', p_ip, 'Account banned');
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCOUNT_BANNED',
            'message', 'Your account has been suspended. Please contact administrator.'
        );
    END IF;
    
    -- Check if user is active
    IF NOT v_is_active THEN
        INSERT INTO audit_logs (store_id, user_id, action, action_type, status, ip_address, error_message)
        VALUES (v_store_id, v_user_id, 'LOGIN_FAILED', 'LOGIN', 'failed', p_ip, 'Account inactive');
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACCOUNT_INACTIVE',
            'message', 'Your account is inactive. Please contact administrator.'
        );
    END IF;
    
    -- Check store status
    IF v_store_status != 'active' THEN
        INSERT INTO audit_logs (store_id, user_id, action, action_type, status, ip_address, error_message)
        VALUES (v_store_id, v_user_id, 'LOGIN_FAILED', 'LOGIN', 'failed', p_ip, 'Store not active: ' || v_store_status);
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'STORE_NOT_ACTIVE',
            'message', 'Store is not active. Status: ' || v_store_status,
            'store_status', v_store_status
        );
    END IF;
    
    -- Check IP whitelist
    IF NOT public.is_ip_whitelisted(v_store_id, p_ip) THEN
        -- Increment login attempts
        UPDATE store_users
        SET login_attempts = login_attempts + 1,
            locked_until = CASE 
                WHEN login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL
            END
        WHERE id = v_store_user_id;
        
        INSERT INTO audit_logs (store_id, user_id, action, action_type, status, ip_address, error_message)
        VALUES (v_store_id, v_user_id, 'LOGIN_FAILED', 'LOGIN', 'failed', p_ip, 'IP not whitelisted');
        
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'IP_NOT_WHITELISTED',
            'message', 'Access denied. Your IP address is not authorized for this store.'
        );
    END IF;
    
    -- Update last login
    UPDATE store_users
    SET 
        last_login_at = NOW(),
        last_login_ip = p_ip,
        login_attempts = 0,
        locked_until = NULL
    WHERE id = v_store_user_id;
    
    -- Create session
    INSERT INTO sessions (
        user_id, 
        store_id, 
        session_token,
        ip_address, 
        user_agent,
        device_info,
        expires_at
    ) VALUES (
        v_user_id, 
        v_store_id,
        encode(gen_random_bytes(32), 'hex'),
        p_ip,
        p_user_agent,
        p_device_info,
        NOW() + INTERVAL '7 days'
    );
    
    -- Update IP whitelist last_used_at
    UPDATE ip_whitelist
    SET 
        last_used_at = NOW(),
        usage_count = usage_count + 1
    WHERE store_id = v_store_id
    AND ip_address = p_ip;
    
    -- Log successful login
    INSERT INTO audit_logs (
        store_id, 
        user_id, 
        action, 
        action_type,
        status,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        v_store_id, 
        v_user_id, 
        'LOGIN_SUCCESS', 
        'LOGIN',
        'success',
        p_ip,
        p_user_agent,
        jsonb_build_object('role', v_role_name)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Login successful',
        'user_id', v_user_id,
        'store_id', v_store_id,
        'role', v_role_name,
        'store_status', v_store_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE hsn_sac_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
    ON profiles FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Store admins and managers can view profiles of their employees"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM store_users su1
            WHERE su1.user_id = auth.uid()
            AND su1.is_active = true
            AND su1.is_banned = false
            AND public.get_user_role(su1.store_id) IN ('store_admin', 'manager')
            AND EXISTS (
                SELECT 1 FROM store_users su2
                WHERE su2.user_id = profiles.id
                AND su2.store_id = su1.store_id
            )
        )
    );

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their organization"
    ON organizations FOR SELECT
    USING (
        id = public.get_user_organization()
        OR public.is_super_admin()
    );

CREATE POLICY "Super admins can manage all organizations"
    ON organizations FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Store admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        id = public.get_user_organization()
        AND public.get_user_role() = 'store_admin'
    );

-- ============================================================================
-- STORES POLICIES
-- ====================================================================
-- ============================================================================
-- STORES POLICIES (FIXED - NO OLD/NEW IN POLICIES)
-- ============================================================================

CREATE POLICY "Authenticated users can create stores (pending approval)"
    ON stores FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND status = 'pending'
    );

CREATE POLICY "Users can view their stores"
    ON stores FOR SELECT
    USING (
        public.can_access_store(id)
        OR public.is_super_admin()
        OR (status = 'pending' AND created_by = auth.uid())
    );

-- Simple policy for store admins to update their stores
CREATE POLICY "Store admins can update their stores"
    ON stores FOR UPDATE
    USING (
        public.is_store_owner(id)
    )
    WITH CHECK (
        public.is_store_owner(id)
    );

-- Super admin policy
CREATE POLICY "Super admins can manage all stores"
    ON stores FOR ALL
    USING (public.is_super_admin());

-- Create trigger to prevent status changes by non-super-admins
CREATE OR REPLACE FUNCTION prevent_store_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- If not super admin, prevent status change
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Only super admins can change store status. Current status: %, Attempted status: %', 
                OLD.status, NEW.status;
        END IF;
    END IF;
    
    -- For non-super-admin updates, ensure only allowed fields are changed
    IF NOT public.is_super_admin() THEN
        -- List of fields that store admins are allowed to update
        IF (
            OLD.organization_id = NEW.organization_id AND
            OLD.store_code = NEW.store_code AND
            OLD.gstin IS NOT DISTINCT FROM NEW.gstin AND
            OLD.state_code IS NOT DISTINCT FROM NEW.state_code AND
            OLD.license_number IS NOT DISTINCT FROM NEW.license_number AND
            OLD.fssai_license IS NOT DISTINCT FROM NEW.fssai_license AND
            OLD.drug_license IS NOT DISTINCT FROM NEW.drug_license AND
            OLD.pollution_certificate IS NOT DISTINCT FROM NEW.pollution_certificate AND
            OLD.fire_safety_certificate IS NOT DISTINCT FROM NEW.fire_safety_certificate AND
            OLD.encryption_salt = NEW.encryption_salt AND
            OLD.ip_restriction_enabled = NEW.ip_restriction_enabled AND
            OLD.two_factor_required = NEW.two_factor_required AND
            OLD.approved_at IS NOT DISTINCT FROM NEW.approved_at AND
            OLD.approved_by IS NOT DISTINCT FROM NEW.approved_by AND
            OLD.created_by = NEW.created_by AND
            OLD.created_at = NEW.created_at
        ) THEN
            -- Allow the update (only basic info fields changed)
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Store admins can only update basic store information (name, address, contact, settings, etc.). Critical fields cannot be modified.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_store_status_change_trigger
    BEFORE UPDATE ON stores
    FOR EACH ROW
    WHEN (public.is_store_owner(OLD.id) OR public.is_super_admin())
    EXECUTE FUNCTION prevent_store_status_change();

-- Alternative: Simpler version if you just want to prevent status changes
CREATE OR REPLACE FUNCTION prevent_store_status_change_simple()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a status change by non-super-admin
    IF OLD.status IS DISTINCT FROM NEW.status AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can change store status. Current status: %, Attempted status: %', 
            OLD.status, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the first trigger if you want to use the simpler version

CREATE TRIGGER prevent_store_status_change_simple_trigger
    BEFORE UPDATE ON stores
    FOR EACH ROW
    WHEN (public.is_store_owner(OLD.id))
    EXECUTE FUNCTION prevent_store_status_change_simple();

-- ============================================================================
-- ROLES POLICIES
-- ============================================================================

CREATE POLICY "All authenticated users can view roles"
    ON roles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage roles"
    ON roles FOR ALL
    USING (public.is_super_admin());

-- ============================================================================
-- STORE_USERS POLICIES (FIXED)
-- ============================================================================
-- ============================================================================
-- STORE_USERS POLICIES (COMPLETELY FIXED - NO OLD/NEW IN POLICIES)
-- ============================================================================

-- View policy - unchanged
CREATE POLICY "Users can view store users in their store"
    ON store_users FOR SELECT
    USING (
        store_id = public.get_user_store()
        OR public.is_super_admin()
        OR user_id = auth.uid()
    );

-- Management policy - unchanged
CREATE POLICY "Store admins and managers can manage store users"
    ON store_users FOR ALL
    USING (
        (
            public.has_permission('manage_employees', store_id)
            AND store_id = public.get_user_store()
        )
        OR public.is_super_admin()
    )
    WITH CHECK (
        -- Prevent modifying super admin records unless you are super admin
        NOT EXISTS (
            SELECT 1 FROM store_users su
            JOIN roles r ON su.role_id = r.id
            WHERE su.id = store_users.id
            AND r.name = 'super_admin'
        )
        OR public.is_super_admin()
    );

-- For last login updates, we need to use a trigger approach
-- First, create a simple policy that just ensures user owns the record
CREATE POLICY "Users can update their own records"
    ON store_users FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Then create a trigger to enforce what can be updated
CREATE OR REPLACE FUNCTION restrict_store_user_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow updates to last_login_at and last_login_ip
    -- All other fields must remain unchanged
    IF (
        OLD.user_id = NEW.user_id AND
        OLD.store_id = NEW.store_id AND
        OLD.role_id = NEW.role_id AND
        OLD.is_active = NEW.is_active AND
        OLD.is_banned = NEW.is_banned AND
        OLD.employee_id IS NOT DISTINCT FROM NEW.employee_id AND
        OLD.designation IS NOT DISTINCT FROM NEW.designation AND
        OLD.department IS NOT DISTINCT FROM NEW.department AND
        OLD.reporting_manager_id IS NOT DISTINCT FROM NEW.reporting_manager_id AND
        OLD.banned_at IS NOT DISTINCT FROM NEW.banned_at AND
        OLD.banned_reason IS NOT DISTINCT FROM NEW.banned_reason AND
        OLD.banned_by IS NOT DISTINCT FROM NEW.banned_by AND
        OLD.login_attempts IS NOT DISTINCT FROM NEW.login_attempts AND
        OLD.locked_until IS NOT DISTINCT FROM NEW.locked_until AND
        OLD.two_factor_enabled IS NOT DISTINCT FROM NEW.two_factor_enabled AND
        OLD.two_factor_secret IS NOT DISTINCT FROM NEW.two_factor_secret AND
        OLD.backup_codes IS NOT DISTINCT FROM NEW.backup_codes AND
        OLD.custom_permissions IS NOT DISTINCT FROM NEW.custom_permissions AND
        OLD.work_schedule IS NOT DISTINCT FROM NEW.work_schedule
    ) THEN
        -- Allow the update (only last_login_at and last_login_ip changed)
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'You can only update last_login_at and last_login_ip fields. Other fields cannot be modified through this policy.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER restrict_store_user_updates_trigger
    BEFORE UPDATE ON store_users
    FOR EACH ROW
    WHEN (OLD.user_id = auth.uid())
    EXECUTE FUNCTION restrict_store_user_updates();

-- Additionally, create a function for managers/admins to update other fields
CREATE OR REPLACE FUNCTION admin_update_store_user(
    p_user_id UUID,
    p_store_id UUID,
    p_updates JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Check if the current user has manage_employees permission
    SELECT public.has_permission('manage_employees', p_store_id) INTO v_has_permission;
    
    IF NOT v_has_permission AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Permission denied: You do not have manage_employees permission';
    END IF;
    
    -- Update the store_user with provided updates
    UPDATE store_users
    SET
        role_id = COALESCE((p_updates->>'role_id')::UUID, role_id),
        is_active = COALESCE((p_updates->>'is_active')::BOOLEAN, is_active),
        is_banned = COALESCE((p_updates->>'is_banned')::BOOLEAN, is_banned),
        designation = COALESCE(p_updates->>'designation', designation),
        department = COALESCE(p_updates->>'department', department),
        updated_at = NOW()
    WHERE id = p_user_id AND store_id = p_store_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- EMPLOYEES POLICIES
-- ============================================================================

CREATE POLICY "Users can view employees in their store"
    ON employees FOR SELECT
    USING (
        store_id = public.get_user_store()
        OR public.is_super_admin()
    );

CREATE POLICY "Store admins and managers can manage employees"
    ON employees FOR ALL
    USING (
        (
            public.has_permission('manage_employees', store_id)
            AND store_id = public.get_user_store()
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Employees can view their own record"
    ON employees FOR SELECT
    USING (
        store_user_id IN (
            SELECT id FROM store_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- IP_WHITELIST POLICIES
-- ============================================================================

CREATE POLICY "Users can view IP whitelist of their store"
    ON ip_whitelist FOR SELECT
    USING (
        store_id = public.get_user_store()
        OR public.is_super_admin()
    );

CREATE POLICY "Store admins can manage IP whitelist"
    ON ip_whitelist FOR ALL
    USING (
        (
            public.is_store_owner(store_id)
            AND store_id = public.get_user_store()
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- STORE_SETTINGS POLICIES
-- ============================================================================

CREATE POLICY "Store admins can manage settings"
    ON store_settings FOR ALL
    USING (
        (
            public.is_store_owner(store_id)
            AND store_id = public.get_user_store()
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Managers and accountants can view settings"
    ON store_settings FOR SELECT
    USING (
        store_id = public.get_user_store()
        AND public.get_user_role(store_id) IN ('manager', 'accountant', 'inventory_manager')
    );

-- ============================================================================
-- AUDIT_LOGS POLICIES
-- ============================================================================

CREATE POLICY "Super admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Store admins can view audit logs of their store"
    ON audit_logs FOR SELECT
    USING (
        store_id = public.get_user_store()
        AND public.has_permission('view_audit_logs', store_id)
    );

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- INVITATIONS POLICIES
-- ============================================================================

CREATE POLICY "Store admins and managers can manage invitations"
    ON invitations FOR ALL
    USING (
        (
            public.has_permission('manage_employees', store_id)
            AND store_id = public.get_user_store()
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Users can view invitations sent to their email"
    ON invitations FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- ============================================================================
-- SESSIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own sessions"
    ON sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can terminate their own sessions"
    ON sessions FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
    ON sessions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Store admins can view sessions in their store"
    ON sessions FOR SELECT
    USING (
        store_id = public.get_user_store()
        AND public.is_store_owner(store_id)
    );

CREATE POLICY "Super admins can manage all sessions"
    ON sessions FOR ALL
    USING (public.is_super_admin());

-- ============================================================================
-- GST_DETAILS POLICIES
-- ============================================================================

CREATE POLICY "Users can view GST details of their store"
    ON gst_details FOR SELECT
    USING (
        store_id = public.get_user_store()
        OR public.is_super_admin()
    );

CREATE POLICY "Store admins can manage GST details"
    ON gst_details FOR ALL
    USING (
        (
            public.is_store_owner(store_id)
            AND store_id = public.get_user_store()
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- HSN_SAC_CODES POLICIES
-- ============================================================================

CREATE POLICY "All authenticated users can view HSN/SAC codes"
    ON hsn_sac_codes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage HSN/SAC codes"
    ON hsn_sac_codes FOR ALL
    USING (public.is_super_admin());

-- ============================================================================
-- PASSWORD_RESET_TOKENS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own reset tokens"
    ON password_reset_tokens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create reset tokens"
    ON password_reset_tokens FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own reset tokens"
    ON password_reset_tokens FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- ACTIVITY_LOGS POLICIES
-- ============================================================================

CREATE POLICY "System can insert activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Super admins can view all activity logs"
    ON activity_logs FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Store admins can view activity logs of their store"
    ON activity_logs FOR SELECT
    USING (
        store_id = public.get_user_store()
        AND public.is_store_owner(store_id)
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Prevent self-ban/self-deactivate
CREATE OR REPLACE FUNCTION prevent_self_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.user_id = auth.uid() AND (
        NEW.is_active = false OR 
        NEW.is_banned = true OR
        NEW.role_id != OLD.role_id
    ) THEN
        RAISE EXCEPTION 'You cannot modify your own account status or role';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_self_modification_trigger
    BEFORE UPDATE ON store_users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_modification();

-- Trigger: Auto-create store_settings when store is created
CREATE OR REPLACE FUNCTION create_store_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO store_settings (store_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_store_settings_trigger
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION create_store_settings();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_users_updated_at
    BEFORE UPDATE ON store_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON store_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Log audit entries for critical operations (FIXED)
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
    v_organization_id UUID;
BEGIN
    -- Determine store_id and organization_id based on table
    IF TG_TABLE_NAME = 'stores' THEN
        v_store_id := COALESCE(NEW.id, OLD.id);
        v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
    ELSIF TG_TABLE_NAME = 'store_users' THEN
        v_store_id := COALESCE(NEW.store_id, OLD.store_id);
        SELECT organization_id INTO v_organization_id FROM stores WHERE id = v_store_id;
    ELSIF TG_TABLE_NAME = 'employees' THEN
        v_store_id := COALESCE(NEW.store_id, OLD.store_id);
        SELECT organization_id INTO v_organization_id FROM stores WHERE id = v_store_id;
    ELSIF TG_TABLE_NAME = 'ip_whitelist' THEN
        v_store_id := COALESCE(NEW.store_id, OLD.store_id);
        SELECT organization_id INTO v_organization_id FROM stores WHERE id = v_store_id;
    ELSIF TG_TABLE_NAME = 'organizations' THEN
        v_organization_id := COALESCE(NEW.id, OLD.id);
    ELSE
        v_store_id := public.get_user_store();
        v_organization_id := public.get_user_organization();
    END IF;
    
    INSERT INTO audit_logs (
        store_id,
        organization_id,
        user_id,
        action,
        action_type,
        entity_type,
        entity_id,
        old_data,
        new_data,
        ip_address
    ) VALUES (
        v_store_id,
        v_organization_id,
        auth.uid(),
        TG_OP || '_' || UPPER(TG_TABLE_NAME),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP IN ('UPDATE', 'DELETE') THEN 
                to_jsonb(OLD)  -- Fixed: Changed row_to_json(OLD) to to_jsonb(OLD)
            ELSE 
                NULL 
        END,
        CASE 
            WHEN TG_OP IN ('INSERT', 'UPDATE') THEN 
                to_jsonb(NEW)  -- Fixed: Changed row_to_json(NEW) to to_jsonb(NEW)
            ELSE 
                NULL 
        END,
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_organizations_changes
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_stores_changes
    AFTER INSERT OR UPDATE OR DELETE ON stores
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_store_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON store_users
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_employees_changes
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_ip_whitelist_changes
    AFTER INSERT OR UPDATE OR DELETE ON ip_whitelist
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Trigger: Auto-generate employee code
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
DECLARE
    v_store_code TEXT;
    v_counter INTEGER;
    v_employee_code TEXT;
BEGIN
    -- Get store code
    SELECT store_code INTO v_store_code FROM stores WHERE id = NEW.store_id;
    
    -- Get next counter
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_counter
    FROM employees
    WHERE store_id = NEW.store_id;
    
    -- Generate employee code: STORECODE-EMP001
    v_employee_code := v_store_code || '-EMP' || LPAD(v_counter::TEXT, 3, '0');
    
    NEW.employee_code := v_employee_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_employee_code_trigger
    BEFORE INSERT ON employees
    FOR EACH ROW
    WHEN (NEW.employee_code IS NULL)
    EXECUTE FUNCTION generate_employee_code();

-- Trigger: Expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invitations
    SET status = 'expired'
    WHERE expires_at < NOW()
    AND status = 'pending';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This would typically be run as a scheduled job, but we can trigger on insert
CREATE TRIGGER expire_invitations_on_insert
    BEFORE INSERT ON invitations
    FOR EACH STATEMENT
    EXECUTE FUNCTION expire_old_invitations();

-- Trigger: Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sessions
    SET is_active = false,
        terminated_at = NOW(),
        termination_reason = 'Expired'
    WHERE expires_at < NOW()
    AND is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_sessions_on_insert
    BEFORE INSERT ON sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_sessions();

-- ============================================================================
-- UTILITY FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function: Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_category TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL,
    p_store_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, store_id, title, message, type, category, priority, action_url
    ) VALUES (
        p_user_id, p_store_id, p_title, p_message, p_type, p_category, p_priority, p_action_url
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate GSTIN
CREATE OR REPLACE FUNCTION validate_gstin(p_gstin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Validate PAN
CREATE OR REPLACE FUNCTION validate_pan(p_pan TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Validate Aadhar
CREATE OR REPLACE FUNCTION validate_aadhar(p_aadhar TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_aadhar ~ '^\d{12}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: User with role and store details
CREATE OR REPLACE VIEW v_user_store_role AS
SELECT 
    su.id AS store_user_id,
    su.user_id,
    p.email,
    p.full_name,
    su.store_id,
    s.name AS store_name,
    s.store_code,
    s.status AS store_status,
    s.organization_id,
    o.name AS organization_name,
    su.role_id,
    r.name AS role_name,
    r.display_name AS role_display_name,
    r.permissions,
    su.is_active,
    su.is_banned,
    su.last_login_at
FROM store_users su
JOIN profiles p ON su.user_id = p.id
JOIN stores s ON su.store_id = s.id
JOIN organizations o ON s.organization_id = o.id
JOIN roles r ON su.role_id = r.id;

-- View: Employee full details
CREATE OR REPLACE VIEW v_employee_details AS
SELECT 
    e.*,
    su.role_id,
    r.name AS role_name,
    r.display_name AS role_display_name,
    su.is_active AS account_is_active,
    su.is_banned AS account_is_banned,
    s.name AS store_name,
    s.store_code,
    o.name AS organization_name
FROM employees e
JOIN store_users su ON e.store_user_id = su.id
JOIN roles r ON su.role_id = r.id
JOIN stores s ON e.store_id = s.id
JOIN organizations o ON s.organization_id = o.id;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Grant necessary permissions (if needed)
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profile information extending Supabase auth.users';
COMMENT ON TABLE organizations IS 'Top-level business entities (companies)';
COMMENT ON TABLE stores IS 'Individual store/branch locations within organizations';
COMMENT ON TABLE roles IS 'System roles with permission sets';
COMMENT ON TABLE store_users IS 'Junction table linking users to stores with roles';
COMMENT ON TABLE employees IS 'Detailed employee information';
COMMENT ON TABLE ip_whitelist IS 'IP-based access control for stores';
COMMENT ON TABLE store_settings IS 'Comprehensive store configuration and settings';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all critical operations';
COMMENT ON TABLE invitations IS 'Employee invitation management system';
COMMENT ON TABLE sessions IS 'User session tracking and management';
COMMENT ON TABLE gst_details IS 'GST registration details for Indian compliance';
COMMENT ON TABLE hsn_sac_codes IS 'HSN and SAC codes with tax rates for products/services';
COMMENT ON TABLE notifications IS 'In-app notification system';
COMMENT ON TABLE activity_logs IS 'User activity tracking for analytics';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ COMPLETE SCHEMA CREATED SUCCESSFULLY
    ============================================================================
    
    Schema includes:
    - 16 main tables with comprehensive fields
    - Custom types (ENUMs) for type safety
    - Row Level Security (RLS) policies
    - Helper functions for common operations
    - Audit logging system
    - Session management
    - IP whitelist security
    - GST/Indian compliance features
    - Employee management
    - Invitation system
    - Notification system
    - Multiple triggers for automation
    - Performance indexes
    - Utility views
    
    Next steps:
    1. Configure Supabase Auth settings
    2. Set up email templates for invitations
    3. Configure storage buckets for documents/images
    4. Set up cron jobs for cleanup tasks
    5. Test RLS policies thoroughly
    
    ============================================================================
    ';
END $$;