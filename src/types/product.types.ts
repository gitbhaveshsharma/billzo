// ============================================================================
// PRODUCT TYPES - Product, Inventory & Catalog management types
// Aligned with: supabase/migrations/5_inventory_supplier.sql (tables 17, 20-29)
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS (matching DB constraints)
// ============================================================================

export const UNIT_CATEGORIES = [
    "weight",
    "quantity",
    "volume",
    "length",
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

export const BARCODE_TYPES = [
    "EAN13",
    "UPC",
    "CODE128",
    "CODE39",
    "QR",
    "ITF",
] as const;

export type BarcodeType = (typeof BARCODE_TYPES)[number];

export const PRICE_TYPES = [
    "selling",
    "mrp",
    "wholesale",
] as const;

export type PriceType = (typeof PRICE_TYPES)[number];

export const TRANSACTION_TYPES = [
    "PURCHASE",
    "SALE",
    "RETURN",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "EXPIRY",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const REFERENCE_TYPES = [
    "purchase_order",
    "sales_invoice",
    "stock_adjustment",
    "transfer",
    "return",
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const ALERT_TYPES = [
    "LOW_STOCK",
    "EXPIRY",
    "OVERSTOCK",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = [
    "low",
    "medium",
    "high",
    "critical",
] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const PRICE_HISTORY_TYPES = [
    "PURCHASE",
    "SELLING",
    "MRP",
] as const;

export type PriceHistoryType = (typeof PRICE_HISTORY_TYPES)[number];

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export type GstRate = (typeof GST_RATES)[number];

// ============================================================================
// 17. UNIT OF MEASURE - matches `units_of_measure` table
// ============================================================================

export interface UnitOfMeasure {
    id: string;
    store_id: string;

    // Unit Details
    name: string;
    code: string;
    symbol: string | null;

    // Category
    category: UnitCategory | null;

    // Conversion
    is_base_unit: boolean;
    base_unit_id: string | null;
    conversion_factor: number | null;

    // Settings
    decimal_places: number;

    // Status
    is_active: boolean;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// 20. CATEGORY - matches `categories` table (hierarchical)
// ============================================================================

export interface Category {
    id: string;
    store_id: string;

    // Category Details
    name: string;
    code: string | null;
    description: string | null;

    // Hierarchy
    parent_id: string | null;
    level: number;
    path: string | null;

    // Display
    sort_order: number;
    icon: string | null;
    image_url: string | null;

    // Status
    is_active: boolean;
    is_leaf: boolean;

    // Metadata
    metadata: Record<string, unknown>;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// 21. PRODUCT - matches `products` table
// ============================================================================

export interface Product {
    id: string;
    store_id: string;

    // Product Identification
    product_code: string;
    barcode: string | null;
    alternate_barcodes: string[] | null;
    name: string;
    description: string | null;
    short_description: string | null;

    // Categorization
    category_id: string | null;
    brand: string | null;
    model: string | null;

    // Tax & Compliance (GST)
    hsn_code: string | null;
    gst_percentage: number;
    cess_percentage: number;

    // Pricing
    mrp: number;
    selling_price: number;
    purchase_price: number | null;

    // Costing
    average_cost: number | null;

    // Units
    unit_id: string | null;

    // Inventory Settings
    minimum_stock: number;
    reorder_level: number;
    is_batch_tracked: boolean;

    // Product Status
    is_active: boolean;
    is_taxable: boolean;

    // Images
    primary_image: string | null;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// 22. PRODUCT BARCODE - matches `product_barcodes` table
// ============================================================================

export interface ProductBarcode {
    id: string;
    product_id: string;
    store_id: string;

    // Barcode
    barcode: string;
    barcode_type: BarcodeType;

    // Pricing
    price_type: PriceType;

    // Status
    is_primary: boolean;
    is_active: boolean;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// 23. PRODUCT VARIANT - matches `product_variants` table
// ============================================================================

export interface ProductVariant {
    id: string;
    product_id: string;
    store_id: string;

    // Variant Identification
    variant_code: string;
    barcode: string | null;
    name: string | null;

    // Variant Attributes
    attributes: Record<string, string>;

    // Pricing (override parent)
    mrp: number | null;
    selling_price: number | null;

    // Status
    is_active: boolean;
    is_default: boolean;

    // Image
    image_url: string | null;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// 24. INVENTORY - matches `inventory` table
// ============================================================================

export interface Inventory {
    id: string;
    store_id: string;
    product_id: string;
    variant_id: string | null;

    // Stock Quantities
    quantity_on_hand: number;
    quantity_committed: number;
    quantity_available: number; // Generated: on_hand - committed
    quantity_in_transit: number;

    // Stock Status
    reorder_point: number;
    maximum_stock: number | null;

    // Location
    location: string | null;
    warehouse: string | null;

    // Tracking
    last_counted_at: string | null;
    last_counted_by: string | null;
    last_updated_at: string;

    // Valuation
    average_cost: number | null;
    total_value: number | null; // Generated: on_hand * average_cost

    // Status
    is_active: boolean;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// 25. INVENTORY TRANSACTION - matches `inventory_transactions` table
// ============================================================================

export interface InventoryTransaction {
    id: string;
    store_id: string;
    product_id: string;
    variant_id: string | null;

    // Transaction Details
    transaction_type: TransactionType;
    transaction_date: string;

    // Quantities
    quantity: number;
    previous_quantity: number | null;
    new_quantity: number | null;

    // Valuation
    unit_cost: number | null;
    total_cost: number | null;

    // Reference (Polymorphic)
    reference_type: ReferenceType | null;
    reference_id: string | null;
    reference_number: string | null;

    // Batch/Serial Tracking
    batch_number: string | null;
    serial_number: string | null;
    expiry_date: string | null;
    manufacturing_date: string | null;

    // Reason (for adjustments)
    reason: string | null;

    // Location
    from_location: string | null;
    to_location: string | null;

    // Performed by
    performed_by: string | null;
    notes: string | null;

    // System fields
    created_at: string;
    metadata: Record<string, unknown>;
}

// ============================================================================
// 26. PRODUCT BATCH - matches `product_batches` table
// ============================================================================

export interface ProductBatch {
    id: string;
    store_id: string;
    product_id: string;

    // Batch Details
    batch_number: string;
    manufacturing_date: string | null;
    expiry_date: string;
    mrp: number | null;

    // Quantities
    initial_quantity: number;
    current_quantity: number;

    // Purchase Info
    purchase_date: string | null;
    purchase_price: number | null;
    supplier_id: string | null;
    purchase_invoice: string | null;

    // Status
    is_active: boolean;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// 27. SUPPLIER PRODUCT - matches `supplier_products` table
// ============================================================================

export interface SupplierProduct {
    id: string;
    supplier_id: string;
    product_id: string;
    store_id: string;

    // Supplier's Product Info
    supplier_product_code: string | null;
    supplier_product_name: string | null;

    // Pricing
    purchase_price: number;
    mrp: number | null;
    discount_percentage: number;

    // Lead Time & Minimum Order
    lead_time_days: number | null;
    minimum_order_quantity: number;

    // Status
    is_preferred: boolean;
    is_active: boolean;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// 28. PRICE HISTORY - matches `price_history` table
// ============================================================================

export interface PriceHistory {
    id: string;
    store_id: string;
    product_id: string;
    variant_id: string | null;

    // Price Change
    price_type: PriceHistoryType;
    old_price: number | null;
    new_price: number | null;

    // Change Reason
    reason: string | null;

    // Effective Dates
    effective_from: string;

    // Changed by
    changed_by: string | null;

    // System fields
    created_at: string;
}

// ============================================================================
// 29. STOCK ALERT - matches `stock_alerts` table
// ============================================================================

export interface StockAlert {
    id: string;
    store_id: string;
    product_id: string | null;
    batch_id: string | null;

    // Alert Type
    alert_type: AlertType;
    severity: AlertSeverity;

    // Alert Details
    current_quantity: number | null;
    threshold_quantity: number | null;
    expiry_date: string | null;

    // Status
    is_resolved: boolean;
    resolved_at: string | null;
    resolved_by: string | null;
    resolution_notes: string | null;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// ENRICHED TYPES (with related data)
// ============================================================================

export interface EnrichedProduct extends Product {
    variants: ProductVariant[];
    barcodes: ProductBarcode[];
    inventory: Inventory | null;
    batches: ProductBatch[];
    supplier_products: SupplierProduct[];
    category?: Pick<Category, "id" | "name" | "path"> | null;
    unit?: Pick<UnitOfMeasure, "id" | "name" | "code" | "symbol"> | null;
}

export interface EnrichedCategory extends Category {
    children: Category[];
    product_count: number;
}

export interface EnrichedInventory extends Inventory {
    product?: Pick<Product, "id" | "name" | "product_code" | "barcode" | "unit_id" | "primary_image">;
    variant?: Pick<ProductVariant, "id" | "name" | "variant_code"> | null;
}

export interface EnrichedStockAlert extends StockAlert {
    product?: Pick<Product, "id" | "name" | "product_code" | "barcode">;
    batch?: Pick<ProductBatch, "id" | "batch_number" | "expiry_date"> | null;
}

// ============================================================================
// REQUEST TYPES - UNIT OF MEASURE
// ============================================================================

export interface CreateUnitRequest {
    name: string;
    code: string;
    symbol?: string;
    category?: UnitCategory;
    is_base_unit?: boolean;
    base_unit_id?: string;
    conversion_factor?: number;
    decimal_places?: number;
}

export interface UpdateUnitRequest {
    name?: string;
    code?: string;
    symbol?: string;
    category?: UnitCategory;
    is_base_unit?: boolean;
    base_unit_id?: string;
    conversion_factor?: number;
    decimal_places?: number;
    is_active?: boolean;
}

// ============================================================================
// REQUEST TYPES - CATEGORY
// ============================================================================

export interface CreateCategoryRequest {
    name: string;
    code?: string;
    description?: string;
    parent_id?: string;
    sort_order?: number;
    icon?: string;
    image_url?: string;
    is_leaf?: boolean;
    metadata?: Record<string, unknown>;
}

export interface UpdateCategoryRequest {
    name?: string;
    code?: string;
    description?: string;
    parent_id?: string;
    sort_order?: number;
    icon?: string;
    image_url?: string;
    is_active?: boolean;
    is_leaf?: boolean;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// REQUEST TYPES - PRODUCT
// ============================================================================

export interface CreateProductRequest {
    product_code: string;
    name: string;
    barcode?: string;
    alternate_barcodes?: string[];
    description?: string;
    short_description?: string;

    category_id?: string;
    brand?: string;
    model?: string;

    hsn_code?: string;
    gst_percentage: number;
    cess_percentage?: number;

    mrp: number;
    selling_price: number;
    purchase_price?: number;

    unit_id?: string;

    minimum_stock?: number;
    reorder_level?: number;
    is_batch_tracked?: boolean;
    is_taxable?: boolean;
    primary_image?: string;
}

export interface UpdateProductRequest {
    product_code?: string;
    name?: string;
    barcode?: string;
    alternate_barcodes?: string[];
    description?: string;
    short_description?: string;

    category_id?: string;
    brand?: string;
    model?: string;

    hsn_code?: string;
    gst_percentage?: number;
    cess_percentage?: number;

    mrp?: number;
    selling_price?: number;
    purchase_price?: number;

    unit_id?: string;

    minimum_stock?: number;
    reorder_level?: number;
    is_batch_tracked?: boolean;
    is_active?: boolean;
    is_taxable?: boolean;
    primary_image?: string;
}

// ============================================================================
// REQUEST TYPES - PRODUCT BARCODE
// ============================================================================

export interface CreateProductBarcodeRequest {
    product_id: string;
    barcode: string;
    barcode_type?: BarcodeType;
    price_type?: PriceType;
    is_primary?: boolean;
}

export interface UpdateProductBarcodeRequest {
    barcode?: string;
    barcode_type?: BarcodeType;
    price_type?: PriceType;
    is_primary?: boolean;
    is_active?: boolean;
}

// ============================================================================
// REQUEST TYPES - PRODUCT VARIANT
// ============================================================================

export interface CreateProductVariantRequest {
    product_id: string;
    variant_code: string;
    barcode?: string;
    name?: string;
    attributes: Record<string, string>;
    mrp?: number;
    selling_price?: number;
    is_default?: boolean;
    image_url?: string;
}

export interface UpdateProductVariantRequest {
    variant_code?: string;
    barcode?: string;
    name?: string;
    attributes?: Record<string, string>;
    mrp?: number;
    selling_price?: number;
    is_active?: boolean;
    is_default?: boolean;
    image_url?: string;
}

// ============================================================================
// REQUEST TYPES - INVENTORY
// ============================================================================

export interface StockAdjustmentRequest {
    product_id: string;
    variant_id?: string;
    transaction_type: TransactionType;
    quantity: number;
    unit_cost?: number;
    reason?: string;
    reference_type?: ReferenceType;
    reference_id?: string;
    reference_number?: string;
    batch_number?: string;
    serial_number?: string;
    expiry_date?: string;
    manufacturing_date?: string;
    from_location?: string;
    to_location?: string;
    notes?: string;
}

export interface UpdateInventoryRequest {
    reorder_point?: number;
    maximum_stock?: number;
    location?: string;
    warehouse?: string;
    is_active?: boolean;
}

// ============================================================================
// REQUEST TYPES - PRODUCT BATCH
// ============================================================================

export interface CreateProductBatchRequest {
    product_id: string;
    batch_number: string;
    manufacturing_date?: string;
    expiry_date: string;
    mrp?: number;
    initial_quantity: number;
    current_quantity: number;
    purchase_date?: string;
    purchase_price?: number;
    supplier_id?: string;
    purchase_invoice?: string;
}

export interface UpdateProductBatchRequest {
    manufacturing_date?: string;
    expiry_date?: string;
    mrp?: number;
    current_quantity?: number;
    purchase_price?: number;
    is_active?: boolean;
}

// ============================================================================
// REQUEST TYPES - SUPPLIER PRODUCT
// ============================================================================

export interface CreateSupplierProductRequest {
    supplier_id: string;
    product_id: string;
    supplier_product_code?: string;
    supplier_product_name?: string;
    purchase_price: number;
    mrp?: number;
    discount_percentage?: number;
    lead_time_days?: number;
    minimum_order_quantity?: number;
    is_preferred?: boolean;
}

export interface UpdateSupplierProductRequest {
    supplier_product_code?: string;
    supplier_product_name?: string;
    purchase_price?: number;
    mrp?: number;
    discount_percentage?: number;
    lead_time_days?: number;
    minimum_order_quantity?: number;
    is_preferred?: boolean;
    is_active?: boolean;
}

// ============================================================================
// REQUEST TYPES - STOCK ALERT
// ============================================================================

export interface ResolveStockAlertRequest {
    resolution_notes?: string;
}

// ============================================================================
// FILTERS, PAGINATION, LIST RESPONSE
// ============================================================================

export interface ProductFilters {
    search?: string;
    category_id?: string;
    brand?: string;
    is_active?: boolean;
    is_batch_tracked?: boolean;
    is_taxable?: boolean;
    gst_percentage?: number;
    min_price?: number;
    max_price?: number;
    min_stock?: number;
    max_stock?: number;
    has_barcode?: boolean;
    low_stock_only?: boolean;
}

export interface ProductPagination {
    page: number;
    limit: number;
    sort_by: ProductSortField;
    sort_order: "asc" | "desc";
}

export type ProductSortField =
    | "product_code"
    | "name"
    | "mrp"
    | "selling_price"
    | "purchase_price"
    | "category_id"
    | "brand"
    | "created_at"
    | "updated_at";

export interface ProductListResponse {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface InventoryFilters {
    search?: string;
    product_id?: string;
    warehouse?: string;
    location?: string;
    low_stock_only?: boolean;
    out_of_stock_only?: boolean;
    is_active?: boolean;
}

export interface InventoryTransactionFilters {
    product_id?: string;
    variant_id?: string;
    transaction_type?: TransactionType;
    reference_type?: ReferenceType;
    date_from?: string;
    date_to?: string;
}

export interface StockAlertFilters {
    alert_type?: AlertType;
    severity?: AlertSeverity;
    is_resolved?: boolean;
}

export interface CategoryFilters {
    search?: string;
    parent_id?: string | null;
    is_active?: boolean;
    level?: number;
}

// ============================================================================
// STATS / DASHBOARD
// ============================================================================

export interface ProductDashboardStats {
    total_products: number;
    active_products: number;
    inactive_products: number;
    total_categories: number;
    total_brands: number;
    total_inventory_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
    expiring_soon_count: number;
    unresolved_alerts: number;
    products_by_category: Array<{ category_name: string; count: number }>;
    products_by_gst: Array<{ gst_percentage: number; count: number }>;
}

export interface InventorySummary {
    total_items: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
    overstock_items: number;
    in_transit_items: number;
}
