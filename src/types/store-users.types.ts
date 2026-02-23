import type {
    RoleName,
    EmployeeType,
    EmploymentStatus,
    PayFrequency,
    GenderType,
    BloodGroupType,
    MaritalStatusType,
    Json,
} from "./database.types";

// ============================================================================
// STORE USER TYPES - Junction table linking users to stores with roles
// ============================================================================

export interface StoreUser {
    id: string;
    store_id: string;
    user_id: string;
    role_id: string;
    employee_id: string | null;
    designation: string | null;
    department: string | null;
    reporting_manager_id: string | null;
    is_active: boolean;
    is_banned: boolean;
    banned_at: string | null;
    banned_reason: string | null;
    banned_by: string | null;
    last_login_at: string | null;
    last_login_ip: string | null;
    login_attempts: number;
    locked_until: string | null;
    two_factor_enabled: boolean;
    two_factor_secret: string | null;
    backup_codes: string[] | null;
    custom_permissions: Json | null;
    work_schedule: Json;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// EMPLOYEE TYPES - Detailed employee information (extends store_users)
// ============================================================================

export interface Employee {
    id: string;
    store_id: string;
    store_user_id: string | null;
    employee_code: string;

    // Personal Information
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name?: string | null; // computed: not stored in DB, derived from first/last
    date_of_birth: string | null;
    gender: GenderType | null;
    blood_group: BloodGroupType | null;
    marital_status: MaritalStatusType | null;
    nationality: string | null;

    // Contact Information
    email: string;
    alternate_email: string | null;
    phone: string;
    alternate_phone: string | null;
    whatsapp_number: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relation: string | null;

    // Address Information
    current_address_line1: string | null;
    current_address_line2: string | null;
    current_city: string | null;
    current_state: string | null;
    current_pincode: string | null;
    current_country: string | null;
    permanent_address_line1: string | null;
    permanent_address_line2: string | null;
    permanent_city: string | null;
    permanent_state: string | null;
    permanent_pincode: string | null;
    permanent_country: string | null;
    same_as_current: boolean;

    // Government IDs
    aadhar_number: string | null;
    pan_number: string | null;
    uan_number: string | null;
    esic_number: string | null;
    driving_license: string | null;
    passport_number: string | null;
    voter_id: string | null;

    // Employment Details
    employee_type: EmployeeType;
    employment_status: EmploymentStatus;
    joining_date: string;
    confirmation_date: string | null;
    probation_period_months: number;
    notice_period_days: number;
    resignation_date: string | null;
    last_working_date: string | null;
    termination_date: string | null;
    termination_reason: string | null;

    // Compensation
    salary: number | null;
    pay_frequency: PayFrequency;
    bank_name: string | null;
    bank_account_number: string | null;
    ifsc_code: string | null;
    bank_branch: string | null;
    pf_account_number: string | null;

    // Additional Information
    profile_picture: string | null;
    qualification: string | null;
    specialization: string | null;
    experience_years: number | null;
    previous_employer: string | null;
    skills: string[] | null;
    certifications: Json | null;
    documents: Json | null;
    performance_rating: number | null;
    notes: string | null;
    metadata: Json;

    // Audit
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// ENRICHED TYPES - Combination of store_user + employee + profile + role
// ============================================================================

export interface EnrichedStoreUser extends StoreUser {
    // From profiles table
    email: string;
    full_name: string | null;
    phone: string | null;
    profile_picture: string | null;

    // From roles table
    role_name: RoleName;
    role_display_name: string;
    permissions: Json;
    role_priority: number;

    // From employees table (if exists)
    employee?: Employee | null;
    employee_code?: string;

    // From stores->organizations table
    organization_id: string;
    organization_name: string;

    // From stores table
    store_name: string;
    store_code: string;
    store_status: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface AddStoreUserRequest {
    email: string;
    role_id: string;
    designation?: string;
    department?: string;
    is_active?: boolean;
    custom_permissions?: Json;

    // Employee details (optional, if creating full employee record)
    create_employee?: boolean;
    employee_data?: CreateEmployeeData;
}

export interface CreateEmployeeData {
    employee_code: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    date_of_birth?: string;
    gender?: GenderType;
    blood_group?: BloodGroupType;
    marital_status?: MaritalStatusType;

    // Contact
    alternate_email?: string;
    alternate_phone?: string;
    whatsapp_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;

    // Address
    current_address_line1?: string;
    current_address_line2?: string;
    current_city?: string;
    current_state?: string;
    current_pincode?: string;

    // Government IDs
    aadhar_number?: string;
    pan_number?: string;

    // Employment
    employee_type: EmployeeType;
    employment_status?: EmploymentStatus;
    joining_date: string;
    probation_period_months?: number;
    notice_period_days?: number;

    // Compensation
    salary?: number;
    pay_frequency: PayFrequency;
    bank_name?: string;
    bank_account_number?: string;
    ifsc_code?: string;

    // Additional
    qualification?: string;
    experience_years?: number;
    skills?: string[];
}

export interface UpdateStoreUserRequest {
    role_id?: string;
    designation?: string;
    department?: string;
    reporting_manager_id?: string | null;
    is_active?: boolean;
    custom_permissions?: Json;
    work_schedule?: Json;
}

export interface UpdateEmployeeRequest {
    // Personal
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: GenderType;
    blood_group?: BloodGroupType;
    marital_status?: MaritalStatusType;

    // Contact
    email?: string;
    alternate_email?: string;
    phone?: string;
    alternate_phone?: string;
    whatsapp_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;

    // Address
    current_address_line1?: string;
    current_address_line2?: string;
    current_city?: string;
    current_state?: string;
    current_pincode?: string;

    // Government IDs
    aadhar_number?: string;
    pan_number?: string;

    // Employment
    employee_type?: EmployeeType;
    employment_status?: EmploymentStatus;
    designation?: string;
    department?: string;

    // Compensation
    salary?: number;
    pay_frequency?: PayFrequency;
    bank_name?: string;
    bank_account_number?: string;
    ifsc_code?: string;

    // Additional
    qualification?: string;
    experience_years?: number;
    skills?: string[];
    notes?: string;
}

export interface BanUserRequest {
    reason: string;
    banned_by: string;
}

export interface ActivateUserRequest {
    is_active: boolean;
}

export interface ResetUserAccessRequest {
    reset_login_attempts?: boolean;
    unlock_account?: boolean;
    reset_2fa?: boolean;
    clear_ban?: boolean;
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

export interface StoreUserFilters {
    role_id?: string;
    role_name?: RoleName;
    department?: string;
    is_active?: boolean;
    is_banned?: boolean;
    employment_status?: EmploymentStatus;
    employee_type?: EmployeeType;
    search?: string; // Search by name, email, employee_code
}

export interface StoreUserPagination {
    page: number;
    limit: number;
    sort_by?: "full_name" | "employee_code" | "created_at" | "last_login_at";
    sort_order?: "asc" | "desc";
}

export interface StoreUserListResponse {
    users: EnrichedStoreUser[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface StoreUserStats {
    total_users: number;
    active_users: number;
    banned_users: number;
    inactive_users: number;
    by_role: Record<RoleName, number>;
    by_department: Record<string, number>;
    by_employment_status: Record<EmploymentStatus, number>;
    recent_logins: number; // Last 7 days
    never_logged_in: number;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface StoreUserAuditLog {
    id: string;
    store_user_id: string;
    action: StoreUserAuditAction;
    performed_by: string;
    performed_by_name: string;
    old_data: Json | null;
    new_data: Json | null;
    changes: Json | null;
    reason: string | null;
    ip_address: string | null;
    created_at: string;
}

export type StoreUserAuditAction =
    | "created"
    | "updated"
    | "activated"
    | "deactivated"
    | "banned"
    | "unbanned"
    | "role_changed"
    | "permissions_updated"
    | "password_reset"
    | "2fa_enabled"
    | "2fa_disabled"
    | "account_locked"
    | "account_unlocked"
    | "deleted";

// ============================================================================
// ROLE ASSIGNMENT TYPES
// ============================================================================

export interface RoleAssignment {
    id: string;
    role_id: string;
    role_name: RoleName;
    role_display_name: string;
    permissions: Json;
    priority: number;
    can_assign: boolean; // Whether current user can assign this role
}

export interface AvailableRolesResponse {
    roles: RoleAssignment[];
    current_user_role: RoleName;
    current_user_priority: number;
}

// ============================================================================
// BULK OPERATIONS TYPES
// ============================================================================

export interface BulkActivateRequest {
    user_ids: string[];
    is_active: boolean;
}

export interface BulkBanRequest {
    user_ids: string[];
    reason: string;
}

export interface BulkRoleChangeRequest {
    user_ids: string[];
    role_id: string;
}

export interface BulkOperationResponse {
    success: number;
    failed: number;
    errors: Array<{
        user_id: string;
        error: string;
    }>;
}
