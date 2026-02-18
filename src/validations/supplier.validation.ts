import { z } from "zod";
import {
    GSTIN_PATTERN,
    PAN_PATTERN,
    PHONE_PATTERN,
    PINCODE_PATTERN,
    IFSC_PATTERN,
    phoneSchema,
    pincodeSchema,
    panSchema,
    gstinSchema,
    ifscSchema,
    emailOptionalSchema,
} from "./common.validation";
import {
    SUPPLIER_TYPES,
    PAYMENT_TERMS,
} from "@/types/supplier.types";

// ============================================================================
// SUPPLIER VALIDATION SCHEMAS
// Zod schemas for supplier CRUD operations
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

// ============================================================================
// SUPPLIER CODE
// ============================================================================

export const supplierCodeSchema = z
    .string({ message: "Supplier code is required" })
    .min(2, "Supplier code must be at least 2 characters")
    .max(30, "Supplier code must be at most 30 characters")
    .regex(
        /^[A-Za-z0-9\-_]+$/,
        "Supplier code can only contain letters, numbers, hyphens and underscores"
    )
    .transform((val) => val.toUpperCase().trim());

// ============================================================================
// TAN NUMBER (Tax Deduction Account Number)
// Format: 4 letters + 5 digits + 1 letter = ABCD12345E
// ============================================================================

const TAN_PATTERN = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export const tanSchema = z
    .string()
    .transform((val) => {
        const cleaned = emptyToUndefined(val);
        return cleaned ? cleaned.toUpperCase().trim() : cleaned;
    })
    .optional()
    .refine(
        (val) => !val || TAN_PATTERN.test(val),
        "Invalid TAN format. Expected: ABCD12345E"
    );

// ============================================================================
// MSME NUMBER (Udyam Registration Number)
// Format: UDYAM-XX-00-0000000
// ============================================================================

const MSME_PATTERN = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export const msmeSchema = z
    .string()
    .transform((val) => {
        const cleaned = emptyToUndefined(val);
        return cleaned ? cleaned.toUpperCase().trim() : cleaned;
    })
    .optional()
    .refine(
        (val) => !val || MSME_PATTERN.test(val),
        "Invalid MSME/Udyam format. Expected: UDYAM-XX-00-0000000"
    );

// ============================================================================
// UPI ID
// ============================================================================

const UPI_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

export const upiSchema = z
    .string()
    .transform(emptyToUndefined)
    .optional()
    .refine(
        (val) => !val || UPI_PATTERN.test(val),
        "Invalid UPI ID format. Expected: name@bank"
    );

// ============================================================================
// CREATE SUPPLIER SCHEMA
// ============================================================================

export const createSupplierSchema = z.object({
    // Required fields
    supplier_code: supplierCodeSchema,
    name: z
        .string({ message: "Supplier name is required" })
        .min(2, "Supplier name must be at least 2 characters")
        .max(200, "Supplier name must be at most 200 characters")
        .transform((val) => val.trim()),

    // Optional basic info
    legal_name: z
        .string()
        .max(200, "Legal name must be at most 200 characters")
        .transform(emptyToUndefined)
        .optional(),
    type: z.enum(SUPPLIER_TYPES).default("distributor"),

    // GST & Tax
    gstin: gstinSchema,
    pan_number: panSchema,
    tan_number: tanSchema,
    msme_number: msmeSchema,

    // Contact
    contact_person: z
        .string()
        .max(100, "Contact person name must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    email: emailOptionalSchema,
    phone: phoneSchema,
    alternate_phone: phoneSchema,
    whatsapp: phoneSchema,

    // Address
    address_line1: z
        .string()
        .max(255, "Address must be at most 255 characters")
        .transform(emptyToUndefined)
        .optional(),
    address_line2: z
        .string()
        .max(255, "Address must be at most 255 characters")
        .transform(emptyToUndefined)
        .optional(),
    landmark: z
        .string()
        .max(100, "Landmark must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    city: z
        .string()
        .max(100, "City must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    state: z
        .string()
        .max(100, "State must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    pincode: pincodeSchema,
    country: z.string().default("India"),

    // Bank Details
    bank_name: z
        .string()
        .max(100, "Bank name must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    bank_account_number: z
        .string()
        .max(30, "Account number must be at most 30 characters")
        .transform(emptyToUndefined)
        .optional(),
    ifsc_code: ifscSchema,
    bank_branch: z
        .string()
        .max(100, "Branch must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    upi_id: upiSchema,

    // Payment Terms
    payment_terms: z.enum(PAYMENT_TERMS).default("immediate"),
    credit_limit: z
        .number()
        .min(0, "Credit limit cannot be negative")
        .max(999999999999, "Credit limit too large")
        .optional()
        .nullable(),
    credit_days: z.number().int().min(0).max(365).default(0),

    // Purchase Settings
    default_discount_percentage: z
        .number()
        .min(0, "Discount cannot be negative")
        .max(100, "Discount cannot exceed 100%")
        .default(0),
    tax_inclusive: z.boolean().default(false),

    // Status
    is_preferred: z.boolean().default(false),

    // Metadata
    website: z
        .string()
        .url("Invalid website URL")
        .or(z.literal(""))
        .transform(emptyToUndefined)
        .optional(),
    notes: z
        .string()
        .max(2000, "Notes must be at most 2000 characters")
        .transform(emptyToUndefined)
        .optional(),
    tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags allowed").optional(),
});

// ============================================================================
// UPDATE SUPPLIER SCHEMA (all fields optional)
// ============================================================================

export const updateSupplierSchema = createSupplierSchema
    .partial()
    .extend({
        is_active: z.boolean().optional(),
        blacklisted: z.boolean().optional(),
        blacklist_reason: z
            .string()
            .max(500, "Blacklist reason must be at most 500 characters")
            .transform(emptyToUndefined)
            .optional(),
    })
    .refine(
        (data) => {
            // If blacklisting, reason is required
            if (data.blacklisted === true && !data.blacklist_reason) {
                return false;
            }
            return true;
        },
        { message: "Blacklist reason is required when blacklisting a supplier", path: ["blacklist_reason"] }
    );

// ============================================================================
// BLACKLIST SCHEMA
// ============================================================================

export const blacklistSupplierSchema = z.object({
    reason: z
        .string({ message: "Blacklist reason is required" })
        .min(5, "Reason must be at least 5 characters")
        .max(500, "Reason must be at most 500 characters"),
});

// ============================================================================
// SUPPLIER CONTACT SCHEMAS
// ============================================================================

export const createSupplierContactSchema = z.object({
    name: z
        .string({ message: "Contact name is required" })
        .min(2, "Contact name must be at least 2 characters")
        .max(100, "Contact name must be at most 100 characters")
        .transform((val) => val.trim()),
    designation: z
        .string()
        .max(100, "Designation must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    department: z
        .string()
        .max(100, "Department must be at most 100 characters")
        .transform(emptyToUndefined)
        .optional(),
    email: emailOptionalSchema,
    phone: phoneSchema,
    alternate_phone: phoneSchema,
    is_primary: z.boolean().default(false),
    is_authorized: z.boolean().default(true),
});

export const updateSupplierContactSchema = createSupplierContactSchema.partial();

// ============================================================================
// SUPPLIER FILTERS SCHEMA
// ============================================================================

export const supplierFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    type: z.enum(SUPPLIER_TYPES).optional(),
    is_active: z.boolean().optional(),
    is_preferred: z.boolean().optional(),
    blacklisted: z.boolean().optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    payment_terms: z.enum(PAYMENT_TERMS).optional(),
    has_gstin: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
});

export const supplierPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    sort_by: z
        .enum(["name", "supplier_code", "created_at", "updated_at", "credit_limit", "city"])
        .default("created_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// INFERRED FORM DATA TYPES
// ============================================================================

export type CreateSupplierFormData = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierFormData = z.infer<typeof updateSupplierSchema>;
export type BlacklistSupplierFormData = z.infer<typeof blacklistSupplierSchema>;
export type CreateSupplierContactFormData = z.infer<typeof createSupplierContactSchema>;
export type UpdateSupplierContactFormData = z.infer<typeof updateSupplierContactSchema>;
export type SupplierFiltersFormData = z.infer<typeof supplierFiltersSchema>;
export type SupplierPaginationFormData = z.infer<typeof supplierPaginationSchema>;
