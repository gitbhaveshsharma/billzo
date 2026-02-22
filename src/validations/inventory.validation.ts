import { z } from "zod";
import {
    TRANSACTION_TYPES,
    ALERT_TYPES,
    ALERT_SEVERITIES,
    PRICE_TYPES,
    REFERENCE_TYPES,
    UNIT_CATEGORIES,
} from "@/types/inventory.types";

// ============================================================================
// INVENTORY VALIDATION SCHEMAS
// Zod schemas for inventory CRUD operations
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

// ============================================================================
// STOCK ADJUSTMENT SCHEMA
// ============================================================================

export const createStockAdjustmentSchema = z
    .object({
        product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
        variant_id: z.string().uuid("Invalid variant ID").optional(),
        adjustment_type: z.enum(["ADJUSTMENT", "DAMAGE", "EXPIRY"], {
            message: "Adjustment type is required",
        }),
        new_quantity: z
            .number()
            .min(0, "New quantity cannot be negative")
            .max(9999999, "Quantity too large")
            .optional(),
        quantity: z
            .number({ message: "Quantity is required" })
            .min(0, "Quantity cannot be negative")
            .max(9999999, "Quantity too large"),
        unit_cost: z
            .number()
            .min(0, "Unit cost cannot be negative")
            .max(9999999999, "Unit cost too large")
            .optional(),
        reason: z
            .string({ message: "Reason is required" })
            .min(3, "Reason must be at least 3 characters")
            .max(500, "Reason must be at most 500 characters"),
        batch_number: z
            .string()
            .max(50, "Batch number too long")
            .transform(emptyToUndefined)
            .optional(),
        serial_number: z
            .string()
            .max(50, "Serial number too long")
            .transform(emptyToUndefined)
            .optional(),
        expiry_date: z.string().transform(emptyToUndefined).optional(),
        notes: z
            .string()
            .max(1000, "Notes must be at most 1000 characters")
            .transform(emptyToUndefined)
            .optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .refine(
        (data) => {
            // For ADJUSTMENT type, new_quantity is required
            if (data.adjustment_type === "ADJUSTMENT" && data.new_quantity == null) {
                return false;
            }
            return true;
        },
        {
            message: "New quantity is required for stock adjustment",
            path: ["new_quantity"],
        }
    )
    .refine(
        (data) => {
            // For DAMAGE/EXPIRY, quantity must be greater than 0
            if (
                (data.adjustment_type === "DAMAGE" || data.adjustment_type === "EXPIRY") &&
                data.quantity <= 0
            ) {
                return false;
            }
            return true;
        },
        {
            message: "Quantity must be greater than 0 for damage/expiry entries",
            path: ["quantity"],
        }
    );

// ============================================================================
// STOCK TRANSFER SCHEMA
// ============================================================================

export const createStockTransferSchema = z.object({
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    variant_id: z.string().uuid("Invalid variant ID").optional(),
    quantity: z
        .number({ message: "Quantity is required" })
        .positive("Quantity must be greater than 0")
        .max(9999999, "Quantity too large"),
    from_location: z
        .string({ message: "From location is required" })
        .min(1, "From location is required")
        .max(100, "Location name too long"),
    to_location: z
        .string({ message: "To location is required" })
        .min(1, "To location is required")
        .max(100, "Location name too long"),
    unit_cost: z
        .number()
        .min(0, "Unit cost cannot be negative")
        .max(9999999999, "Unit cost too large")
        .optional(),
    batch_number: z
        .string()
        .max(50, "Batch number too long")
        .transform(emptyToUndefined)
        .optional(),
    reason: z
        .string()
        .max(500, "Reason must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
    notes: z
        .string()
        .max(1000, "Notes must be at most 1000 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// INVENTORY RECORD UPDATE SCHEMA
// ============================================================================

export const updateInventoryRecordSchema = z.object({
    reorder_point: z
        .number()
        .min(0, "Reorder point cannot be negative")
        .max(9999999, "Value too large")
        .optional(),
    maximum_stock: z
        .number()
        .min(0, "Maximum stock cannot be negative")
        .max(9999999, "Value too large")
        .optional()
        .nullable(),
    location: z
        .string()
        .max(100, "Location name too long")
        .transform(emptyToUndefined)
        .optional(),
    warehouse: z
        .string()
        .max(100, "Warehouse name too long")
        .transform(emptyToUndefined)
        .optional(),
    is_active: z.boolean().optional(),
});

// ============================================================================
// PRODUCT BATCH SCHEMAS
// ============================================================================

export const createProductBatchSchema = z
    .object({
        product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
        batch_number: z
            .string({ message: "Batch number is required" })
            .min(1, "Batch number is required")
            .max(50, "Batch number too long"),
        manufacturing_date: z.string().transform(emptyToUndefined).optional(),
        expiry_date: z.string({ message: "Expiry date is required" }).min(1, "Expiry date is required"),
        mrp: z
            .number()
            .min(0, "MRP cannot be negative")
            .max(9999999999, "MRP too large")
            .optional(),
        initial_quantity: z
            .number({ message: "Initial quantity is required" })
            .positive("Initial quantity must be greater than 0")
            .max(9999999, "Quantity too large"),
        current_quantity: z
            .number({ message: "Current quantity is required" })
            .min(0, "Current quantity cannot be negative")
            .max(9999999, "Quantity too large"),
        purchase_date: z.string().transform(emptyToUndefined).optional(),
        purchase_price: z
            .number()
            .min(0, "Purchase price cannot be negative")
            .max(9999999999, "Price too large")
            .optional(),
        supplier_id: z.string().uuid("Invalid supplier ID").optional(),
        purchase_invoice: z
            .string()
            .max(50, "Invoice number too long")
            .transform(emptyToUndefined)
            .optional(),
    })
    .refine(
        (data) => {
            if (data.manufacturing_date && data.expiry_date) {
                return new Date(data.expiry_date) > new Date(data.manufacturing_date);
            }
            return true;
        },
        {
            message: "Expiry date must be after manufacturing date",
            path: ["expiry_date"],
        }
    )
    .refine(
        (data) => {
            return data.current_quantity <= data.initial_quantity;
        },
        {
            message: "Current quantity cannot exceed initial quantity",
            path: ["current_quantity"],
        }
    );

export const updateProductBatchSchema = z.object({
    manufacturing_date: z.string().transform(emptyToUndefined).optional(),
    expiry_date: z.string().transform(emptyToUndefined).optional(),
    mrp: z
        .number()
        .min(0, "MRP cannot be negative")
        .max(9999999999, "MRP too large")
        .optional(),
    current_quantity: z
        .number()
        .min(0, "Current quantity cannot be negative")
        .max(9999999, "Quantity too large")
        .optional(),
    purchase_price: z
        .number()
        .min(0, "Purchase price cannot be negative")
        .max(9999999999, "Price too large")
        .optional(),
    is_active: z.boolean().optional(),
});

// ============================================================================
// STOCK ALERT SCHEMAS
// ============================================================================

export const resolveStockAlertSchema = z.object({
    resolution_notes: z
        .string({ message: "Resolution notes are required" })
        .min(3, "Resolution notes must be at least 3 characters")
        .max(500, "Resolution notes must be at most 500 characters"),
});

export const createStockAlertSchema = z.object({
    product_id: z.string().uuid("Invalid product ID").optional(),
    batch_id: z.string().uuid("Invalid batch ID").optional(),
    alert_type: z.enum(ALERT_TYPES, { message: "Alert type is required" }),
    severity: z.enum(ALERT_SEVERITIES).default("medium"),
    current_quantity: z.number().optional(),
    threshold_quantity: z.number().optional(),
    expiry_date: z.string().transform(emptyToUndefined).optional(),
});

// ============================================================================
// PRICE HISTORY SCHEMA
// ============================================================================

export const createPriceHistorySchema = z.object({
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    variant_id: z.string().uuid("Invalid variant ID").optional(),
    price_type: z.enum(PRICE_TYPES, { message: "Price type is required" }),
    old_price: z.number().min(0, "Old price cannot be negative").optional(),
    new_price: z
        .number({ message: "New price is required" })
        .min(0, "New price cannot be negative")
        .max(9999999999, "Price too large"),
    reason: z
        .string()
        .max(500, "Reason must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
    effective_from: z.string().optional(),
});

// ============================================================================
// STOCK COUNT / PHYSICAL AUDIT SCHEMA
// ============================================================================

export const stockCountItemSchema = z.object({
    inventory_id: z.string({ message: "Inventory ID is required" }).uuid("Invalid inventory ID"),
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    variant_id: z.string().uuid("Invalid variant ID").optional(),
    counted_quantity: z
        .number({ message: "Counted quantity is required" })
        .min(0, "Counted quantity cannot be negative")
        .max(9999999, "Quantity too large"),
    notes: z
        .string()
        .max(500, "Notes must be at most 500 characters")
        .transform(emptyToUndefined)
        .optional(),
});

export const stockCountSchema = z.object({
    items: z
        .array(stockCountItemSchema)
        .min(1, "At least one item is required for stock count"),
    notes: z
        .string()
        .max(2000, "Notes must be at most 2000 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// FILTER & PAGINATION SCHEMAS
// ============================================================================

export const inventoryFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    category_id: z.string().uuid().optional(),
    warehouse: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    is_active: z.boolean().optional(),
    low_stock_only: z.boolean().optional(),
    out_of_stock_only: z.boolean().optional(),
    overstock_only: z.boolean().optional(),
    has_variant: z.boolean().optional(),
    min_quantity: z.number().min(0).optional(),
    max_quantity: z.number().min(0).optional(),
});

export const inventoryPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort_by: z
        .enum([
            "product_name",
            "product_code",
            "quantity_on_hand",
            "quantity_available",
            "average_cost",
            "total_value",
            "reorder_point",
            "last_updated_at",
            "created_at",
        ])
        .default("last_updated_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const transactionFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    transaction_type: z.enum(TRANSACTION_TYPES).optional(),
    product_id: z.string().uuid().optional(),
    variant_id: z.string().uuid().optional(),
    reference_type: z.enum(REFERENCE_TYPES).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    performed_by: z.string().uuid().optional(),
    batch_number: z.string().max(50).optional(),
});

export const transactionPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort_by: z
        .enum([
            "transaction_date",
            "quantity",
            "total_cost",
            "transaction_type",
            "created_at",
        ])
        .default("transaction_date"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const batchFiltersSchema = z.object({
    search: z.string().max(100).optional(),
    product_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    is_active: z.boolean().optional(),
    expiring_within_days: z.number().int().min(1).max(365).optional(),
    expired_only: z.boolean().optional(),
});

export const alertFiltersSchema = z.object({
    alert_type: z.enum(ALERT_TYPES).optional(),
    severity: z.enum(ALERT_SEVERITIES).optional(),
    is_resolved: z.boolean().optional(),
    product_id: z.string().uuid().optional(),
});

// ============================================================================
// INFERRED FORM DATA TYPES
// ============================================================================

export type CreateStockAdjustmentFormData = z.infer<typeof createStockAdjustmentSchema>;
export type CreateStockTransferFormData = z.infer<typeof createStockTransferSchema>;
export type UpdateInventoryRecordFormData = z.infer<typeof updateInventoryRecordSchema>;
export type CreateProductBatchFormData = z.infer<typeof createProductBatchSchema>;
export type UpdateProductBatchFormData = z.infer<typeof updateProductBatchSchema>;
export type ResolveStockAlertFormData = z.infer<typeof resolveStockAlertSchema>;
export type CreateStockAlertFormData = z.infer<typeof createStockAlertSchema>;
export type CreatePriceHistoryFormData = z.infer<typeof createPriceHistorySchema>;
export type StockCountItemFormData = z.infer<typeof stockCountItemSchema>;
export type StockCountFormData = z.infer<typeof stockCountSchema>;
export type InventoryFiltersFormData = z.infer<typeof inventoryFiltersSchema>;
export type InventoryPaginationFormData = z.infer<typeof inventoryPaginationSchema>;
export type TransactionFiltersFormData = z.infer<typeof transactionFiltersSchema>;
export type TransactionPaginationFormData = z.infer<typeof transactionPaginationSchema>;
export type BatchFiltersFormData = z.infer<typeof batchFiltersSchema>;
export type AlertFiltersFormData = z.infer<typeof alertFiltersSchema>;
