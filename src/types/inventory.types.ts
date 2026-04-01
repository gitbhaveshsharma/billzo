// ============================================================================
// INVENTORY TYPES - Inventory management types
// Aligned with: supabase/migrations/5_inventory_supplier.sql (tables 24-29)
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS (matching DB constraints)
// ============================================================================

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

export const PRICE_TYPES = [
    "PURCHASE",
    "SELLING",
    "MRP",
] as const;

export type PriceType = (typeof PRICE_TYPES)[number];

export const REFERENCE_TYPES = [
    "purchase_order",
    "sales_invoice",
    "stock_adjustment",
    "stock_transfer",
    "purchase_return",
    "sales_return",
    "damage_entry",
    "expiry_entry",
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const UNIT_CATEGORIES = [
    "weight",
    "quantity",
    "volume",
    "length",
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

// ============================================================================
// INVENTORY - matches `inventory` table
// ============================================================================

export interface InventoryRecord {
    id: string;
    store_id: string;
    product_id: string;
    variant_id: string | null;

    // Stock Quantities
    quantity_on_hand: number;
    quantity_committed: number;
    quantity_available: number; // Generated column: on_hand - committed
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
    total_value: number | null; // Generated column: on_hand * average_cost

    // Status
    is_active: boolean;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// INVENTORY TRANSACTION - matches `inventory_transactions` table
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
// PRODUCT BATCH - matches `product_batches` table
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
// STOCK ALERT - matches `stock_alerts` table
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
// PRICE HISTORY - matches `price_history` table
// ============================================================================

export interface PriceHistory {
    id: string;
    store_id: string;
    product_id: string;
    variant_id: string | null;

    // Price Change
    price_type: PriceType;
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
// ENRICHED TYPES (with related data for UI display)
// ============================================================================

export interface EnrichedInventoryRecord extends InventoryRecord {
    product?: {
        id: string;
        name: string;
        product_code: string;
        barcode: string | null;
        hsn_code: string | null;
        category_id: string | null;
        brand: string | null;
        mrp: number;
        selling_price: number;
        purchase_price: number | null;
        minimum_stock: number;
        reorder_level: number;
        is_batch_tracked: boolean;
        primary_image: string | null;
        unit_id: string | null;
    };
    variant?: {
        id: string;
        variant_code: string;
        name: string | null;
        barcode: string | null;
        attributes: Record<string, unknown>;
    } | null;
    unit?: {
        id: string;
        name: string;
        code: string;
        symbol: string | null;
    } | null;
}

export interface EnrichedInventoryTransaction extends InventoryTransaction {
    product?: {
        id: string;
        name: string;
        product_code: string;
        barcode: string | null;
    };
    variant?: {
        id: string;
        variant_code: string;
        name: string | null;
    } | null;
}

export interface EnrichedStockAlert extends StockAlert {
    product?: {
        id: string;
        name: string;
        product_code: string;
    } | null;
    batch?: {
        id: string;
        batch_number: string;
        expiry_date: string;
    } | null;
    /** Live current quantity from the inventory table (fetched at query time — NOT the snapshot) */
    live_quantity?: number | null;
    /** Live reorder point from the inventory table */
    live_reorder_point?: number | null;
}

export interface EnrichedProductBatch extends ProductBatch {
    product?: {
        id: string;
        name: string;
        product_code: string;
    };
    supplier?: {
        id: string;
        name: string;
        supplier_code: string;
    } | null;
}

// ============================================================================
// REQUEST TYPES - STOCK ADJUSTMENT
// ============================================================================

export interface CreateStockAdjustmentRequest {
    product_id: string;
    variant_id?: string;
    adjustment_type: "ADJUSTMENT" | "DAMAGE" | "EXPIRY";
    new_quantity?: number; // For ADJUSTMENT: absolute quantity
    quantity: number; // For DAMAGE/EXPIRY: quantity to reduce
    unit_cost?: number;
    reason: string;
    batch_number?: string;
    serial_number?: string;
    expiry_date?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// REQUEST TYPES - STOCK TRANSFER
// ============================================================================

export interface CreateStockTransferRequest {
    product_id: string;
    variant_id?: string;
    quantity: number;
    from_location: string;
    to_location: string;
    unit_cost?: number;
    batch_number?: string;
    reason?: string;
    notes?: string;
}

// ============================================================================
// REQUEST TYPES - INVENTORY RECORD UPDATE
// ============================================================================

export interface UpdateInventoryRecordRequest {
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
// REQUEST TYPES - STOCK ALERT
// ============================================================================

export interface ResolveStockAlertRequest {
    resolution_notes: string;
}

// ============================================================================
// REQUEST TYPES - STOCK COUNT / PHYSICAL AUDIT
// ============================================================================

export interface StockCountItem {
    inventory_id: string;
    product_id: string;
    variant_id?: string;
    counted_quantity: number;
    notes?: string;
}

export interface StockCountRequest {
    items: StockCountItem[];
    notes?: string;
}

// ============================================================================
// FILTERS & PAGINATION
// ============================================================================

export interface InventoryFilters {
    search?: string;
    category_id?: string;
    warehouse?: string;
    location?: string;
    is_active?: boolean;
    low_stock_only?: boolean;
    out_of_stock_only?: boolean;
    overstock_only?: boolean;
    has_variant?: boolean;
    min_quantity?: number;
    max_quantity?: number;
}

export interface InventoryPagination {
    page: number;
    limit: number;
    sort_by: InventorySortField;
    sort_order: "asc" | "desc";
}

export type InventorySortField =
    | "product_name"
    | "product_code"
    | "quantity_on_hand"
    | "quantity_available"
    | "average_cost"
    | "total_value"
    | "reorder_point"
    | "last_updated_at"
    | "created_at";

export interface TransactionFilters {
    search?: string;
    transaction_type?: TransactionType;
    product_id?: string;
    variant_id?: string;
    reference_type?: ReferenceType;
    date_from?: string;
    date_to?: string;
    performed_by?: string;
    batch_number?: string;
}

export interface TransactionPagination {
    page: number;
    limit: number;
    sort_by: TransactionSortField;
    sort_order: "asc" | "desc";
}

export type TransactionSortField =
    | "transaction_date"
    | "quantity"
    | "total_cost"
    | "transaction_type"
    | "created_at";

export interface BatchFilters {
    search?: string;
    product_id?: string;
    supplier_id?: string;
    is_active?: boolean;
    expiring_within_days?: number;
    expired_only?: boolean;
}

export interface AlertFilters {
    alert_type?: AlertType;
    severity?: AlertSeverity;
    is_resolved?: boolean;
    product_id?: string;
}

// ============================================================================
// LIST RESPONSE TYPES
// ============================================================================

export interface InventoryListResponse {
    items: EnrichedInventoryRecord[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface TransactionListResponse {
    transactions: EnrichedInventoryTransaction[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface BatchListResponse {
    batches: EnrichedProductBatch[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// ============================================================================
// DASHBOARD / STATS
// ============================================================================

export interface InventoryDashboardStats {
    total_products: number;
    total_stock_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
    overstock_count: number;
    expiring_soon_count: number;
    expired_count: number;
    unresolved_alerts_count: number;
    total_transactions_today: number;
    total_adjustments_this_month: number;
    top_moving_products: Array<{
        product_id: string;
        product_name: string;
        total_quantity_moved: number;
    }>;
    stock_value_by_category: Array<{
        category_id: string | null;
        category_name: string;
        total_value: number;
        item_count: number;
    }>;
}

export interface InventoryValuationSummary {
    total_items: number;
    total_quantity: number;
    total_value: number;
    average_cost_per_unit: number;
    highest_value_product: {
        product_id: string;
        product_name: string;
        total_value: number;
    } | null;
}

// ============================================================================
// MOVEMENT SUMMARY (for reports)
// ============================================================================

export interface StockMovementSummary {
    product_id: string;
    product_name: string;
    product_code: string;
    opening_stock: number;
    purchases: number;
    sales: number;
    returns: number;
    adjustments: number;
    transfers_in: number;
    transfers_out: number;
    damages: number;
    expired: number;
    closing_stock: number;
}
