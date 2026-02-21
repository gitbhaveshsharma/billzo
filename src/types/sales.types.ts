// ============================================================================
// SALES TYPES - POS Billing, Sale Items, Payments, Returns, Invoice Sequences
// Aligned with: supabase/migrations/7_point-of-sale.sql (tables 32-36, 38)
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS (matching DB enums / constraints)
// ============================================================================

/** Sale lifecycle — matches `sale_status` DB enum */
export const SALE_STATUSES = [
    "DRAFT",
    "HOLD",
    "COMPLETED",
    "CANCELLED",
    "PARTIAL_RETURN",
    "FULLY_RETURNED",
    "CREDIT",
    "PARTIAL_PAID",
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

/** Payment methods accepted at POS — matches `payment_method` DB enum */
export const PAYMENT_METHODS = [
    "CASH",
    "CARD_CREDIT",
    "CARD_DEBIT",
    "UPI",
    "NET_BANKING",
    "WALLET",
    "CHEQUE",
    "NEFT_RTGS",
    "CREDIT_NOTE",
    "LOYALTY_POINTS",
    "EMI",
    "GIFT_CARD",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Return lifecycle — matches `return_status` DB enum */
export const RETURN_STATUSES = [
    "INITIATED",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "REFUND_PENDING",
    "REFUND_COMPLETED",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** Discount types — matches `discount_type` DB enum */
export const DISCOUNT_TYPES = [
    "PERCENTAGE",
    "FLAT_AMOUNT",
    "BUY_X_GET_Y",
    "COMBO",
    "LOYALTY",
    "MANUAL",
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** Payment record status */
export const PAYMENT_RECORD_STATUSES = [
    "SUCCESS",
    "FAILED",
    "PENDING",
    "REVERSED",
] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

/** Cheque statuses */
export const CHEQUE_STATUSES = ["pending", "cleared", "bounced"] as const;
export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

/** GST types for invoice */
export const GST_TYPES = ["B2C", "B2B", "export"] as const;
export type GstType = (typeof GST_TYPES)[number];

/** Supply type */
export const SUPPLY_TYPES = ["intra", "inter", "export"] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];

/** Invoice sequence types */
export const SEQUENCE_TYPES = [
    "INVOICE",
    "RETURN",
    "CREDIT_NOTE",
    "QUOTATION",
] as const;
export type SequenceType = (typeof SEQUENCE_TYPES)[number];

/** Restock condition for returns */
export const RESTOCK_CONDITIONS = ["good", "damaged", "expired"] as const;
export type RestockCondition = (typeof RESTOCK_CONDITIONS)[number];

/** Reference types for sale origin */
export const REFERENCE_TYPES = [
    "quotation",
    "hold_bill",
    "purchase_order",
] as const;
export type SaleReferenceType = (typeof REFERENCE_TYPES)[number];

/** Sort fields for sale list */
export const SALE_SORT_FIELDS = [
    "sale_date",
    "sale_time",
    "invoice_number",
    "total_amount",
    "paid_amount",
    "due_amount",
    "status",
    "created_at",
] as const;
export type SaleSortField = (typeof SALE_SORT_FIELDS)[number];

/** Sort fields for returns list */
export const RETURN_SORT_FIELDS = [
    "return_date",
    "return_number",
    "total_returned",
    "status",
    "created_at",
] as const;
export type ReturnSortField = (typeof RETURN_SORT_FIELDS)[number];

// ============================================================================
// SALE — matches `sales` table (table 32)
// ============================================================================

export interface Sale {
    id: string;
    store_id: string;
    invoice_number: string;

    // Shift & Staff
    shift_id: string | null;
    cashier_id: string;
    salesperson_id: string | null;

    // Customer snapshot
    customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_gstin: string | null;

    // Timing
    sale_date: string; // DATE
    sale_time: string; // TIMESTAMPTZ

    // GST context
    is_interstate: boolean;
    gst_type: GstType;
    supply_type: SupplyType;

    // Totals
    subtotal: number;
    item_discount_total: number;
    bill_discount_amount: number;
    bill_discount_percentage: number;
    discount_total: number;
    taxable_amount: number;

    // Tax breakdown
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    tax_amount: number;

    // Final amounts
    gross_total: number;
    round_off: number;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    change_amount: number;

    // Loyalty
    loyalty_points_earned: number;
    loyalty_points_redeemed: number;
    loyalty_discount_amount: number;

    // Status
    status: SaleStatus;

    // Credit
    is_credit_sale: boolean;
    credit_due_date: string | null;

    // Notes
    notes: string | null;
    internal_notes: string | null;
    tags: string[] | null;

    // Receipt tracking
    receipt_printed: boolean;
    receipt_printed_at: string | null;
    receipt_print_count: number;
    email_sent: boolean;
    sms_sent: boolean;
    whatsapp_sent: boolean;

    // Cancellation
    cancelled_at: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;

    // Reference (hold bill, quotation)
    reference_type: SaleReferenceType | null;
    reference_id: string | null;
    reference_number: string | null;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// SALE ITEM — matches `sale_items` table (table 33)
// ============================================================================

export interface SaleItem {
    id: string;
    sale_id: string;
    store_id: string;

    // Product reference
    product_id: string;
    variant_id: string | null;
    batch_id: string | null;

    // Product snapshot
    product_name: string;
    product_code: string;
    barcode: string | null;
    hsn_code: string | null;
    unit_name: string | null;

    // Quantities
    quantity: number;
    returned_quantity: number;
    net_quantity: number; // GENERATED: quantity - returned_quantity

    // Pricing
    mrp: number;
    unit_price: number;
    unit_cost: number | null;

    // Discount
    discount_type: DiscountType;
    discount_percentage: number;
    discount_amount: number;
    price_after_discount: number;

    // Subtotals
    subtotal: number;
    discount_total: number;
    taxable_amount: number;

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

    // Totals
    total_amount: number;
    total_cost: number | null;
    profit_amount: number | null;
    profit_percentage: number | null;

    // Flags
    is_returned: boolean;
    is_void: boolean;
    serial_numbers: string[] | null;
    sort_order: number;

    // System
    created_at: string;
    updated_at: string;
}

// ============================================================================
// SALE PAYMENT — matches `sale_payments` table (table 34)
// ============================================================================

export interface SalePayment {
    id: string;
    sale_id: string;
    store_id: string;

    // Payment info
    payment_method: PaymentMethod;
    amount: number;

    // Cash specific
    cash_tendered: number | null;
    change_returned: number | null;

    // Card specific
    card_last_four: string | null;
    card_type: string | null;
    card_bank: string | null;
    authorization_code: string | null;
    terminal_id: string | null;

    // UPI specific
    upi_id: string | null;
    upi_ref_number: string | null;

    // Wallet specific
    wallet_name: string | null;

    // Bank transfer
    bank_reference: string | null;
    bank_name: string | null;
    transaction_id: string | null;

    // Cheque specific
    cheque_number: string | null;
    cheque_bank: string | null;
    cheque_date: string | null;
    cheque_status: ChequeStatus | null;

    // Gift card
    gift_card_code: string | null;
    gift_card_id: string | null;

    // Credit note
    credit_note_id: string | null;

    // Status
    status: PaymentRecordStatus;
    payment_at: string;

    // Gateway
    gateway_transaction_id: string | null;
    gateway_response: Record<string, unknown> | null;

    // Notes
    notes: string | null;

    // System
    created_at: string;
    created_by: string | null;
}

// ============================================================================
// SALE RETURN — matches `sale_returns` table (table 35)
// ============================================================================

export interface SaleReturn {
    id: string;
    store_id: string;
    sale_id: string;

    // Identity
    original_invoice_number: string;
    return_number: string;

    // Staff
    processed_by: string;
    shift_id: string | null;

    // Customer
    customer_id: string | null;
    customer_name: string | null;

    // Return details
    return_reason: string;
    return_notes: string | null;

    // Totals
    subtotal_returned: number;
    tax_returned: number;
    cgst_returned: number;
    sgst_returned: number;
    igst_returned: number;
    total_returned: number;

    // Refund
    refund_method: PaymentMethod | null;
    refund_amount: number;
    refund_reference: string | null;

    // Credit note
    credit_note_issued: boolean;
    credit_note_amount: number;
    credit_note_number: string | null;

    // Status
    status: ReturnStatus;

    // Approval
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;

    // Timing
    return_date: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// SALE RETURN ITEM — matches `sale_return_items` table (table 36)
// ============================================================================

export interface SaleReturnItem {
    id: string;
    return_id: string;
    sale_item_id: string;
    store_id: string;

    // Product
    product_id: string;
    variant_id: string | null;
    batch_id: string | null;
    product_name: string;
    product_code: string;

    // Pricing
    unit_price: number;
    unit_cost: number | null;
    return_quantity: number;

    // Return details
    item_return_reason: string | null;
    restock: boolean;
    restock_condition: RestockCondition;

    // Amounts
    subtotal: number;
    discount_amount: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    tax_amount: number;
    total_amount: number;

    // System
    created_at: string;
}

// ============================================================================
// INVOICE SEQUENCE — matches `invoice_sequences` table (table 38)
// ============================================================================

export interface InvoiceSequence {
    id: string;
    store_id: string;
    sequence_type: SequenceType;
    prefix: string;
    current_number: number;
    financial_year: string;
    last_generated_at: string | null;
}

// ============================================================================
// VIEWS
// ============================================================================

/** Matches `v_sales_summary` view */
export interface SaleSummaryView {
    id: string;
    store_id: string;
    invoice_number: string;
    sale_date: string;
    sale_time: string;
    status: SaleStatus;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    tax_amount: number;
    discount_total: number;
    is_credit_sale: boolean;
    customer_name: string | null;
    customer_phone: string | null;
    customer_type: string | null;
    cashier_name: string | null;
    shift_date: string | null;
    terminal_name: string | null;
    item_count: number;
    total_quantity: number;
}

/** Matches `v_product_sales_report` view */
export interface ProductSalesReport {
    store_id: string;
    product_id: string;
    product_name: string;
    product_code: string;
    sale_date: string;
    total_quantity_sold: number;
    total_returned: number;
    net_quantity_sold: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    profit_percentage: number;
    transaction_count: number;
}

// ============================================================================
// ENRICHED / COMPOSITE TYPES
// ============================================================================

/** Sale with all related data for detail view */
export interface EnrichedSale extends Sale {
    items: SaleItem[];
    payments: SalePayment[];
    returns: SaleReturn[];
    cashier_name: string | null;
    salesperson_name: string | null;
}

/** Return with its items */
export interface EnrichedSaleReturn extends SaleReturn {
    items: SaleReturnItem[];
}

// ============================================================================
// COMPLETE SALE RPC RESPONSE
// ============================================================================

/** Response from `complete_sale()` RPC function */
export interface CompleteSaleResult {
    success: boolean;
    error?: string;
    invoice_number?: string;
    total_paid?: number;
    status?: SaleStatus;
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface SalesDashboardStats {
    // Today's sales
    today_sales_count: number;
    today_sales_amount: number;
    today_returns_count: number;
    today_returns_amount: number;
    today_discount_total: number;
    today_tax_total: number;

    // Payment breakdown (today)
    today_cash: number;
    today_card: number;
    today_upi: number;
    today_other: number;

    // Credit
    today_credit_sales: number;
    today_credit_amount: number;
    total_outstanding: number;

    // Averages
    average_bill_value: number;
    average_items_per_bill: number;

    // Hold bills
    hold_bills_count: number;

    // Top products today
    top_products: Array<{
        product_name: string;
        product_code: string;
        quantity_sold: number;
        revenue: number;
    }>;
}

// ============================================================================
// CART TYPES (for POS billing flow)
// ============================================================================

/** A single item in the POS cart before it becomes a SaleItem */
export interface CartItem {
    /** Unique cart row key (product_id + variant_id + batch_id) */
    cart_key: string;
    product_id: string;
    variant_id: string | null;
    batch_id: string | null;
    product_name: string;
    product_code: string;
    barcode: string | null;
    hsn_code: string | null;
    unit_name: string | null;
    mrp: number;
    unit_price: number;
    unit_cost: number | null;
    gst_percentage: number;
    cess_percentage: number;
    quantity: number;
    /** Per-item discount */
    discount_type: DiscountType;
    discount_percentage: number;
    discount_amount: number;
    serial_numbers: string[];
    sort_order: number;
}

/** Hold bill — saved cart state */
export interface HoldBill {
    id: string;
    customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    items: CartItem[];
    notes: string | null;
    held_at: string;
    cashier_id: string;
    reference_number: string | null;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/** Add an item to a sale / build cart item for server */
export interface CreateSaleItemRequest {
    product_id: string;
    variant_id?: string;
    batch_id?: string;
    product_name: string;
    product_code: string;
    barcode?: string;
    hsn_code?: string;
    unit_name?: string;
    quantity: number;
    mrp: number;
    unit_price: number;
    unit_cost?: number;
    discount_type?: DiscountType;
    discount_percentage?: number;
    discount_amount?: number;
    gst_percentage?: number;
    cess_percentage?: number;
    serial_numbers?: string[];
    sort_order?: number;
}

/** Create a new sale (DRAFT → then complete) */
export interface CreateSaleRequest {
    shift_id?: string;
    customer_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_gstin?: string;
    is_interstate?: boolean;
    gst_type?: GstType;
    supply_type?: SupplyType;
    bill_discount_percentage?: number;
    bill_discount_amount?: number;
    is_credit_sale?: boolean;
    credit_due_date?: string;
    notes?: string;
    internal_notes?: string;
    tags?: string[];
    reference_type?: SaleReferenceType;
    reference_id?: string;
    reference_number?: string;
    items: CreateSaleItemRequest[];
}

/** Add a payment to a sale */
export interface CreateSalePaymentRequest {
    payment_method: PaymentMethod;
    amount: number;
    // Cash
    cash_tendered?: number;
    change_returned?: number;
    // Card
    card_last_four?: string;
    card_type?: string;
    card_bank?: string;
    authorization_code?: string;
    terminal_id?: string;
    // UPI
    upi_id?: string;
    upi_ref_number?: string;
    // Wallet
    wallet_name?: string;
    // Bank
    bank_reference?: string;
    bank_name?: string;
    transaction_id?: string;
    // Cheque
    cheque_number?: string;
    cheque_bank?: string;
    cheque_date?: string;
    // Gift card
    gift_card_code?: string;
    gift_card_id?: string;
    // Credit note
    credit_note_id?: string;
    // Gateway
    gateway_transaction_id?: string;
    gateway_response?: Record<string, unknown>;
    notes?: string;
}

/** Cancel a sale */
export interface CancelSaleRequest {
    cancellation_reason: string;
}

/** Create a sale return */
export interface CreateSaleReturnRequest {
    sale_id: string;
    return_reason: string;
    return_notes?: string;
    shift_id?: string;
    refund_method?: PaymentMethod;
    items: CreateSaleReturnItemRequest[];
}

/** Return item */
export interface CreateSaleReturnItemRequest {
    sale_item_id: string;
    product_id: string;
    variant_id?: string;
    batch_id?: string;
    product_name: string;
    product_code: string;
    unit_price: number;
    unit_cost?: number;
    return_quantity: number;
    item_return_reason?: string;
    restock?: boolean;
    restock_condition?: RestockCondition;
}

/** Approve or reject a return */
export interface ApproveReturnRequest {
    approved: boolean;
    rejection_reason?: string;
}

/** Update sale (draft/hold only) */
export interface UpdateSaleRequest {
    customer_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_gstin?: string | null;
    is_interstate?: boolean;
    gst_type?: GstType;
    supply_type?: SupplyType;
    bill_discount_percentage?: number;
    bill_discount_amount?: number;
    is_credit_sale?: boolean;
    credit_due_date?: string | null;
    notes?: string | null;
    internal_notes?: string | null;
    tags?: string[] | null;
}

/** Mark receipt as printed */
export interface MarkReceiptPrintedRequest {
    receipt_printed: boolean;
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

export interface SaleFilters {
    search?: string;
    status?: SaleStatus;
    payment_method?: PaymentMethod;
    cashier_id?: string;
    customer_id?: string;
    shift_id?: string;
    date_from?: string;
    date_to?: string;
    sale_date?: string; // exact date
    is_credit_sale?: boolean;
    has_due_amount?: boolean;
    min_amount?: number;
    max_amount?: number;
    tags?: string[];
}

export interface SalePagination {
    page: number;
    limit: number;
    sort_by: SaleSortField;
    sort_order: "asc" | "desc";
}

export interface ReturnFilters {
    search?: string;
    status?: ReturnStatus;
    sale_id?: string;
    customer_id?: string;
    date_from?: string;
    date_to?: string;
}

export interface ReturnPagination {
    page: number;
    limit: number;
    sort_by: ReturnSortField;
    sort_order: "asc" | "desc";
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SaleListResponse {
    sales: Sale[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface ReturnListResponse {
    returns: SaleReturn[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface SalePaymentListResponse {
    payments: SalePayment[];
    total: number;
}
