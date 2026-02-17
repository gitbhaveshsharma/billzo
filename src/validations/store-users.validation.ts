import { z } from "zod";

// ============================================================================
// REUSABLE VALIDATION SCHEMAS
// ============================================================================

/** Email validation */
export const emailSchema = z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address");

/** Phone validation (Indian format) */
export const phoneSchema = z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid phone number")
    .length(10, "Phone number must be 10 digits");

/** Optional phone validation */
export const optionalPhoneSchema = z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid phone number")
    .length(10, "Phone number must be 10 digits")
    .optional()
    .or(z.literal(""));

/** PAN validation */
export const panSchema = z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format")
    .length(10, "PAN must be 10 characters");

/** Aadhar validation */
export const aadharSchema = z
    .string()
    .regex(/^\d{12}$/, "Invalid Aadhar number")
    .length(12, "Aadhar must be 12 digits");

/** IFSC validation */
export const ifscSchema = z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code")
    .length(11, "IFSC must be 11 characters");

/** Employee Code validation */
export const employeeCodeSchema = z
    .string()
    .min(3, "Employee code must be at least 3 characters")
    .max(20, "Employee code must not exceed 20 characters")
    .regex(/^[A-Z0-9_-]+$/, "Employee code must contain only uppercase letters, numbers, hyphens, and underscores");

/** Pincode validation */
export const pincodeSchema = z
    .string()
    .regex(/^\d{6}$/, "Invalid pincode")
    .length(6, "Pincode must be 6 digits");

// ============================================================================
// STORE USER SCHEMAS
// ============================================================================

/** Add Store User Schema */
export const addStoreUserSchema = z.object({
    email: emailSchema,
    role_id: z.string().uuid("Invalid role ID"),
    designation: z.string().min(2, "Designation must be at least 2 characters").optional(),
    department: z.string().min(2, "Department must be at least 2 characters").optional(),
    is_active: z.boolean().default(true),
    custom_permissions: z.record(z.string(), z.boolean()).optional(),
});

/** Update Store User Schema */
export const updateStoreUserSchema = z.object({
    role_id: z.string().uuid("Invalid role ID").optional(),
    designation: z.string().min(2, "Designation must be at least 2 characters").optional(),
    department: z.string().min(2, "Department must be at least 2 characters").optional(),
    reporting_manager_id: z.string().uuid("Invalid manager ID").nullable().optional(),
    is_active: z.boolean().optional(),
    custom_permissions: z.record(z.string(), z.boolean()).optional(),
    work_schedule: z.record(z.string(), z.any()).optional(),
    /** Ban User Schema */
    export const banUserSchema = z.object({
        user_id: z.string().uuid("Invalid user ID"),
        reason: z.string().min(10, "Ban reason must be at least 10 characters"),
    });

    /** Activate/Deactivate User Schema */
    export const activateUserSchema = z.object({
        user_id: z.string().uuid("Invalid user ID"),
        is_active: z.boolean(),
    });

    /** Reset User Access Schema */
    export const resetUserAccessSchema = z.object({
        user_id: z.string().uuid("Invalid user ID"),
        reset_login_attempts: z.boolean().default(false),
        unlock_account: z.boolean().default(false),
        reset_2fa: z.boolean().default(false),
        clear_ban: z.boolean().default(false),
    });

    // ============================================================================
    // EMPLOYEE SCHEMAS
    // ============================================================================

    /** Create Employee Schema */
    export const createEmployeeSchema = z.object({
        // Required fields
        employee_code: employeeCodeSchema,
        first_name: z.string().min(2, "First name must be at least 2 characters"),
        last_name: z.string().min(2, "Last name must be at least 2 characters"),
        email: emailSchema,
        phone: phoneSchema,
        employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]),
        joining_date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date"),
        pay_frequency: z.enum(["monthly", "weekly", "daily", "hourly"]),

        // Optional personal info
        middle_name: z.string().optional(),
        date_of_birth: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date").optional(),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
        blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
        marital_status: z.enum(["single", "married", "divorced", "widowed", "separated"]).optional(),
        nationality: z.string().optional(),

        // Optional contact
        alternate_email: emailSchema.optional(),
        alternate_phone: optionalPhoneSchema,
        whatsapp_number: optionalPhoneSchema,
        emergency_contact_name: z.string().min(2).optional(),
        emergency_contact_phone: phoneSchema.optional(),
        emergency_contact_relation: z.string().optional(),

        // Optional address
        current_address_line1: z.string().min(5, "Address must be at least 5 characters").optional(),
        current_address_line2: z.string().optional(),
        current_city: z.string().min(2).optional(),
        current_state: z.string().min(2).optional(),
        current_pincode: pincodeSchema.optional(),
        current_country: z.string().default("India"),

        // Optional government IDs
        aadhar_number: aadharSchema.optional(),
        pan_number: panSchema.optional(),
        uan_number: z.string().optional(),
        esic_number: z.string().optional(),

        // Optional employment details
        employment_status: z.enum(["active", "probation", "notice_period", "terminated", "resigned", "absconded"]).default("probation"),
        probation_period_months: z.number().min(0).max(12).default(3),
        notice_period_days: z.number().min(0).max(90).default(30),

        // Optional compensation
        salary: z.number().min(0).optional(),
        bank_name: z.string().optional(),
        bank_account_number: z.string().min(9).max(18).optional(),
        ifsc_code: ifscSchema.optional(),
        bank_branch: z.string().optional(),

        // Optional additional info
        qualification: z.string().optional(),
        experience_years: z.number().min(0).max(50).optional(),
        skills: z.array(z.string()).optional(),
        notes: z.string().optional(),
    });

    /** Update Employee Schema */
    export const updateEmployeeSchema = z.object({
        // Personal info
        first_name: z.string().min(2, "First name must be at least 2 characters").optional(),
        middle_name: z.string().optional(),
        last_name: z.string().min(2, "Last name must be at least 2 characters").optional(),
        date_of_birth: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date").optional(),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
        blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
        marital_status: z.enum(["single", "married", "divorced", "widowed", "separated"]).optional(),

        // Contact
        email: emailSchema.optional(),
        alternate_email: emailSchema.optional(),
        phone: phoneSchema.optional(),
        alternate_phone: optionalPhoneSchema,
        whatsapp_number: optionalPhoneSchema,
        emergency_contact_name: z.string().min(2).optional(),
        emergency_contact_phone: phoneSchema.optional(),
        emergency_contact_relation: z.string().optional(),

        // Address
        current_address_line1: z.string().min(5).optional(),
        current_address_line2: z.string().optional(),
        current_city: z.string().min(2).optional(),
        current_state: z.string().min(2).optional(),
        current_pincode: pincodeSchema.optional(),

        // Government IDs
        aadhar_number: aadharSchema.optional(),
        pan_number: panSchema.optional(),

        // Employment
        employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]).optional(),
        employment_status: z.enum(["active", "probation", "notice_period", "terminated", "resigned", "absconded"]).optional(),
        designation: z.string().min(2).optional(),
        department: z.string().min(2).optional(),

        // Compensation
        salary: z.number().min(0).optional(),
        pay_frequency: z.enum(["monthly", "weekly", "daily", "hourly"]).optional(),
        bank_name: z.string().optional(),
        bank_account_number: z.string().min(9).max(18).optional(),
        ifsc_code: ifscSchema.optional(),

        // Additional
        qualification: z.string().optional(),
        experience_years: z.number().min(0).max(50).optional(),
        skills: z.array(z.string()).optional(),
        notes: z.string().optional(),
    });

    // ============================================================================
    // FILTER & PAGINATION SCHEMAS
    // ============================================================================

    /** Store User Filters Schema */
    export const storeUserFiltersSchema = z.object({
        role_id: z.string().uuid().optional(),
        role_name: z.enum(["super_admin", "store_admin", "manager", "cashier", "accountant", "inventory_manager"]).optional(),
        department: z.string().optional(),
        is_active: z.boolean().optional(),
        is_banned: z.boolean().optional(),
        employment_status: z.enum(["active", "probation", "notice_period", "terminated", "resigned", "absconded"]).optional(),
        employee_type: z.enum(["full_time", "part_time", "contractor", "intern", "trainee"]).optional(),
        search: z.string().optional(),
    });

    /** Pagination Schema */
    export const paginationSchema = z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        sort_by: z.enum(["full_name", "employee_code", "created_at", "last_login_at"]).default("created_at"),
        sort_order: z.enum(["asc", "desc"]).default("desc"),
    });

    // ============================================================================
    // BULK OPERATION SCHEMAS
    // ============================================================================

    /** Bulk Activate Schema */
    export const bulkActivateSchema = z.object({
        user_ids: z.array(z.string().uuid()).min(1, "At least one user must be selected"),
        is_active: z.boolean(),
    });

    /** Bulk Ban Schema */
    export const bulkBanSchema = z.object({
        user_ids: z.array(z.string().uuid()).min(1, "At least one user must be selected"),
        reason: z.string().min(10, "Ban reason must be at least 10 characters"),
    });

    /** Bulk Role Change Schema */
    export const bulkRoleChangeSchema = z.object({
        user_ids: z.array(z.string().uuid()).min(1, "At least one user must be selected"),
        role_id: z.string().uuid("Invalid role ID"),
    });

    // ============================================================================
    // TYPE EXPORTS
    // ============================================================================

    export type AddStoreUserFormData = z.infer<typeof addStoreUserSchema>;
    export type UpdateStoreUserFormData = z.infer<typeof updateStoreUserSchema>;
    export type BanUserFormData = z.infer<typeof banUserSchema>;
    export type ActivateUserFormData = z.infer<typeof activateUserSchema>;
    export type ResetUserAccessFormData = z.infer<typeof resetUserAccessSchema>;

    export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;
    export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;

    export type StoreUserFiltersFormData = z.infer<typeof storeUserFiltersSchema>;
    export type PaginationFormData = z.infer<typeof paginationSchema>;

    export type BulkActivateFormData = z.infer<typeof bulkActivateSchema>;
    export type BulkBanFormData = z.infer<typeof bulkBanSchema>;
    export type BulkRoleChangeFormData = z.infer<typeof bulkRoleChangeSchema>;
