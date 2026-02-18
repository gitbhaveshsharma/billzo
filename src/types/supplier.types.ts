// ============================================================================
// SUPPLIER TYPES - Supplier/Distributor management types
// Aligned with: supabase/migrations/5_inventory_supplier.sql (tables 18, 19, 27)
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS (matching DB constraints)
// ============================================================================

export const SUPPLIER_TYPES = [
    "manufacturer",
    "distributor",
    "wholesaler",
    "retailer",
] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const PAYMENT_TERMS = [
    "immediate",
    "7_days",
    "15_days",
    "30_days",
    "45_days",
    "60_days",
] as const;

export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

// ============================================================================
// SUPPLIER - matches `suppliers` table
// ============================================================================

export interface Supplier {
    id: string;
    store_id: string;

    // Basic Info
    supplier_code: string;
    name: string;
    legal_name: string | null;
    type: SupplierType;

    // GST & Tax
    gstin: string | null;
    pan_number: string | null;
    tan_number: string | null;
    msme_number: string | null;

    // Primary Contact
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    alternate_phone: string | null;
    whatsapp: string | null;

    // Address
    address_line1: string | null;
    address_line2: string | null;
    landmark: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    country: string;

    // Bank Details
    bank_name: string | null;
    bank_account_number: string | null;
    ifsc_code: string | null;
    bank_branch: string | null;
    upi_id: string | null;

    // Payment Terms
    payment_terms: PaymentTerm;
    credit_limit: number | null;
    credit_days: number;

    // Purchase Settings
    default_discount_percentage: number;
    tax_inclusive: boolean;

    // Status
    is_active: boolean;
    is_preferred: boolean;
    blacklisted: boolean;
    blacklist_reason: string | null;

    // Metadata
    website: string | null;
    notes: string | null;
    tags: string[] | null;
    metadata: Record<string, unknown>;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// SUPPLIER CONTACT - matches `supplier_contacts` table
// ============================================================================

export interface SupplierContact {
    id: string;
    supplier_id: string;

    // Contact Info
    name: string;
    designation: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
    alternate_phone: string | null;

    // Role
    is_primary: boolean;
    is_authorized: boolean;

    // System fields
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

// ============================================================================
// SUPPLIER PRODUCT - matches `supplier_products` table
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
// ENRICHED SUPPLIER (with related data)
// ============================================================================

export interface EnrichedSupplier extends Supplier {
    contacts: SupplierContact[];
    product_count: number;
}

// ============================================================================
// REQUEST TYPES - CREATE
// ============================================================================

export interface CreateSupplierRequest {
    // Required
    supplier_code: string;
    name: string;

    // Optional basic info
    legal_name?: string;
    type?: SupplierType;

    // Tax
    gstin?: string;
    pan_number?: string;
    tan_number?: string;
    msme_number?: string;

    // Contact
    contact_person?: string;
    email?: string;
    phone?: string;
    alternate_phone?: string;
    whatsapp?: string;

    // Address
    address_line1?: string;
    address_line2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;

    // Bank
    bank_name?: string;
    bank_account_number?: string;
    ifsc_code?: string;
    bank_branch?: string;
    upi_id?: string;

    // Payment
    payment_terms?: PaymentTerm;
    credit_limit?: number;
    credit_days?: number;

    // Purchase
    default_discount_percentage?: number;
    tax_inclusive?: boolean;

    // Status
    is_preferred?: boolean;

    // Metadata
    website?: string;
    notes?: string;
    tags?: string[];
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
    is_active?: boolean;
    blacklisted?: boolean;
    blacklist_reason?: string;
}

// ============================================================================
// REQUEST TYPES - SUPPLIER CONTACT
// ============================================================================

export interface CreateSupplierContactRequest {
    name: string;
    designation?: string;
    department?: string;
    email?: string;
    phone?: string;
    alternate_phone?: string;
    is_primary?: boolean;
    is_authorized?: boolean;
}

export interface UpdateSupplierContactRequest extends Partial<CreateSupplierContactRequest> {}

// ============================================================================
// FILTERS, PAGINATION, LIST RESPONSE
// ============================================================================

export interface SupplierFilters {
    search?: string;
    type?: SupplierType;
    is_active?: boolean;
    is_preferred?: boolean;
    blacklisted?: boolean;
    city?: string;
    state?: string;
    payment_terms?: PaymentTerm;
    has_gstin?: boolean;
    tags?: string[];
}

export interface SupplierPagination {
    page: number;
    limit: number;
    sort_by: SupplierSortField;
    sort_order: "asc" | "desc";
}

export type SupplierSortField =
    | "name"
    | "supplier_code"
    | "created_at"
    | "updated_at"
    | "credit_limit"
    | "city";

export interface SupplierListResponse {
    suppliers: Supplier[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// ============================================================================
// STATS
// ============================================================================

export interface SupplierStats {
    total_suppliers: number;
    active_suppliers: number;
    inactive_suppliers: number;
    preferred_suppliers: number;
    blacklisted_suppliers: number;
    by_type: Record<SupplierType, number>;
    by_payment_terms: Record<PaymentTerm, number>;
    with_gstin: number;
    without_gstin: number;
    total_credit_limit: number;
    average_credit_days: number;
}

// ============================================================================
// BLACKLIST
// ============================================================================

export interface BlacklistSupplierRequest {
    reason: string;
}
