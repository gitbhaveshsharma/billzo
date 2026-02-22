// ============================================================================
// CUSTOMER TYPES — Matches `customers`, `customer_ledger`, `credit_notes` tables
// from 7_point-of-sale.sql (Phase 3: POS Billing System)
// ============================================================================

import type { GenderType } from "./database.types";

// ============================================================================
// ENUMS (const arrays → union types)
// ============================================================================

export const CUSTOMER_TYPES = [
    "RETAIL",
    "WHOLESALE",
    "CORPORATE",
    "VIP",
    "LOYALTY",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const LEDGER_TRANSACTION_TYPES = [
    "SALE_CREDIT",
    "PAYMENT_RECEIVED",
    "RETURN_CREDIT",
    "ADJUSTMENT",
    "OPENING_BALANCE",
] as const;

export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number];

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

export const CUSTOMER_SORT_FIELDS = [
    "name",
    "customer_code",
    "phone",
    "total_purchases",
    "outstanding_balance",
    "loyalty_points",
    "total_visits",
    "last_purchase_date",
    "created_at",
] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

// ============================================================================
// CUSTOMER — matches `customers` table
// ============================================================================

export interface Customer {
    id: string;
    store_id: string;

    // Identification
    customer_code: string;
    name: string;
    phone: string;
    alternate_phone: string | null;
    email: string | null;

    // Personal
    date_of_birth: string | null;
    anniversary_date: string | null;
    gender: GenderType | null;

    // Type
    customer_type: CustomerType;

    // GST / Business (B2B)
    gstin: string | null;
    company_name: string | null;
    pan_number: string | null;

    // Address
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    country: string | null;

    // Credit Settings
    credit_limit: number;
    credit_days: number;
    is_credit_allowed: boolean;

    // Loyalty
    loyalty_points: number;
    total_points_earned: number;
    total_points_redeemed: number;

    // Financial Summary (denormalized)
    total_purchases: number;
    total_visits: number;
    last_purchase_date: string | null;
    last_purchase_amount: number | null;
    average_purchase_value: number | null;
    outstanding_balance: number;

    // Status
    is_active: boolean;
    is_blacklisted: boolean;
    blacklist_reason: string | null;

    // Metadata
    notes: string | null;
    tags: string[] | null;
    metadata: Record<string, unknown>;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// CUSTOMER LEDGER — matches `customer_ledger` table
// ============================================================================

export interface CustomerLedgerEntry {
    id: string;
    store_id: string;
    customer_id: string;

    // Entry Date
    entry_date: string;
    entry_time: string;

    // Transaction Type
    transaction_type: LedgerTransactionType;

    // Reference
    reference_type: string | null;
    reference_id: string | null;
    reference_number: string | null;

    // Amounts
    debit_amount: number;
    credit_amount: number;

    // Running Balance
    balance: number;

    // Payment Details
    payment_method: PaymentMethod | null;
    payment_reference: string | null;

    // Notes
    notes: string | null;

    // Processed By
    processed_by: string;

    // System fields
    created_at: string;
    metadata: Record<string, unknown>;
}

// ============================================================================
// CREDIT NOTE — matches `credit_notes` table
// ============================================================================

export interface CreditNote {
    id: string;
    store_id: string;
    customer_id: string;

    // Credit Note Number
    credit_note_number: string;

    // Source
    return_id: string | null;
    sale_id: string | null;

    // Amount
    amount: number;
    amount_used: number;
    amount_remaining: number; // Generated column

    // Validity
    issued_date: string;
    expiry_date: string | null;

    // Status
    is_active: boolean;
    is_fully_redeemed: boolean;

    // Notes
    notes: string | null;
    issued_by: string | null;

    // System fields
    created_at: string;
    updated_at: string;
}

// ============================================================================
// CUSTOMER CREDIT SUMMARY — matches `v_customer_credit_summary` view
// ============================================================================

export interface CustomerCreditSummary {
    customer_id: string;
    store_id: string;
    name: string;
    phone: string;
    credit_limit: number;
    outstanding_balance: number;
    credit_days: number;
    is_credit_allowed: boolean;
    overdue_invoices: number;
    oldest_due_days: number;
}

// ============================================================================
// REQUEST TYPES — CREATE
// ============================================================================

export interface CreateCustomerRequest {
    name: string;
    phone: string;
    alternate_phone?: string;
    email?: string;

    // Personal
    date_of_birth?: string;
    anniversary_date?: string;
    gender?: GenderType;

    // Type
    customer_type?: CustomerType;

    // GST / Business
    gstin?: string;
    company_name?: string;
    pan_number?: string;

    // Address
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;

    // Credit Settings
    credit_limit?: number;
    credit_days?: number;
    is_credit_allowed?: boolean;

    // Metadata
    notes?: string;
    tags?: string[];
}

// ============================================================================
// REQUEST TYPES — UPDATE
// ============================================================================

export interface UpdateCustomerRequest {
    name?: string;
    phone?: string;
    alternate_phone?: string;
    email?: string;

    // Personal
    date_of_birth?: string;
    anniversary_date?: string;
    gender?: GenderType;

    // Type
    customer_type?: CustomerType;

    // GST / Business
    gstin?: string;
    company_name?: string;
    pan_number?: string;

    // Address
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;

    // Credit Settings
    credit_limit?: number;
    credit_days?: number;
    is_credit_allowed?: boolean;

    // Status
    is_active?: boolean;
    is_blacklisted?: boolean;
    blacklist_reason?: string;

    // Metadata
    notes?: string;
    tags?: string[];
}

// ============================================================================
// REQUEST TYPES — LEDGER
// ============================================================================

export interface CreateLedgerEntryRequest {
    customer_id: string;
    transaction_type: LedgerTransactionType;
    reference_type?: string;
    reference_id?: string;
    reference_number?: string;
    debit_amount?: number;
    credit_amount?: number;
    payment_method?: PaymentMethod;
    payment_reference?: string;
    notes?: string;
}

export interface RecordPaymentRequest {
    customer_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_reference?: string;
    notes?: string;
}

// ============================================================================
// REQUEST TYPES — LOYALTY
// ============================================================================

export interface AdjustLoyaltyPointsRequest {
    points: number; // Positive to add, negative to deduct
    reason: string;
}

// ============================================================================
// REQUEST TYPES — BLACKLIST
// ============================================================================

export interface BlacklistCustomerRequest {
    is_blacklisted: boolean;
    blacklist_reason?: string;
}

// ============================================================================
// FILTERS & PAGINATION
// ============================================================================

export interface CustomerFilters {
    search?: string;
    customer_type?: CustomerType;
    is_active?: boolean;
    is_blacklisted?: boolean;
    is_credit_allowed?: boolean;
    has_outstanding?: boolean;
    city?: string;
    state?: string;
    tags?: string[];
    min_purchases?: number;
    max_purchases?: number;
    min_loyalty_points?: number;
}

export interface CustomerPagination {
    page: number;
    limit: number;
    sort_by: CustomerSortField;
    sort_order: "asc" | "desc";
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface CustomerListResponse {
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface CustomerDashboardStats {
    total_customers: number;
    active_customers: number;
    inactive_customers: number;
    blacklisted_customers: number;
    customers_with_credit: number;
    total_outstanding: number;
    total_loyalty_points: number;
    new_customers_this_month: number;
    vip_customers: number;
    corporate_customers: number;
    top_customers: Array<{
        id: string;
        name: string;
        phone: string;
        total_purchases: number;
        total_visits: number;
    }>;
    customers_by_type: Array<{
        customer_type: CustomerType;
        count: number;
    }>;
}

export interface CustomerPurchaseHistory {
    sale_id: string;
    invoice_number: string;
    sale_date: string;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    status: string;
    item_count: number;
}
