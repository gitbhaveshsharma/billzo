import { z } from "zod";
import {
    UNIT_CATEGORIES,
    BARCODE_TYPES,
    PRICE_TYPES,
    TRANSACTION_TYPES,
    REFERENCE_TYPES,
    ALERT_TYPES,
    ALERT_SEVERITIES,
    PRICE_HISTORY_TYPES,
    GST_RATES,
} from "@/types/product.types";

// ============================================================================
// PRODUCT VALIDATION SCHEMAS
// Zod schemas for all product, inventory, category CRUD operations
// ============================================================================

/** Transform empty strings to undefined for optional fields */
const emptyToUndefined = (val: string | undefined) =>
    val === "" || (typeof val === "string" && val.trim() === "") ? undefined : val;

// ============================================================================
// UNIT OF MEASURE SCHEMAS
// ============================================================================

export const createUnitSchema = z
    .object({
        name: z
            .string({ message: "Unit name is required" })
            .min(1, "Unit name is required")
            .max(50, "Unit name must be at most 50 characters"),
        code: z
            .string({ message: "Unit code is required" })
            .min(1, "Unit code is required")
            .max(10, "Unit code must be at most 10 characters"),
        symbol: z.string().max(10, "Symbol must be at most 10 characters").transform(emptyToUndefined).optional(),
        category: z.enum(UNIT_CATEGORIES).optional(),
        is_base_unit: z.boolean().default(false),
        base_unit_id: z.string().uuid("Invalid base unit ID").optional(),
        conversion_factor: z
            .number()
            .positive("Conversion factor must be positive")
            .max(9999999, "Conversion factor too large")
            .optional(),
        decimal_places: z.number().int().min(0).max(6, "Max 6 decimal places").default(0),
    })
    .refine(
        (data) => {
            if (!data.is_base_unit && data.base_unit_id && !data.conversion_factor) {
                return false;
            }
            return true;
        },
        {
            message: "Conversion factor is required for non-base units with a base unit",
            path: ["conversion_factor"],
        }
    );

export const updateUnitSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    code: z.string().min(1).max(10).optional(),
    symbol: z.string().max(10).transform(emptyToUndefined).optional(),
    category: z.enum(UNIT_CATEGORIES).optional(),
    is_base_unit: z.boolean().optional(),
    base_unit_id: z.string().uuid().optional(),
    conversion_factor: z.number().positive().max(9999999).optional(),
    decimal_places: z.number().int().min(0).max(6).optional(),
    is_active: z.boolean().optional(),
});

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

export const createCategorySchema = z.object({
    name: z
        .string({ message: "Category name is required" })
        .min(1, "Category name is required")
        .max(100, "Category name must be at most 100 characters"),
    code: z.string().max(20, "Code must be at most 20 characters").transform(emptyToUndefined).optional(),
    description: z.string().max(500, "Description must be at most 500 characters").transform(emptyToUndefined).optional(),
    parent_id: z.string().uuid("Invalid parent category ID").optional(),
    sort_order: z.number().int().min(0).max(9999).default(0),
    icon: z.string().max(50).transform(emptyToUndefined).optional(),
    image_url: z.string().url("Invalid image URL").transform(emptyToUndefined).optional(),
    is_leaf: z.boolean().default(true),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().max(20).transform(emptyToUndefined).optional(),
    description: z.string().max(500).transform(emptyToUndefined).optional(),
    parent_id: z.string().uuid().nullable().optional(),
    sort_order: z.number().int().min(0).max(9999).optional(),
    icon: z.string().max(50).transform(emptyToUndefined).optional(),
    image_url: z.string().url().transform(emptyToUndefined).optional(),
    is_active: z.boolean().optional(),
    is_leaf: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const createProductSchema = z
    .object({
        product_code: z
            .string({ message: "Product code is required" })
            .min(1, "Product code is required")
            .max(50, "Product code must be at most 50 characters"),
        name: z
            .string({ message: "Product name is required" })
            .min(1, "Product name is required")
            .max(200, "Product name must be at most 200 characters"),
        barcode: z
            .string()
            .max(14, "Barcode must be at most 14 characters")
            .transform(emptyToUndefined)
            .optional(),
        alternate_barcodes: z.array(z.string().max(14)).max(10, "Maximum 10 alternate barcodes").optional(),
        description: z.string().max(2000, "Description must be at most 2000 characters").transform(emptyToUndefined).optional(),
        short_description: z.string().max(200, "Short description must be at most 200 characters").transform(emptyToUndefined).optional(),

        // Categorization
        category_id: z.string().uuid("Invalid category ID").optional(),
        brand: z.string().max(100, "Brand must be at most 100 characters").transform(emptyToUndefined).optional(),
        model: z.string().max(100, "Model must be at most 100 characters").transform(emptyToUndefined).optional(),

        // Tax
        hsn_code: z.string().max(8, "HSN code must be at most 8 characters").transform(emptyToUndefined).optional(),
        gst_percentage: z
            .number({ message: "GST percentage is required" })
            .min(0, "GST cannot be negative")
            .max(100, "GST cannot exceed 100%"),
        cess_percentage: z.number().min(0).max(100).default(0),

        // Pricing
        mrp: z
            .number({ message: "MRP is required" })
            .positive("MRP must be greater than 0")
            .max(9999999999, "MRP too large"),
        selling_price: z
            .number({ message: "Selling price is required" })
            .positive("Selling price must be greater than 0")
            .max(9999999999, "Selling price too large"),
        purchase_price: z
            .number()
            .min(0, "Purchase price cannot be negative")
            .max(9999999999, "Purchase price too large")
            .optional(),

        // Unit
        unit_id: z.string().uuid("Invalid unit ID").optional(),

        // Inventory settings
        minimum_stock: z.number().int().min(0, "Minimum stock cannot be negative").default(0),
        reorder_level: z.number().int().min(0, "Reorder level cannot be negative").default(0),
        is_batch_tracked: z.boolean().default(false),
        is_taxable: z.boolean().default(true),

        // Image
        primary_image: z.string().url("Invalid image URL").transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => data.selling_price <= data.mrp,
        {
            message: "Selling price cannot exceed MRP",
            path: ["selling_price"],
        }
    )
    .refine(
        (data) => data.reorder_level >= data.minimum_stock,
        {
            message: "Reorder level should be greater than or equal to minimum stock",
            path: ["reorder_level"],
        }
    );

export const updateProductSchema = z
    .object({
        product_code: z.string().min(1).max(50).optional(),
        name: z.string().min(1).max(200).optional(),
        barcode: z.string().max(14).transform(emptyToUndefined).optional(),
        alternate_barcodes: z.array(z.string().max(14)).max(10).optional(),
        description: z.string().max(2000).transform(emptyToUndefined).optional(),
        short_description: z.string().max(200).transform(emptyToUndefined).optional(),

        category_id: z.string().uuid().optional(),
        brand: z.string().max(100).transform(emptyToUndefined).optional(),
        model: z.string().max(100).transform(emptyToUndefined).optional(),

        hsn_code: z.string().max(8).transform(emptyToUndefined).optional(),
        gst_percentage: z.number().min(0).max(100).optional(),
        cess_percentage: z.number().min(0).max(100).optional(),

        mrp: z.number().positive().max(9999999999).optional(),
        selling_price: z.number().positive().max(9999999999).optional(),
        purchase_price: z.number().min(0).max(9999999999).optional(),

        unit_id: z.string().uuid().optional(),

        minimum_stock: z.number().int().min(0).optional(),
        reorder_level: z.number().int().min(0).optional(),
        is_batch_tracked: z.boolean().optional(),
        is_active: z.boolean().optional(),
        is_taxable: z.boolean().optional(),

        primary_image: z.string().url().transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => {
            if (data.selling_price != null && data.mrp != null) {
                return data.selling_price <= data.mrp;
            }
            return true;
        },
        {
            message: "Selling price cannot exceed MRP",
            path: ["selling_price"],
        }
    );

// ============================================================================
// PRODUCT BARCODE SCHEMAS
// ============================================================================

export const createProductBarcodeSchema = z.object({
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    barcode: z
        .string({ message: "Barcode is required" })
        .min(1, "Barcode is required")
        .max(14, "Barcode must be at most 14 characters"),
    barcode_type: z.enum(BARCODE_TYPES).default("EAN13"),
    price_type: z.enum(PRICE_TYPES).default("selling"),
    is_primary: z.boolean().default(false),
});

export const updateProductBarcodeSchema = z.object({
    barcode: z.string().min(1).max(14).optional(),
    barcode_type: z.enum(BARCODE_TYPES).optional(),
    price_type: z.enum(PRICE_TYPES).optional(),
    is_primary: z.boolean().optional(),
    is_active: z.boolean().optional(),
});

// ============================================================================
// PRODUCT VARIANT SCHEMAS
// ============================================================================

export const createProductVariantSchema = z.object({
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    variant_code: z
        .string({ message: "Variant code is required" })
        .min(1, "Variant code is required")
        .max(50, "Variant code must be at most 50 characters"),
    barcode: z.string().max(14, "Barcode must be at most 14 characters").transform(emptyToUndefined).optional(),
    name: z.string().max(200, "Name must be at most 200 characters").transform(emptyToUndefined).optional(),
    attributes: z.record(z.string(), z.string()).refine((val) => Object.keys(val).length > 0, { message: "Variant attributes are required" }),
    mrp: z.number().positive("MRP must be positive").max(9999999999).optional(),
    selling_price: z.number().positive("Selling price must be positive").max(9999999999).optional(),
    is_default: z.boolean().default(false),
    image_url: z.string().url("Invalid image URL").transform(emptyToUndefined).optional(),
});

export const updateProductVariantSchema = z.object({
    variant_code: z.string().min(1).max(50).optional(),
    barcode: z.string().max(14).transform(emptyToUndefined).optional(),
    name: z.string().max(200).transform(emptyToUndefined).optional(),
    attributes: z.record(z.string(), z.string()).optional(),
    mrp: z.number().positive().max(9999999999).optional(),
    selling_price: z.number().positive().max(9999999999).optional(),
    is_active: z.boolean().optional(),
    is_default: z.boolean().optional(),
    image_url: z.string().url().transform(emptyToUndefined).optional(),
});

// ============================================================================
// STOCK ADJUSTMENT SCHEMA
// ============================================================================

export const stockAdjustmentSchema = z
    .object({
        product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
        variant_id: z.string().uuid("Invalid variant ID").optional(),
        transaction_type: z.enum(TRANSACTION_TYPES, { message: "Transaction type is required" }),
        quantity: z
            .number({ message: "Quantity is required" })
            .positive("Quantity must be greater than 0")
            .max(999999, "Quantity too large"),
        unit_cost: z.number().min(0, "Unit cost cannot be negative").max(9999999999).optional(),
        reason: z
            .string()
            .max(500, "Reason must be at most 500 characters")
            .transform(emptyToUndefined)
            .optional(),
        reference_type: z.enum(REFERENCE_TYPES).optional(),
        reference_id: z.string().uuid().optional(),
        reference_number: z.string().max(50).transform(emptyToUndefined).optional(),
        batch_number: z.string().max(50).transform(emptyToUndefined).optional(),
        serial_number: z.string().max(100).transform(emptyToUndefined).optional(),
        expiry_date: z.string().transform(emptyToUndefined).optional(),
        manufacturing_date: z.string().transform(emptyToUndefined).optional(),
        from_location: z.string().max(100).transform(emptyToUndefined).optional(),
        to_location: z.string().max(100).transform(emptyToUndefined).optional(),
        notes: z.string().max(1000, "Notes must be at most 1000 characters").transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => {
            if (data.expiry_date && data.manufacturing_date) {
                return new Date(data.expiry_date) > new Date(data.manufacturing_date);
            }
            return true;
        },
        { message: "Expiry date must be after manufacturing date", path: ["expiry_date"] }
    )
    .refine(
        (data) => {
            if (data.transaction_type === "ADJUSTMENT" && !data.reason) {
                return false;
            }
            return true;
        },
        { message: "Reason is required for stock adjustments", path: ["reason"] }
    )
    .refine(
        (data) => {
            const transferTypes = ["TRANSFER_IN", "TRANSFER_OUT"];
            if (transferTypes.includes(data.transaction_type) && !data.to_location && !data.from_location) {
                return false;
            }
            return true;
        },
        { message: "Location is required for transfer transactions", path: ["to_location"] }
    );

// ============================================================================
// UPDATE INVENTORY SCHEMA
// ============================================================================

export const updateInventorySchema = z.object({
    reorder_point: z.number().min(0, "Reorder point cannot be negative").optional(),
    maximum_stock: z.number().positive("Maximum stock must be positive").optional(),
    location: z.string().max(100).transform(emptyToUndefined).optional(),
    warehouse: z.string().max(100).transform(emptyToUndefined).optional(),
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
            .max(50, "Batch number must be at most 50 characters"),
        manufacturing_date: z.string().transform(emptyToUndefined).optional(),
        expiry_date: z.string({ message: "Expiry date is required" }).min(1, "Expiry date is required"),
        mrp: z.number().min(0, "MRP cannot be negative").max(9999999999).optional(),
        initial_quantity: z
            .number({ message: "Initial quantity is required" })
            .positive("Initial quantity must be greater than 0")
            .max(999999, "Quantity too large"),
        current_quantity: z
            .number({ message: "Current quantity is required" })
            .min(0, "Current quantity cannot be negative")
            .max(999999, "Quantity too large"),
        purchase_date: z.string().transform(emptyToUndefined).optional(),
        purchase_price: z.number().min(0).max(9999999999).optional(),
        supplier_id: z.string().uuid("Invalid supplier ID").optional(),
        purchase_invoice: z.string().max(50).transform(emptyToUndefined).optional(),
    })
    .refine(
        (data) => {
            if (data.manufacturing_date && data.expiry_date) {
                return new Date(data.expiry_date) > new Date(data.manufacturing_date);
            }
            return true;
        },
        { message: "Expiry date must be after manufacturing date", path: ["expiry_date"] }
    )
    .refine(
        (data) => data.current_quantity <= data.initial_quantity,
        { message: "Current quantity cannot exceed initial quantity", path: ["current_quantity"] }
    );

export const updateProductBatchSchema = z.object({
    manufacturing_date: z.string().transform(emptyToUndefined).optional(),
    expiry_date: z.string().optional(),
    mrp: z.number().min(0).max(9999999999).optional(),
    current_quantity: z.number().min(0).max(999999).optional(),
    purchase_price: z.number().min(0).max(9999999999).optional(),
    is_active: z.boolean().optional(),
});

// ============================================================================
// SUPPLIER PRODUCT SCHEMAS
// ============================================================================

export const createSupplierProductSchema = z.object({
    supplier_id: z.string({ message: "Supplier is required" }).uuid("Invalid supplier ID"),
    product_id: z.string({ message: "Product is required" }).uuid("Invalid product ID"),
    supplier_product_code: z.string().max(50).transform(emptyToUndefined).optional(),
    supplier_product_name: z.string().max(200).transform(emptyToUndefined).optional(),
    purchase_price: z
        .number({ message: "Purchase price is required" })
        .min(0, "Purchase price cannot be negative")
        .max(9999999999, "Purchase price too large"),
    mrp: z.number().min(0).max(9999999999).optional(),
    discount_percentage: z.number().min(0).max(100, "Discount cannot exceed 100%").default(0),
    lead_time_days: z.number().int().min(0).max(365, "Lead time cannot exceed 365 days").optional(),
    minimum_order_quantity: z.number().int().min(1, "Minimum order quantity must be at least 1").default(1),
    is_preferred: z.boolean().default(false),
});

export const updateSupplierProductSchema = z.object({
    supplier_product_code: z.string().max(50).transform(emptyToUndefined).optional(),
    supplier_product_name: z.string().max(200).transform(emptyToUndefined).optional(),
    purchase_price: z.number().min(0).max(9999999999).optional(),
    mrp: z.number().min(0).max(9999999999).optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
    lead_time_days: z.number().int().min(0).max(365).optional(),
    minimum_order_quantity: z.number().int().min(1).optional(),
    is_preferred: z.boolean().optional(),
    is_active: z.boolean().optional(),
});

// ============================================================================
// RESOLVE STOCK ALERT SCHEMA
// ============================================================================

export const resolveStockAlertSchema = z.object({
    resolution_notes: z
        .string()
        .max(1000, "Resolution notes must be at most 1000 characters")
        .transform(emptyToUndefined)
        .optional(),
});

// ============================================================================
// FILTER & PAGINATION SCHEMAS
// ============================================================================

export const productFiltersSchema = z.object({
    search: z.string().max(200).optional(),
    category_id: z.string().uuid().optional(),
    brand: z.string().max(100).optional(),
    is_active: z.boolean().optional(),
    is_batch_tracked: z.boolean().optional(),
    is_taxable: z.boolean().optional(),
    gst_percentage: z.number().min(0).max(100).optional(),
    min_price: z.number().min(0).optional(),
    max_price: z.number().min(0).optional(),
    min_stock: z.number().min(0).optional(),
    max_stock: z.number().min(0).optional(),
    has_barcode: z.boolean().optional(),
    low_stock_only: z.boolean().optional(),
});

export const productPaginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    sort_by: z
        .enum([
            "product_code",
            "name",
            "mrp",
            "selling_price",
            "purchase_price",
            "category_id",
            "brand",
            "created_at",
            "updated_at",
        ])
        .default("created_at"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const inventoryTransactionFiltersSchema = z.object({
    product_id: z.string().uuid().optional(),
    variant_id: z.string().uuid().optional(),
    transaction_type: z.enum(TRANSACTION_TYPES).optional(),
    reference_type: z.enum(REFERENCE_TYPES).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
});

export const stockAlertFiltersSchema = z.object({
    alert_type: z.enum(ALERT_TYPES).optional(),
    severity: z.enum(ALERT_SEVERITIES).optional(),
    is_resolved: z.boolean().optional(),
});

export const categoryFiltersSchema = z.object({
    search: z.string().max(200).optional(),
    parent_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
    level: z.number().int().min(1).max(10).optional(),
});

// ============================================================================
// BARCODE LOOKUP SCHEMA (POS)
// ============================================================================

export const barcodeLookupSchema = z.object({
    barcode: z
        .string({ message: "Barcode is required" })
        .min(1, "Barcode is required")
        .max(14, "Barcode too long"),
});

// ============================================================================
// INFERRED FORM DATA TYPES
// ============================================================================

export type CreateUnitFormData = z.infer<typeof createUnitSchema>;
export type UpdateUnitFormData = z.infer<typeof updateUnitSchema>;
export type CreateCategoryFormData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type CreateProductBarcodeFormData = z.infer<typeof createProductBarcodeSchema>;
export type UpdateProductBarcodeFormData = z.infer<typeof updateProductBarcodeSchema>;
export type CreateProductVariantFormData = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantFormData = z.infer<typeof updateProductVariantSchema>;
export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
export type UpdateInventoryFormData = z.infer<typeof updateInventorySchema>;
export type CreateProductBatchFormData = z.infer<typeof createProductBatchSchema>;
export type UpdateProductBatchFormData = z.infer<typeof updateProductBatchSchema>;
export type CreateSupplierProductFormData = z.infer<typeof createSupplierProductSchema>;
export type UpdateSupplierProductFormData = z.infer<typeof updateSupplierProductSchema>;
export type ResolveStockAlertFormData = z.infer<typeof resolveStockAlertSchema>;
export type BarcodeLookupFormData = z.infer<typeof barcodeLookupSchema>;
export type ProductFiltersFormData = z.infer<typeof productFiltersSchema>;
export type ProductPaginationFormData = z.infer<typeof productPaginationSchema>;
