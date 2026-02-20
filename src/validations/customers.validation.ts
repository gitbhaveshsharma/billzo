import { z } from "zod";
import {
    CUSTOMER_TYPES,
    CUSTOMER_SORT_FIELDS,
    PAYMENT_METHODS,
    LEDGER_TRANSACTION_TYPES,
} from "@/types/customers.types";

// ============================================================================
// CUSTOMER VALIDATION SCHEMAS
// Zod schemas for customer CRUD operations
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

// ============================================================================
// CONSTANTS — No hardcoded magic values
// ============================================================================

/** GSTIN regex — 15-char Indian GST Identification Number format */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;

/** PAN regex — 10-char Indian Permanent Account Number */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Pincode regex — 6-digit Indian postal code */
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/** Phone regex — Indian 10-digit mobile or landline */
const PHONE_REGEX = /^[6-9][0-9]{9}$/;

/** Email max length */
const EMAIL_MAX_LENGTH = 255;

/** Name constraints */
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 200;

/** Max credit limit (₹ 99,99,999) */
const MAX_CREDIT_LIMIT = 9999999;

/** Max credit days */
const MAX_CREDIT_DAYS = 365;

/** Max loyalty points per adjustment */
const MAX_LOYALTY_POINTS_ADJUSTMENT = 999999;

/** Max tags per customer */
const MAX_TAGS = 20;

/** Max tag length */
const MAX_TAG_LENGTH = 50;

// ============================================================================
// SHARED SUB-SCHEMAS
// ============================================================================

const phoneSchema = z
    .string({ message: "Phone number is required" })
    .regex(PHONE_REGEX, "Invalid phone number (10 digits, starting with 6-9)");

const optionalPhoneSchema = z
    .string()
    .transform(emptyToUndefined)
    .pipe(
        z
            .string()
            .regex(PHONE_REGEX, "Invalid phone number (10 digits, starting with 6-9)")
            .optional()
    );

const optionalEmailSchema = z
    .string()
    .transform(emptyToUndefined)
    .pipe(
        z
            .string()
            .email("Invalid email address")
            .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters`)
            .optional()
    );

const optionalGstinSchema = z
    .string()
    .transform(emptyToUndefined)
    .pipe(
        z
            .string()
            .regex(GSTIN_REGEX, "Invalid GSTIN format (e.g. 27AAAPL1234C1Z5)")
            .optional()
    );

const optionalPanSchema = z
    .string()
    .transform(emptyToUndefined)
    .pipe(
        z
            .string()
            .regex(PAN_REGEX, "Invalid PAN format (e.g. ABCDE1234F)")
            .optional()
    );

const optionalPincodeSchema = z
    .string()
    .transform(emptyToUndefined)
    .pipe(
        z
            .string()
            .regex(PINCODE_REGEX, "Invalid pincode (6 digits)")
            .optional()
    );

const tagsSchema = z
    .array(
        z.string().min(1, "Tag cannot be empty").max(MAX_TAG_LENGTH, `Tag max ${MAX_TAG_LENGTH} chars`)
    )
    .max(MAX_TAGS, `Maximum ${MAX_TAGS} tags allowed`)
    .optional();

// ============================================================================
// CREATE CUSTOMER SCHEMA
// ============================================================================

export const createCustomerSchema = z
    .object({
        // Required
        name: z
            .string({ message: "Name is required" })
            .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
            .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`)
            .trim(),
        phone: phoneSchema,

        // Optional Contact
        alternate_phone: optionalPhoneSchema,
        email: optionalEmailSchema,

        // Personal
        date_of_birth: z
            .string()
            .transform(emptyToUndefined)
            .pipe(z.string().date("Invalid date format (YYYY-MM-DD)").optional()),
        anniversary_date: z
            .string()
            .transform(emptyToUndefined)
            .pipe(z.string().date("Invalid date format (YYYY-MM-DD)").optional()),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),

        // Type
        customer_type: z.enum(CUSTOMER_TYPES).default("RETAIL"),

        // GST / Business
        gstin: optionalGstinSchema,
        company_name: z
            .string()
            .max(NAME_MAX_LENGTH, `Company name max ${NAME_MAX_LENGTH} chars`)
            .transform(emptyToUndefined)
            .optional(),
        pan_number: optionalPanSchema,

        // Address
        address_line1: z
            .string()
            .max(500, "Address line 1 too long")
            .transform(emptyToUndefined)
            .optional(),
        address_line2: z
            .string()
            .max(500, "Address line 2 too long")
            .transform(emptyToUndefined)
            .optional(),
        city: z
            .string()
            .max(100, "City name too long")
            .transform(emptyToUndefined)
            .optional(),
        state: z
            .string()
            .max(100, "State name too long")
            .transform(emptyToUndefined)
            .optional(),
        pincode: optionalPincodeSchema,
        country: z
            .string()
            .max(100, "Country name too long")
            .transform(emptyToUndefined)
            .optional(),

        // Credit Settings
        credit_limit: z
            .number()
            .min(0, "Credit limit cannot be negative")
            .max(MAX_CREDIT_LIMIT, `Credit limit cannot exceed ₹${MAX_CREDIT_LIMIT.toLocaleString("en-IN")}`)
            .default(0),
        credit_days: z
            .number()
            .int("Credit days must be a whole number")
            .min(0, "Credit days cannot be negative")
            .max(MAX_CREDIT_DAYS, `Credit days cannot exceed ${MAX_CREDIT_DAYS}`)
            .default(0),
        is_credit_allowed: z.boolean().default(false),

        // Metadata
        notes: z
            .string()
            .max(2000, "Notes cannot exceed 2000 characters")
            .transform(emptyToUndefined)
            .optional(),
        tags: tagsSchema,
    })
    .refine(
        (data) => {
            // If credit is allowed, credit_limit must be set above zero
            if (data.is_credit_allowed && data.credit_limit <= 0) {
                return false;
            }
            return true;
        },
        {
            message: "Credit limit must be greater than 0 when credit is allowed",
            path: ["credit_limit"],
        }
    )
    .refine(
        (data) => {
            // GSTIN requires a company name for B2B compliance
            if (data.gstin && !data.company_name) {
                return false;
            }
            return true;
        },
        {
            message: "Company name is required when GSTIN is provided",
            path: ["company_name"],
        }
    );

export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

// ============================================================================
// UPDATE CUSTOMER SCHEMA
// ============================================================================

export const updateCustomerSchema = z
    .object({
        name: z
            .string()
            .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
            .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`)
            .trim()
            .optional(),
        phone: z
            .string()
            .regex(PHONE_REGEX, "Invalid phone number (10 digits, starting with 6-9)")
            .optional(),

        alternate_phone: optionalPhoneSchema,
        email: optionalEmailSchema,

        // Personal
        date_of_birth: z
            .string()
            .transform(emptyToUndefined)
            .pipe(z.string().date("Invalid date format (YYYY-MM-DD)").optional()),
        anniversary_date: z
            .string()
            .transform(emptyToUndefined)
            .pipe(z.string().date("Invalid date format (YYYY-MM-DD)").optional()),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),

        // Type
        customer_type: z.enum(CUSTOMER_TYPES).optional(),

        // GST / Business
        gstin: optionalGstinSchema,
        company_name: z
            .string()
            .max(NAME_MAX_LENGTH, `Company name max ${NAME_MAX_LENGTH} chars`)
            .transform(emptyToUndefined)
            .optional(),
        pan_number: optionalPanSchema,

        // Address
        address_line1: z
            .string()
            .max(500, "Address line 1 too long")
            .transform(emptyToUndefined)
            .optional(),
        address_line2: z
            .string()
            .max(500, "Address line 2 too long")
            .transform(emptyToUndefined)
            .optional(),
        city: z
            .string()
            .max(100, "City name too long")
            .transform(emptyToUndefined)
            .optional(),
        state: z
            .string()
            .max(100, "State name too long")
            .transform(emptyToUndefined)
            .optional(),
        pincode: optionalPincodeSchema,
        country: z
            .string()
            .max(100, "Country name too long")
            .transform(emptyToUndefined)
            .optional(),

        // Credit Settings
        credit_limit: z
            .number()
            .min(0, "Credit limit cannot be negative")
            .max(MAX_CREDIT_LIMIT, `Credit limit cannot exceed ₹${MAX_CREDIT_LIMIT.toLocaleString("en-IN")}`)
            .optional(),
        credit_days: z
            .number()
            .int("Credit days must be a whole number")
            .min(0, "Credit days cannot be negative")
            .max(MAX_CREDIT_DAYS, `Credit days cannot exceed ${MAX_CREDIT_DAYS}`)
            .optional(),
        is_credit_allowed: z.boolean().optional(),

        // Status
        is_active: z.boolean().optional(),
        is_blacklisted: z.boolean().optional(),
        blacklist_reason: z
            .string()
            .max(500, "Blacklist reason too long")
            .transform(emptyToUndefined)
            .optional(),

        // Metadata
        notes: z
            .string()
            .max(2000, "Notes cannot exceed 2000 characters")
            .transform(emptyToUndefined)
            .optional(),
        tags: tagsSchema,
    })
    .refine(
        (data) => {
            // If explicitly setting credit allowed, require limit > 0
            if (data.is_credit_allowed === true && data.credit_limit !== undefined && data.credit_limit <= 0) {
                return false;
            }
            return true;
        },
        {
            message: "Credit limit must be greater than 0 when credit is allowed",
            path: ["credit_limit"],
        }
    )
    .refine(
        (data) => {
            // If blacklisting, require a reason
            if (data.is_blacklisted === true && !data.blacklist_reason) {
                return false;
            }
            return true;
        },
        {
            message: "Reason is required when blacklisting a customer",
            path: ["blacklist_reason"],
        }
    );

export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;

// ============================================================================
// RECORD PAYMENT SCHEMA
// ============================================================================

export const recordPaymentSchema = z.object({
    customer_id: z
        .string({ message: "Customer is required" })
        .uuid("Invalid customer ID"),
    amount: z
        .number({ message: "Amount is required" })
        .positive("Amount must be greater than 0")
        .max(MAX_CREDIT_LIMIT, `Amount cannot exceed ₹${MAX_CREDIT_LIMIT.toLocaleString("en-IN")}`),
    payment_method: z.enum(PAYMENT_METHODS, { message: "Payment method is required" }),
    payment_reference: z
        .string()
        .max(100, "Payment reference too long")
        .transform(emptyToUndefined)
        .optional(),
    notes: z
        .string()
        .max(500, "Notes cannot exceed 500 characters")
        .transform(emptyToUndefined)
        .optional(),
});

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;

// ============================================================================
// CREATE LEDGER ENTRY SCHEMA (Manual adjustment)
// ============================================================================

export const createLedgerEntrySchema = z
    .object({
        customer_id: z
            .string({ message: "Customer is required" })
            .uuid("Invalid customer ID"),
        transaction_type: z.enum(LEDGER_TRANSACTION_TYPES, {
            message: "Transaction type is required",
        }),
        reference_type: z
            .string()
            .max(50, "Reference type too long")
            .transform(emptyToUndefined)
            .optional(),
        reference_id: z
            .string()
            .uuid("Invalid reference ID")
            .optional(),
        reference_number: z
            .string()
            .max(50, "Reference number too long")
            .transform(emptyToUndefined)
            .optional(),
        debit_amount: z
            .number()
            .min(0, "Debit amount cannot be negative")
            .max(MAX_CREDIT_LIMIT, "Debit amount too large")
            .default(0),
        credit_amount: z
            .number()
            .min(0, "Credit amount cannot be negative")
            .max(MAX_CREDIT_LIMIT, "Credit amount too large")
            .default(0),
        payment_method: z.enum(PAYMENT_METHODS).optional(),
        payment_reference: z
            .string()
            .max(100, "Payment reference too long")
            .transform(emptyToUndefined)
            .optional(),
        notes: z
            .string()
            .max(500, "Notes cannot exceed 500 characters")
            .transform(emptyToUndefined)
            .optional(),
    })
    .refine(
        (data) => {
            // At least one of debit or credit must be non-zero
            return data.debit_amount > 0 || data.credit_amount > 0;
        },
        {
            message: "Either debit or credit amount must be greater than 0",
            path: ["debit_amount"],
        }
    )
    .refine(
        (data) => {
            // Cannot have both debit and credit amount in same entry
            return !(data.debit_amount > 0 && data.credit_amount > 0);
        },
        {
            message: "Cannot have both debit and credit amount in the same entry",
            path: ["credit_amount"],
        }
    );

export type CreateLedgerEntryFormData = z.infer<typeof createLedgerEntrySchema>;

// ============================================================================
// ADJUST LOYALTY POINTS SCHEMA
// ============================================================================

export const adjustLoyaltyPointsSchema = z.object({
    points: z
        .number({ message: "Points value is required" })
        .int("Points must be a whole number")
        .min(-MAX_LOYALTY_POINTS_ADJUSTMENT, `Cannot deduct more than ${MAX_LOYALTY_POINTS_ADJUSTMENT.toLocaleString()} points`)
        .max(MAX_LOYALTY_POINTS_ADJUSTMENT, `Cannot add more than ${MAX_LOYALTY_POINTS_ADJUSTMENT.toLocaleString()} points`)
        .refine((val) => val !== 0, "Points adjustment cannot be zero"),
    reason: z
        .string({ message: "Reason is required" })
        .min(3, "Reason must be at least 3 characters")
        .max(500, "Reason too long"),
});

export type AdjustLoyaltyPointsFormData = z.infer<typeof adjustLoyaltyPointsSchema>;

// ============================================================================
// BLACKLIST CUSTOMER SCHEMA
// ============================================================================

export const blacklistCustomerSchema = z
    .object({
        is_blacklisted: z.boolean(),
        blacklist_reason: z
            .string()
            .max(500, "Reason too long")
            .transform(emptyToUndefined)
            .optional(),
    })
    .refine(
        (data) => {
            if (data.is_blacklisted && !data.blacklist_reason) {
                return false;
            }
            return true;
        },
        {
            message: "Reason is required when blacklisting",
            path: ["blacklist_reason"],
        }
    );

export type BlacklistCustomerFormData = z.infer<typeof blacklistCustomerSchema>;

// ============================================================================
// CUSTOMER FILTERS SCHEMA
// ============================================================================

export const customerFiltersSchema = z.object({
    search: z.string().max(200, "Search query too long").transform(emptyToUndefined).optional(),
    customer_type: z.enum(CUSTOMER_TYPES).optional(),
    is_active: z.boolean().optional(),
    is_blacklisted: z.boolean().optional(),
    is_credit_allowed: z.boolean().optional(),
    has_outstanding: z.boolean().optional(),
    city: z.string().max(100).transform(emptyToUndefined).optional(),
    state: z.string().max(100).transform(emptyToUndefined).optional(),
    tags: z.array(z.string()).optional(),
    min_purchases: z.number().min(0).optional(),
    max_purchases: z.number().min(0).optional(),
    min_loyalty_points: z.number().min(0).optional(),
});

export type CustomerFiltersFormData = z.infer<typeof customerFiltersSchema>;

// ============================================================================
// CUSTOMER PAGINATION SCHEMA
// ============================================================================

export const customerPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort_by: z.enum(CUSTOMER_SORT_FIELDS).default("created_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export type CustomerPaginationFormData = z.infer<typeof customerPaginationSchema>;
