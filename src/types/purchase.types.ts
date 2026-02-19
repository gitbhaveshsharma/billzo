// ============================================================================
// PURCHASE TYPES - Purchase Order management types
// Aligned with: supabase/migrations/6_purchase_orders.sql (tables 30-34)
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS (matching DB constraints)
// ============================================================================

export const PURCHASE_ORDER_STATUSES = [
    "draft",
    "confirmed",
    "partially_received",
    "received",
    "cancelled",
    "returned",
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
    "unpaid",
    "partially_paid",
    "paid",
    "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
    "cash",
    "bank_transfer",
    "cheque",
    "upi",
    "credit_note",
    "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PURCHASE_PAYMENT_STATUSES = [
    "completed",
    "pending",
    "failed",
    "cancelled",
] as const;

export type PurchasePaymentStatus = (typeof PURCHASE_PAYMENT_STATUSES)[number];

export const PO_ITEM_STATUSES = [
    "pending",
    "partially_received",
    "received",
    "cancelled",
    "returned",
] as const;

export type POItemStatus = (typeof PO_ITEM_STATUSES)[number];

export const RETURN_STATUSES = [
    "draft",
    "confirmed",
    "completed",
    "cancelled",
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const REFUND_STATUSES = [
    "pending",
    "refunded",
    "credit_note",
    "adjusted",
] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const RETURN_REASONS = [
    "damaged",
    "expired",
    "wrong_product",
    "quality_issue",
    "excess_stock",
    "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

// ============================================================================
// PURCHASE ORDER - matches `purchase_orders` table
// ============================================================================

export interface PurchaseOrder {
    id: string;
    store_id: string;

    // Identification
    po_number: string;
    invoice_number: string | null;
    reference_number: string | null;

    // Supplier
    supplier_id: string;
    supplier_name: string;
    supplier_gstin: string | null;

    // Dates
    order_date: string;
    expected_delivery_date: string | null;
    received_date: string | null;
    invoice_date: string | null;

    // Status
    status: PurchaseOrderStatus;

    // Amounts
    subtotal: number;
    discount_amount: number;
    discount_percentage: number;

    // Tax (GST)
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    total_tax: number;

    // Additional charges
    shipping_charges: number;
    other_charges: number;
    round_off: number;

    // Grand total
    grand_total: number;

    // Payment
    payment_status: PaymentStatus;
    paid_amount: number;
    due_amount: number;
    payment_due_date: string | null;

    // GST type
    is_inter_state: boolean;
    place_of_supply: string | null;

    // Warehouse
    receiving_warehouse: string | null;
    receiving_notes: string | null;

    // Approval
    approved_by: string | null;
    approved_at: string | null;

    // Cancellation
    cancelled_by: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;

    // Metadata
    notes: string | null;
    terms_and_conditions: string | null;
    internal_notes: string | null;
    tags: string[] | null;
    metadata: Record<string, unknown>;
    attachment_urls: string[] | null;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
    updated_by: string | null;
}

// ============================================================================
// PURCHASE ORDER ITEM - matches `purchase_order_items` table
// ============================================================================

export interface PurchaseOrderItem {
    id: string;
    purchase_order_id: string;
    store_id: string;

    // Product
    product_id: string;
    variant_id: string | null;
    product_name: string;
    product_code: string;
    barcode: string | null;
    hsn_code: string | null;

    // Unit
    unit_id: string | null;
    unit_code: string | null;

    // Quantities
    ordered_quantity: number;
    received_quantity: number;
    returned_quantity: number;
    pending_quantity: number;

    // Pricing
    unit_price: number;
    mrp: number | null;

    // Discount
    discount_percentage: number;
    discount_amount: number;

    // Line total
    line_total: number;

    // Tax
    gst_percentage: number;
    cgst_percentage: number;
    sgst_percentage: number;
    igst_percentage: number;
    cess_percentage: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    tax_amount: number;

    // Total
    total_amount: number;

    // Batch
    batch_number: string | null;
    manufacturing_date: string | null;
    expiry_date: string | null;

    // Status
    item_status: POItemStatus;

    // Notes
    notes: string | null;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// PURCHASE PAYMENT - matches `purchase_payments` table
// ============================================================================

export interface PurchasePayment {
    id: string;
    purchase_order_id: string;
    store_id: string;

    // Payment
    payment_number: string;
    payment_date: string;
    amount: number;

    // Method
    payment_method: PaymentMethod;
    transaction_reference: string | null;
    bank_name: string | null;
    cheque_number: string | null;
    cheque_date: string | null;

    // Status
    status: PurchasePaymentStatus;

    // Notes
    notes: string | null;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// PURCHASE RETURN - matches `purchase_returns` table
// ============================================================================

export interface PurchaseReturn {
    id: string;
    purchase_order_id: string;
    store_id: string;

    // Identification
    return_number: string;
    debit_note_number: string | null;

    // Supplier
    supplier_id: string;
    supplier_name: string;

    // Dates
    return_date: string;

    // Amounts
    subtotal: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    total_tax: number;
    grand_total: number;

    // Status
    status: ReturnStatus;

    // Reason
    reason: string;

    // Refund
    refund_status: RefundStatus;
    refund_amount: number;

    // Notes
    notes: string | null;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// PURCHASE RETURN ITEM - matches `purchase_return_items` table
// ============================================================================

export interface PurchaseReturnItem {
    id: string;
    purchase_return_id: string;
    purchase_order_item_id: string | null;
    store_id: string;

    // Product
    product_id: string;
    variant_id: string | null;
    product_name: string;
    product_code: string;
    hsn_code: string | null;

    // Quantities
    return_quantity: number;
    unit_price: number;

    // Tax
    gst_percentage: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    tax_amount: number;

    // Totals
    line_total: number;
    total_amount: number;

    // Batch
    batch_number: string | null;

    // Reason
    reason: string | null;

    // System fields
    created_at: string;
}

// ============================================================================
// ENRICHED TYPES (with related data)
// ============================================================================

export interface EnrichedPurchaseOrder extends PurchaseOrder {
    items: PurchaseOrderItem[];
    payments: PurchasePayment[];
    returns: PurchaseReturn[];
    supplier?: {
        id: string;
        name: string;
        supplier_code: string;
        gstin: string | null;
        phone: string | null;
        email: string | null;
    };
}

// ============================================================================
// REQUEST TYPES - CREATE PURCHASE ORDER
// ============================================================================

export interface CreatePurchaseOrderRequest {
    // Required
    supplier_id: string;
    supplier_name: string;
    order_date: string;

    // Optional header
    supplier_gstin?: string;
    invoice_number?: string;
    reference_number?: string;
    expected_delivery_date?: string;
    invoice_date?: string;

    // Discount
    discount_amount?: number;
    discount_percentage?: number;

    // Charges
    shipping_charges?: number;
    other_charges?: number;
    round_off?: number;

    // GST
    is_inter_state?: boolean;
    place_of_supply?: string;

    // Warehouse
    receiving_warehouse?: string;

    // Metadata
    notes?: string;
    terms_and_conditions?: string;
    internal_notes?: string;
    tags?: string[];

    // Items
    items: CreatePurchaseOrderItemRequest[];
}

export interface UpdatePurchaseOrderRequest {
    invoice_number?: string;
    reference_number?: string;
    expected_delivery_date?: string;
    invoice_date?: string;

    discount_amount?: number;
    discount_percentage?: number;
    shipping_charges?: number;
    other_charges?: number;
    round_off?: number;

    is_inter_state?: boolean;
    place_of_supply?: string;

    receiving_warehouse?: string;
    receiving_notes?: string;
    payment_due_date?: string;

    notes?: string;
    terms_and_conditions?: string;
    internal_notes?: string;
    tags?: string[];
}

// ============================================================================
// REQUEST TYPES - PURCHASE ORDER ITEMS
// ============================================================================

export interface CreatePurchaseOrderItemRequest {
    product_id: string;
    variant_id?: string;
    product_name: string;
    product_code: string;
    barcode?: string;
    hsn_code?: string;

    unit_id?: string;
    unit_code?: string;

    ordered_quantity: number;
    unit_price: number;
    mrp?: number;

    discount_percentage?: number;
    discount_amount?: number;

    gst_percentage: number;
    cess_percentage?: number;

    batch_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;

    notes?: string;
}

export interface UpdatePurchaseOrderItemRequest {
    ordered_quantity?: number;
    unit_price?: number;
    mrp?: number;
    discount_percentage?: number;
    discount_amount?: number;
    gst_percentage?: number;
    cess_percentage?: number;
    batch_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    notes?: string;
}

export interface ReceiveItemRequest {
    item_id: string;
    received_quantity: number;
    batch_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    notes?: string;
}

// ============================================================================
// REQUEST TYPES - PURCHASE PAYMENT
// ============================================================================

export interface CreatePurchasePaymentRequest {
    payment_date: string;
    amount: number;
    payment_method: PaymentMethod;
    transaction_reference?: string;
    bank_name?: string;
    cheque_number?: string;
    cheque_date?: string;
    notes?: string;
}

// ============================================================================
// REQUEST TYPES - PURCHASE RETURN
// ============================================================================

export interface CreatePurchaseReturnRequest {
    purchase_order_id: string;
    supplier_id: string;
    supplier_name: string;
    return_date: string;
    reason: string;
    debit_note_number?: string;
    notes?: string;
    items: CreatePurchaseReturnItemRequest[];
}

export interface CreatePurchaseReturnItemRequest {
    purchase_order_item_id?: string;
    product_id: string;
    variant_id?: string;
    product_name: string;
    product_code: string;
    hsn_code?: string;
    return_quantity: number;
    unit_price: number;
    gst_percentage: number;
    cess_percentage?: number;
    batch_number?: string;
    reason?: string;
}

// ============================================================================
// FILTERS, PAGINATION, LIST RESPONSE
// ============================================================================

export interface PurchaseOrderFilters {
    search?: string;
    status?: PurchaseOrderStatus;
    payment_status?: PaymentStatus;
    supplier_id?: string;
    date_from?: string;
    date_to?: string;
    is_inter_state?: boolean;
    min_amount?: number;
    max_amount?: number;
    has_invoice?: boolean;
    tags?: string[];
}

export interface PurchaseOrderPagination {
    page: number;
    limit: number;
    sort_by: PurchaseOrderSortField;
    sort_order: "asc" | "desc";
}

export type PurchaseOrderSortField =
    | "po_number"
    | "order_date"
    | "grand_total"
    | "supplier_name"
    | "status"
    | "payment_status"
    | "created_at"
    | "updated_at";

export interface PurchaseOrderListResponse {
    orders: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// ============================================================================
// STATS / DASHBOARD
// ============================================================================

export interface PurchaseDashboardStats {
    total_orders: number;
    draft_orders: number;
    confirmed_orders: number;
    received_orders: number;
    cancelled_orders: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
    unpaid_orders: number;
    this_month_total: number;
    this_month_count: number;
    overdue_payments: number;
}

export interface SupplierPurchaseSummary {
    total_orders: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    last_order_date: string | null;
    average_order_value: number;
    return_count: number;
}

// ============================================================================
// STATUS CHANGE REQUEST
// ============================================================================

export interface ConfirmPurchaseOrderRequest {
    approved_by?: string;
}

export interface CancelPurchaseOrderRequest {
    cancellation_reason: string;
}
