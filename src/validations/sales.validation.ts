import { z } from "zod";
import {
    SALE_STATUSES,
    PAYMENT_METHODS,
    RETURN_STATUSES,
    DISCOUNT_TYPES,
    PAYMENT_RECORD_STATUSES,
    GST_TYPES,
    SUPPLY_TYPES,
    SEQUENCE_TYPES,
    RESTOCK_CONDITIONS,
    REFERENCE_TYPES,
    SALE_SORT_FIELDS,
    RETURN_SORT_FIELDS,
} from "@/types/sales.types";

// ============================================================================
// SALES VALIDATION SCHEMAS
// Zod schemas for POS billing, payments, returns, and filters
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "")
        ? undefined
        : val;

// ============================================================================
// SALE ITEM SCHEMA
// ============================================================================

export const createSaleItemSchema = z.object({
    product_id: z.string().uuid("Invalid product ID"),
    variant_id: z.string().uuid("Invalid variant ID").optional(),
    batch_id: z.string().uuid("Invalid batch ID").optional(),
    product_name: z.string().min(1, "Product name is required").max(200),
    product_code: z.string().min(1, "Product code is required").max(50),
    barcode: z.string().max(50).transform(emptyToUndefined).optional(),
    hsn_code: z.string().max(20).transform(emptyToUndefined).optional(),
    unit_name: z.string().max(20).transform(emptyToUndefined).optional(),
    quantity: z
        .number({ message: "Quantity is required" })
        .positive("Quantity must be greater than 0"),
    mrp: z.number().min(0, "MRP cannot be negative"),
    unit_price: z
        .number({ message: "Unit price is required" })
        .min(0, "Unit price cannot be negative"),
    unit_cost: z.number().min(0).optional(),
    discount_type: z.enum(DISCOUNT_TYPES).default("PERCENTAGE"),
    discount_percentage: z
        .number()
        .min(0, "Discount cannot be negative")
        .max(100, "Discount cannot exceed 100%")
        .default(0),
    discount_amount: z.number().min(0).default(0),
    gst_percentage: z.number().min(0).max(100).default(0),
    cess_percentage: z.number().min(0).max(100).default(0),
    serial_numbers: z.array(z.string()).optional(),
    sort_order: z.number().int().min(0).default(0),
});

// ============================================================================
// CREATE SALE SCHEMA
// ============================================================================

export const createSaleSchema = z
    .object({
        shift_id: z.string().uuid("Invalid shift ID").optional(),
        customer_id: z.string().uuid("Invalid customer ID").optional(),
        customer_name: z.string().max(200).transform(emptyToUndefined).optional(),
        customer_phone: z.string().max(15).transform(emptyToUndefined).optional(),
        customer_gstin: z
            .string()
            .regex(
                /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/,
                "Invalid GSTIN format"
            )
            .or(z.literal(""))
            .transform(emptyToUndefined)
            .optional(),
        is_interstate: z.boolean().default(false),
        gst_type: z.enum(GST_TYPES).default("B2C"),
        supply_type: z.enum(SUPPLY_TYPES).default("intra"),
        bill_discount_percentage: z
            .number()
            .min(0)
            .max(100, "Bill discount cannot exceed 100%")
            .default(0),
        bill_discount_amount: z.number().min(0).default(0),
        is_credit_sale: z.boolean().default(false),
        credit_due_date: z.string().transform(emptyToUndefined).optional(),
        notes: z.string().max(1000).transform(emptyToUndefined).optional(),
        internal_notes: z
            .string()
            .max(1000)
            .transform(emptyToUndefined)
            .optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
        reference_type: z.enum(REFERENCE_TYPES).optional(),
        reference_id: z.string().uuid().optional(),
        reference_number: z.string().max(50).transform(emptyToUndefined).optional(),
        items: z
            .array(createSaleItemSchema)
            .min(1, "At least one item is required"),
    })
    .refine(
        (data) => {
            // If B2B, customer GSTIN should be provided
            if (data.gst_type === "B2B" && !data.customer_gstin) {
                return false;
            }
            return true;
        },
        {
            message: "GSTIN is required for B2B sales",
            path: ["customer_gstin"],
        }
    )
    .refine(
        (data) => {
            // Credit sale must have a due date
            if (data.is_credit_sale && !data.credit_due_date) {
                return false;
            }
            return true;
        },
        {
            message: "Credit due date is required for credit sales",
            path: ["credit_due_date"],
        }
    );

// ============================================================================
// UPDATE SALE SCHEMA (draft/hold only)
// ============================================================================

export const updateSaleSchema = z.object({
    customer_id: z.string().uuid().nullable().optional(),
    customer_name: z.string().max(200).transform(emptyToUndefined).nullable().optional(),
    customer_phone: z.string().max(15).transform(emptyToUndefined).nullable().optional(),
    customer_gstin: z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/, "Invalid GSTIN format")
        .or(z.literal(""))
        .transform(emptyToUndefined)
        .nullable()
        .optional(),
    is_interstate: z.boolean().optional(),
    gst_type: z.enum(GST_TYPES).optional(),
    supply_type: z.enum(SUPPLY_TYPES).optional(),
    bill_discount_percentage: z.number().min(0).max(100).optional(),
    bill_discount_amount: z.number().min(0).optional(),
    is_credit_sale: z.boolean().optional(),
    credit_due_date: z.string().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    internal_notes: z.string().max(1000).nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).nullable().optional(),
});

// ============================================================================
// PAYMENT SCHEMA
// ============================================================================

export const createSalePaymentSchema = z
    .object({
        payment_method: z.enum(PAYMENT_METHODS, {
            message: "Payment method is required",
        }),
        amount: z
            .number({ message: "Amount is required" })
            .positive("Payment amount must be greater than 0"),
        // Cash
        cash_tendered: z.number().min(0).optional(),
        change_returned: z.number().min(0).optional(),
        // Card
        card_last_four: z.string().length(4).optional(),
        card_type: z.string().max(20).transform(emptyToUndefined).optional(),
        card_bank: z.string().max(100).transform(emptyToUndefined).optional(),
        authorization_code: z
            .string()
            .max(50)
            .transform(emptyToUndefined)
            .optional(),
        terminal_id: z
            .string()
            .max(50)
            .transform(emptyToUndefined)
            .optional(),
        // UPI
        upi_id: z.string().max(100).transform(emptyToUndefined).optional(),
        upi_ref_number: z
            .string()
            .max(50)
            .transform(emptyToUndefined)
            .optional(),
        // Wallet
        wallet_name: z.string().max(50).transform(emptyToUndefined).optional(),
        // Bank
        bank_reference: z
            .string()
            .max(100)
            .transform(emptyToUndefined)
            .optional(),
        bank_name: z.string().max(100).transform(emptyToUndefined).optional(),
        transaction_id: z
            .string()
            .max(100)
            .transform(emptyToUndefined)
            .optional(),
        // Cheque
        cheque_number: z
            .string()
            .max(20)
            .transform(emptyToUndefined)
            .optional(),
        cheque_bank: z
            .string()
            .max(100)
            .transform(emptyToUndefined)
            .optional(),
        cheque_date: z.string().transform(emptyToUndefined).optional(),
        // Gift card
        gift_card_code: z
            .string()
            .max(50)
            .transform(emptyToUndefined)
            .optional(),
        gift_card_id: z.string().uuid().optional(),
        // Credit note
        credit_note_id: z.string().uuid().optional(),
        // Gateway
        gateway_transaction_id: z
            .string()
            .max(200)
            .transform(emptyToUndefined)
            .optional(),
        gateway_response: z.record(z.string(), z.unknown()).optional(),
        notes: z.string().max(500).transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => {
            // Cash payment: tendered ≥ amount
            if (data.payment_method === "CASH" && data.cash_tendered != null) {
                return data.cash_tendered >= data.amount;
            }
            return true;
        },
        {
            message: "Cash tendered must be at least the payment amount",
            path: ["cash_tendered"],
        }
    )
    .refine(
        (data) => {
            // Cheque: cheque_number required
            if (data.payment_method === "CHEQUE" && !data.cheque_number) {
                return false;
            }
            return true;
        },
        { message: "Cheque number is required", path: ["cheque_number"] }
    )
    .refine(
        (data) => {
            // UPI: ref number required
            if (data.payment_method === "UPI" && !data.upi_ref_number) {
                return false;
            }
            return true;
        },
        { message: "UPI reference number is required", path: ["upi_ref_number"] }
    );

// ============================================================================
// CANCEL SALE SCHEMA
// ============================================================================

export const cancelSaleSchema = z.object({
    cancellation_reason: z
        .string({ message: "Cancellation reason is required" })
        .min(3, "Reason must be at least 3 characters")
        .max(500, "Reason must be at most 500 characters"),
});

// ============================================================================
// RETURN SCHEMAS
// ============================================================================

export const createSaleReturnItemSchema = z.object({
    sale_item_id: z.string().uuid("Invalid sale item ID"),
    product_id: z.string().uuid("Invalid product ID"),
    variant_id: z.string().uuid().optional(),
    batch_id: z.string().uuid().optional(),
    product_name: z.string().min(1),
    product_code: z.string().min(1),
    unit_price: z.number().min(0),
    unit_cost: z.number().min(0).optional(),
    return_quantity: z
        .number({ message: "Return quantity is required" })
        .positive("Return quantity must be greater than 0"),
    item_return_reason: z.string().max(500).transform(emptyToUndefined).optional(),
    restock: z.boolean().default(true),
    restock_condition: z.enum(RESTOCK_CONDITIONS).default("good"),
});

export const createSaleReturnSchema = z.object({
    sale_id: z.string().uuid("Invalid sale ID"),
    return_reason: z
        .string({ message: "Return reason is required" })
        .min(3, "Reason must be at least 3 characters")
        .max(500),
    return_notes: z.string().max(1000).transform(emptyToUndefined).optional(),
    shift_id: z.string().uuid().optional(),
    refund_method: z.enum(PAYMENT_METHODS).optional(),
    items: z
        .array(createSaleReturnItemSchema)
        .min(1, "At least one return item is required"),
});

export const approveReturnSchema = z
    .object({
        approved: z.boolean(),
        rejection_reason: z
            .string()
            .max(500)
            .transform(emptyToUndefined)
            .optional(),
    })
    .refine(
        (data) => {
            if (!data.approved && !data.rejection_reason) return false;
            return true;
        },
        {
            message: "Rejection reason is required when rejecting a return",
            path: ["rejection_reason"],
        }
    );

// ============================================================================
// FILTER & PAGINATION SCHEMAS
// ============================================================================

export const saleFiltersSchema = z.object({
    search: z.string().max(200).transform(emptyToUndefined).optional(),
    status: z.enum(SALE_STATUSES).optional(),
    payment_method: z.enum(PAYMENT_METHODS).optional(),
    cashier_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    shift_id: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    sale_date: z.string().optional(),
    is_credit_sale: z.boolean().optional(),
    has_due_amount: z.boolean().optional(),
    min_amount: z.number().min(0).optional(),
    max_amount: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
});

export const salePaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort_by: z.enum(SALE_SORT_FIELDS).default("sale_time"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const returnFiltersSchema = z.object({
    search: z.string().max(200).transform(emptyToUndefined).optional(),
    status: z.enum(RETURN_STATUSES).optional(),
    sale_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
});

export const returnPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort_by: z.enum(RETURN_SORT_FIELDS).default("created_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// RECEIPT SCHEMA
// ============================================================================

export const markReceiptPrintedSchema = z.object({
    receipt_printed: z.boolean(),
});

// ============================================================================
// INFERRED FORM DATA TYPES
// ============================================================================

export type CreateSaleFormData = z.infer<typeof createSaleSchema>;
export type CreateSaleItemFormData = z.infer<typeof createSaleItemSchema>;
export type UpdateSaleFormData = z.infer<typeof updateSaleSchema>;
export type CreateSalePaymentFormData = z.infer<typeof createSalePaymentSchema>;
export type CancelSaleFormData = z.infer<typeof cancelSaleSchema>;
export type CreateSaleReturnFormData = z.infer<typeof createSaleReturnSchema>;
export type CreateSaleReturnItemFormData = z.infer<typeof createSaleReturnItemSchema>;
export type ApproveReturnFormData = z.infer<typeof approveReturnSchema>;
export type SaleFiltersFormData = z.infer<typeof saleFiltersSchema>;
export type SalePaginationFormData = z.infer<typeof salePaginationSchema>;
export type ReturnFiltersFormData = z.infer<typeof returnFiltersSchema>;
export type ReturnPaginationFormData = z.infer<typeof returnPaginationSchema>;
