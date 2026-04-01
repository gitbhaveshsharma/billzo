import { z } from "zod";
import {
    PURCHASE_ORDER_STATUSES,
    PAYMENT_STATUSES,
    PAYMENT_METHODS,
    PO_ITEM_STATUSES,
    RETURN_REASONS,
} from "@/types/purchase.types";

// ============================================================================
// PURCHASE ORDER VALIDATION SCHEMAS
// Zod schemas for purchase order CRUD operations
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

// ============================================================================
// PURCHASE ORDER ITEM SCHEMA
// ============================================================================

export const createPurchaseOrderItemSchema = z
    .object({
        product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
        variant_id: z.string().uuid("Invalid variant ID").optional(),
        product_name: z
            .string({ message: "Product name is required" })
            .min(1, "Product name is required"),
        product_code: z
            .string({ message: "Product code is required" })
            .min(1, "Product code is required"),
        barcode: z.string().transform(emptyToUndefined).optional(),
        hsn_code: z.string().max(8, "HSN code max 8 characters").transform(emptyToUndefined).optional(),

        unit_id: z.string().uuid("Invalid unit ID").optional(),
        unit_code: z.string().max(10).transform(emptyToUndefined).optional(),

        ordered_quantity: z
            .number({ message: "Quantity is required" })
            .positive("Quantity must be greater than 0")
            .max(999999, "Quantity too large"),
        unit_price: z
            .number({ message: "Unit price is required" })
            .min(0, "Unit price cannot be negative")
            .max(9999999999, "Unit price too large"),
        mrp: z
            .number()
            .min(0, "MRP cannot be negative")
            .max(9999999999, "MRP too large")
            .optional()
            .nullable(),

        discount_percentage: z
            .number()
            .min(0, "Discount cannot be negative")
            .max(100, "Discount cannot exceed 100%")
            .default(0),
        discount_amount: z.number().min(0, "Discount cannot be negative").default(0),

        gst_percentage: z
            .number({ message: "GST percentage is required" })
            .min(0, "GST cannot be negative")
            .max(100, "GST cannot exceed 100%"),
        cess_percentage: z.number().min(0).max(100).default(0),

        batch_number: z.string().max(50, "Batch number too long").transform(emptyToUndefined).optional(),
        manufacturing_date: z.string().transform(emptyToUndefined).optional(),
        expiry_date: z.string().transform(emptyToUndefined).optional(),
        offer_id: z.string().uuid("Invalid offer ID").optional(),

        notes: z.string().max(500, "Notes must be at most 500 characters").transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => {
            if (data.expiry_date && data.manufacturing_date) {
                return new Date(data.expiry_date) > new Date(data.manufacturing_date);
            }
            return true;
        },
        { message: "Expiry date must be after manufacturing date", path: ["expiry_date"] }
    );

export const updatePurchaseOrderItemSchema = z.object({
    ordered_quantity: z
        .number()
        .positive("Quantity must be greater than 0")
        .max(999999, "Quantity too large")
        .optional(),
    unit_price: z
        .number()
        .min(0, "Unit price cannot be negative")
        .max(9999999999, "Unit price too large")
        .optional(),
    mrp: z
        .number()
        .min(0, "MRP cannot be negative")
        .max(9999999999, "MRP too large")
        .optional()
        .nullable(),
    discount_percentage: z.number().min(0).max(100).optional(),
    discount_amount: z.number().min(0).optional(),
    gst_percentage: z.number().min(0).max(100).optional(),
    cess_percentage: z.number().min(0).max(100).optional(),
    batch_number: z.string().max(50).transform(emptyToUndefined).optional(),
    manufacturing_date: z.string().transform(emptyToUndefined).optional(),
    expiry_date: z.string().transform(emptyToUndefined).optional(),
    offer_id: z.string().uuid("Invalid offer ID").optional(),
    notes: z.string().max(500).transform(emptyToUndefined).optional(),
});

// ============================================================================
// CREATE PURCHASE ORDER SCHEMA
// ============================================================================

export const createPurchaseOrderSchema = z
    .object({
        // Required
        supplier_id: z.string({ message: "Supplier is required" }).uuid("Invalid supplier ID"),
        supplier_name: z.string({ message: "Supplier name is required" }).min(1, "Supplier name is required"),
        order_date: z.string({ message: "Order date is required" }).min(1, "Order date is required"),

        // Optional header
        supplier_gstin: z.string().transform(emptyToUndefined).optional(),
        invoice_number: z
            .string()
            .max(50, "Invoice number must be at most 50 characters")
            .transform(emptyToUndefined)
            .optional(),
        reference_number: z
            .string()
            .max(50, "Reference number must be at most 50 characters")
            .transform(emptyToUndefined)
            .optional(),
        expected_delivery_date: z.string().transform(emptyToUndefined).optional(),
        invoice_date: z.string().transform(emptyToUndefined).optional(),

        // Discount
        discount_amount: z.number().min(0, "Discount cannot be negative").default(0),
        discount_percentage: z.number().min(0).max(100).default(0),

        // Charges
        shipping_charges: z.number().min(0, "Shipping charges cannot be negative").default(0),
        other_charges: z.number().min(0, "Other charges cannot be negative").default(0),
        round_off: z.number().min(-10, "Round off too low").max(10, "Round off too high").default(0),

        // GST
        is_inter_state: z.boolean().default(false),
        place_of_supply: z.string().max(50).transform(emptyToUndefined).optional(),

        // Warehouse
        receiving_warehouse: z.string().max(100).transform(emptyToUndefined).optional(),

        // Metadata
        notes: z.string().max(2000, "Notes must be at most 2000 characters").transform(emptyToUndefined).optional(),
        terms_and_conditions: z
            .string()
            .max(5000, "Terms must be at most 5000 characters")
            .transform(emptyToUndefined)
            .optional(),
        internal_notes: z
            .string()
            .max(2000, "Internal notes must be at most 2000 characters")
            .transform(emptyToUndefined)
            .optional(),
        tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags allowed").optional(),

        // Items — at least one required
        items: z
            .array(createPurchaseOrderItemSchema)
            .min(1, "At least one item is required"),
    })
    .refine(
        (data) => {
            if (data.expected_delivery_date && data.order_date) {
                return new Date(data.expected_delivery_date) >= new Date(data.order_date);
            }
            return true;
        },
        {
            message: "Expected delivery date must be on or after order date",
            path: ["expected_delivery_date"],
        }
    );

// ============================================================================
// UPDATE PURCHASE ORDER SCHEMA
// ============================================================================

export const updatePurchaseOrderSchema = z.object({
    invoice_number: z.string().max(50).transform(emptyToUndefined).optional(),
    reference_number: z.string().max(50).transform(emptyToUndefined).optional(),
    expected_delivery_date: z.string().transform(emptyToUndefined).optional(),
    invoice_date: z.string().transform(emptyToUndefined).optional(),

    discount_amount: z.number().min(0).optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
    shipping_charges: z.number().min(0).optional(),
    other_charges: z.number().min(0).optional(),
    round_off: z.number().min(-10).max(10).optional(),

    is_inter_state: z.boolean().optional(),
    place_of_supply: z.string().max(50).transform(emptyToUndefined).optional(),

    receiving_warehouse: z.string().max(100).transform(emptyToUndefined).optional(),
    receiving_notes: z.string().max(2000).transform(emptyToUndefined).optional(),
    payment_due_date: z.string().transform(emptyToUndefined).optional(),

    notes: z.string().max(2000).transform(emptyToUndefined).optional(),
    terms_and_conditions: z.string().max(5000).transform(emptyToUndefined).optional(),
    internal_notes: z.string().max(2000).transform(emptyToUndefined).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
});

// ============================================================================
// RECEIVE ITEM SCHEMA
// ============================================================================

export const receiveItemSchema = z.object({
    item_id: z.string().uuid("Invalid item ID"),
    received_quantity: z
        .number({ message: "Received quantity is required" })
        .positive("Received quantity must be greater than 0"),
    batch_number: z.string().max(50).transform(emptyToUndefined).optional(),
    manufacturing_date: z.string().transform(emptyToUndefined).optional(),
    expiry_date: z.string().transform(emptyToUndefined).optional(),
    notes: z.string().max(500).transform(emptyToUndefined).optional(),
});

export const receiveItemsSchema = z.object({
    items: z.array(receiveItemSchema).min(1, "At least one item is required"),
});

// ============================================================================
// PURCHASE PAYMENT SCHEMA
// ============================================================================

export const createPurchasePaymentSchema = z
    .object({
        payment_date: z.string({ message: "Payment date is required" }).min(1, "Payment date is required"),
        amount: z
            .number({ message: "Amount is required" })
            .positive("Amount must be greater than 0")
            .max(99999999999999, "Amount too large"),
        payment_method: z.enum(PAYMENT_METHODS, { message: "Payment method is required" }),
        transaction_reference: z
            .string()
            .max(100, "Transaction reference too long")
            .transform(emptyToUndefined)
            .optional(),
        bank_name: z.string().max(100).transform(emptyToUndefined).optional(),
        cheque_number: z.string().max(20).transform(emptyToUndefined).optional(),
        cheque_date: z.string().transform(emptyToUndefined).optional(),
        notes: z.string().max(500).transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => {
            // Cheque details required for cheque payment
            if (data.payment_method === "cheque" && !data.cheque_number) {
                return false;
            }
            return true;
        },
        { message: "Cheque number is required for cheque payments", path: ["cheque_number"] }
    )
    .refine(
        (data) => {
            if (data.payment_method === "bank_transfer" && !data.transaction_reference) {
                return false;
            }
            return true;
        },
        {
            message: "Transaction reference is required for bank transfers",
            path: ["transaction_reference"],
        }
    );

// ============================================================================
// PURCHASE RETURN ITEM SCHEMA
// ============================================================================

export const createPurchaseReturnItemSchema = z.object({
    purchase_order_item_id: z.string().uuid().optional(),
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    variant_id: z.string().uuid().optional(),
    product_name: z.string({ message: "Product name is required" }).min(1),
    product_code: z.string({ message: "Product code is required" }).min(1),
    hsn_code: z.string().max(8).transform(emptyToUndefined).optional(),
    return_quantity: z
        .number({ message: "Return quantity is required" })
        .positive("Return quantity must be greater than 0"),
    unit_price: z
        .number({ message: "Unit price is required" })
        .min(0, "Unit price cannot be negative"),
    gst_percentage: z.number().min(0).max(100).default(0),
    cess_percentage: z.number().min(0).max(100).default(0),
    batch_number: z.string().max(50).transform(emptyToUndefined).optional(),
    reason: z.string().max(500).transform(emptyToUndefined).optional(),
});

// ============================================================================
// PURCHASE RETURN SCHEMA
// ============================================================================

export const createPurchaseReturnSchema = z.object({
    purchase_order_id: z.string({ message: "Purchase order is required" }).uuid("Invalid PO ID"),
    supplier_id: z.string({ message: "Supplier is required" }).uuid("Invalid supplier ID"),
    supplier_name: z.string({ message: "Supplier name is required" }).min(1),
    return_date: z.string({ message: "Return date is required" }).min(1, "Return date is required"),
    reason: z.string({ message: "Return reason is required" }).min(3, "Reason must be at least 3 characters").max(500),
    debit_note_number: z.string().max(50).transform(emptyToUndefined).optional(),
    notes: z.string().max(2000).transform(emptyToUndefined).optional(),
    items: z.array(createPurchaseReturnItemSchema).min(1, "At least one return item is required"),
});

// ============================================================================
// CANCEL ORDER SCHEMA
// ============================================================================

export const cancelPurchaseOrderSchema = z.object({
    cancellation_reason: z
        .string({ message: "Cancellation reason is required" })
        .min(5, "Reason must be at least 5 characters")
        .max(500, "Reason must be at most 500 characters"),
});

// ============================================================================
// FILTER & PAGINATION SCHEMAS
// ============================================================================

export const purchaseOrderFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
    payment_status: z.enum(PAYMENT_STATUSES).optional(),
    supplier_id: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    is_inter_state: z.boolean().optional(),
    min_amount: z.number().min(0).optional(),
    max_amount: z.number().min(0).optional(),
    has_invoice: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
});

export const purchaseOrderPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    sort_by: z
        .enum([
            "po_number",
            "order_date",
            "grand_total",
            "supplier_name",
            "status",
            "payment_status",
            "created_at",
            "updated_at",
        ])
        .default("created_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// INFERRED FORM DATA TYPES
// ============================================================================

export type CreatePurchaseOrderFormData = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderFormData = z.infer<typeof updatePurchaseOrderSchema>;
export type CreatePurchaseOrderItemFormData = z.infer<typeof createPurchaseOrderItemSchema>;
export type UpdatePurchaseOrderItemFormData = z.infer<typeof updatePurchaseOrderItemSchema>;
export type ReceiveItemFormData = z.infer<typeof receiveItemSchema>;
export type ReceiveItemsFormData = z.infer<typeof receiveItemsSchema>;
export type CreatePurchasePaymentFormData = z.infer<typeof createPurchasePaymentSchema>;
export type CreatePurchaseReturnFormData = z.infer<typeof createPurchaseReturnSchema>;
export type CancelPurchaseOrderFormData = z.infer<typeof cancelPurchaseOrderSchema>;
export type PurchaseOrderFiltersFormData = z.infer<typeof purchaseOrderFiltersSchema>;
export type PurchaseOrderPaginationFormData = z.infer<typeof purchaseOrderPaginationSchema>;
