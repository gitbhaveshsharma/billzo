-- ============================================================================
-- PHASE 3: POS BILLING SYSTEM
-- Complete Point-of-Sale module with GST, payments, returns, shifts
-- Integrates with Phase 1 (stores/users/roles) and Phase 2 (products/inventory)
-- ============================================================================

-- ============================================================================
-- ENUMERATIONS
-- ============================================================================

-- Sale lifecycle states
CREATE TYPE sale_status AS ENUM (
    'DRAFT',           -- Bill started but not completed
    'HOLD',            -- Bill put on hold (e.g., customer left temporarily)
    'COMPLETED',       -- Paid and closed
    'CANCELLED',       -- Voided (never charged)
    'PARTIAL_RETURN',  -- Some items returned
    'FULLY_RETURNED',  -- All items returned / full refund
    'CREDIT',          -- Sold on credit, payment pending
    'PARTIAL_PAID'     -- Partial payment received, balance due
);

-- Payment methods accepted at POS
CREATE TYPE payment_method AS ENUM (
    'CASH',
    'CARD_CREDIT',
    'CARD_DEBIT',
    'UPI',
    'NET_BANKING',
    'WALLET',          -- Paytm, PhonePe, etc.
    'CHEQUE',
    'NEFT_RTGS',
    'CREDIT_NOTE',     -- Customer has store credit
    'LOYALTY_POINTS',
    'EMI',
    'GIFT_CARD'
);

-- Return/refund lifecycle
CREATE TYPE return_status AS ENUM (
    'INITIATED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'REFUND_PENDING',
    'REFUND_COMPLETED'
);

-- Cash register shift lifecycle
CREATE TYPE shift_status AS ENUM (
    'OPEN',
    'CLOSED',
    'SUSPENDED'        -- Mid-day break, system issue, etc.
);

-- Discount types
CREATE TYPE discount_type AS ENUM (
    'PERCENTAGE',
    'FLAT_AMOUNT',
    'BUY_X_GET_Y',
    'COMBO',
    'LOYALTY',
    'MANUAL'
);

-- Customer category
CREATE TYPE customer_type AS ENUM (
    'RETAIL',
    'WHOLESALE',
    'CORPORATE',
    'VIP',
    'LOYALTY'
);

-- ============================================================================
-- 30. CUSTOMERS TABLE
-- Customers for POS — links to sales, credit, loyalty
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Identification
    customer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,           -- Primary lookup at POS (fast search)
    alternate_phone TEXT,
    email TEXT,

    -- Personal
    date_of_birth DATE,            -- For loyalty birthday offers
    anniversary_date DATE,
    gender gender_type,

    -- Type & Category
    customer_type customer_type DEFAULT 'RETAIL',

    -- GST / Business (for B2B sales)
    gstin TEXT,
    company_name TEXT,
    pan_number TEXT,

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',

    -- Credit Settings
    credit_limit DECIMAL(12,2) DEFAULT 0,
    credit_days INTEGER DEFAULT 0,
    is_credit_allowed BOOLEAN DEFAULT false,

    -- Loyalty
    loyalty_points INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_redeemed INTEGER DEFAULT 0,

    -- Financial Summary (denormalized for speed)
    total_purchases DECIMAL(12,2) DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    last_purchase_date DATE,
    last_purchase_amount DECIMAL(12,2),
    average_purchase_value DECIMAL(12,2),
    outstanding_balance DECIMAL(12,2) DEFAULT 0,  -- Current credit due

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,

    -- Metadata
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(store_id, customer_code),
    UNIQUE(store_id, phone),
    CONSTRAINT valid_customer_gstin CHECK (
        gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$'
    )
);

-- ============================================================================
-- 31. CASH_SHIFTS TABLE
-- Cash register open/close lifecycle with cash reconciliation
-- ============================================================================
CREATE TABLE cash_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Who opened/closed
    opened_by UUID NOT NULL REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),

    -- Terminal / POS device (optional, for multi-terminal stores)
    terminal_id TEXT,
    terminal_name TEXT,

    -- Shift Timing
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,

    -- Opening Cash
    opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0,     -- Cash in drawer at open
    opening_notes TEXT,

    -- Closing Reconciliation
    closing_cash_expected DECIMAL(12,2),   -- System calculated
    closing_cash_actual DECIMAL(12,2),     -- Cashier physically counted
    cash_difference DECIMAL(12,2)          -- Actual - Expected (shortage/excess)
        GENERATED ALWAYS AS (
            COALESCE(closing_cash_actual, 0) - COALESCE(closing_cash_expected, 0)
        ) STORED,
    closing_notes TEXT,

    -- Sales Summary (snapshot at close)
    total_sales_count INTEGER DEFAULT 0,
    total_sales_amount DECIMAL(12,2) DEFAULT 0,
    total_returns_count INTEGER DEFAULT 0,
    total_returns_amount DECIMAL(12,2) DEFAULT 0,
    total_discount_given DECIMAL(12,2) DEFAULT 0,
    total_tax_collected DECIMAL(12,2) DEFAULT 0,

    -- Payment Method Breakdown (snapshot at close)
    cash_sales DECIMAL(12,2) DEFAULT 0,
    card_sales DECIMAL(12,2) DEFAULT 0,
    upi_sales DECIMAL(12,2) DEFAULT 0,
    other_sales DECIMAL(12,2) DEFAULT 0,

    -- Cash Movements
    cash_in DECIMAL(12,2) DEFAULT 0,       -- Mid-shift cash added
    cash_out DECIMAL(12,2) DEFAULT 0,      -- Mid-shift cash removed
    cash_in_reason TEXT,
    cash_out_reason TEXT,

    -- Status
    status shift_status DEFAULT 'OPEN',

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: Only one open shift per terminal per store
    CONSTRAINT no_duplicate_open_shifts UNIQUE (store_id, terminal_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- 32. SALES TABLE
-- Master sales/invoice record — the heart of POS
-- ============================================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Invoice Number (human-readable, generated by trigger)
    invoice_number TEXT NOT NULL,

    -- Shift Reference
    shift_id UUID REFERENCES cash_shifts(id),

    -- Customer (optional for walk-in)
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT,          -- Snapshot (customer may be deleted later)
    customer_phone TEXT,         -- Snapshot
    customer_gstin TEXT,         -- For B2B GST invoices

    -- Sale Date & Time
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sale_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Cashier / Salesperson
    cashier_id UUID NOT NULL REFERENCES auth.users(id),
    salesperson_id UUID REFERENCES auth.users(id),   -- Optional different salesperson

    -- GST Type
    is_interstate BOOLEAN DEFAULT false,    -- true = IGST, false = CGST+SGST
    gst_type TEXT DEFAULT 'B2C',            -- B2C, B2B, export
    supply_type TEXT DEFAULT 'intra',       -- intra, inter, export

    -- Financial Breakdown (all amounts in INR, 2 decimal places)
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,          -- Sum of line item subtotals (before any discount/tax)
    item_discount_total DECIMAL(12,2) DEFAULT 0,        -- Total of all item-level discounts
    bill_discount_amount DECIMAL(12,2) DEFAULT 0,       -- Single bill-level discount amount
    bill_discount_percentage DECIMAL(5,2) DEFAULT 0,    -- Bill-level discount %
    discount_total DECIMAL(12,2) DEFAULT 0,             -- Total discount (item + bill)
    taxable_amount DECIMAL(12,2) DEFAULT 0,             -- Amount on which tax is calculated

    -- GST Breakdown
    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    cess_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,                 -- Total tax = cgst+sgst+igst+cess

    -- Final Amounts
    gross_total DECIMAL(12,2) NOT NULL DEFAULT 0,       -- taxable_amount + tax_amount
    round_off DECIMAL(5,2) DEFAULT 0,                   -- Rounding adjustment (max ±0.50)
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,      -- Final payable = gross_total + round_off
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_amount DECIMAL(12,2) DEFAULT 0,                 -- Remaining balance (for credit sales)
    change_amount DECIMAL(12,2) DEFAULT 0,              -- Change given back to customer

    -- Loyalty
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_points_redeemed INTEGER DEFAULT 0,
    loyalty_discount_amount DECIMAL(12,2) DEFAULT 0,

    -- Status
    status sale_status DEFAULT 'DRAFT',

    -- Payment Status
    is_credit_sale BOOLEAN DEFAULT false,
    credit_due_date DATE,

    -- Notes & Metadata
    notes TEXT,
    internal_notes TEXT,
    tags TEXT[],

    -- Receipt Tracking
    receipt_printed BOOLEAN DEFAULT false,
    receipt_printed_at TIMESTAMPTZ,
    receipt_print_count INTEGER DEFAULT 0,
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,

    -- Reference for linking (e.g., hold bill ref, quotation)
    reference_type TEXT,          -- quotation, hold_bill, purchase_order
    reference_id UUID,
    reference_number TEXT,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Financial integrity constraints
    UNIQUE(store_id, invoice_number),
    CONSTRAINT valid_total CHECK (total_amount >= 0),
    CONSTRAINT valid_paid CHECK (paid_amount >= 0),
    CONSTRAINT valid_due CHECK (due_amount >= 0),
    CONSTRAINT valid_round_off CHECK (round_off BETWEEN -0.50 AND 0.50),
    CONSTRAINT valid_bill_discount_pct CHECK (bill_discount_percentage BETWEEN 0 AND 100)
);

-- ============================================================================
-- 33. SALE_ITEMS TABLE
-- Individual line items within a sale
-- Each row is a product/variant sold in a transaction
-- ============================================================================
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Product References (kept for lookup; snapshots below are source of truth)
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    batch_id UUID REFERENCES product_batches(id),    -- For batch-tracked products

    -- Product Snapshots at time of sale (CRITICAL: never rely on current product data)
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    barcode TEXT,
    hsn_code TEXT,
    unit_name TEXT,                  -- e.g., "pcs", "kg"

    -- Quantities
    quantity DECIMAL(12,3) NOT NULL,
    returned_quantity DECIMAL(12,3) DEFAULT 0,      -- Updated on returns
    net_quantity DECIMAL(12,3)                       -- quantity - returned_quantity
        GENERATED ALWAYS AS (quantity - returned_quantity) STORED,

    -- Price Snapshots (all at time of sale)
    mrp DECIMAL(12,2) NOT NULL,                     -- MRP at time of sale
    unit_price DECIMAL(12,2) NOT NULL,              -- Selling price per unit
    unit_cost DECIMAL(12,2),                        -- Purchase cost (for profit calc)

    -- Item Discount
    discount_type discount_type DEFAULT 'PERCENTAGE',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,        -- Calculated discount amount

    -- Price after discount
    price_after_discount DECIMAL(12,2) NOT NULL,    -- unit_price - discount per unit

    -- Line Totals
    subtotal DECIMAL(12,2) NOT NULL,                -- unit_price × quantity
    discount_total DECIMAL(12,2) DEFAULT 0,         -- discount_amount × quantity
    taxable_amount DECIMAL(12,2) NOT NULL,          -- subtotal - discount_total

    -- GST Breakdown per line item
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    cgst_percentage DECIMAL(5,2) DEFAULT 0,
    sgst_percentage DECIMAL(5,2) DEFAULT 0,
    igst_percentage DECIMAL(5,2) DEFAULT 0,
    cess_percentage DECIMAL(5,2) DEFAULT 0,

    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    cess_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,

    -- Line total including tax
    total_amount DECIMAL(12,2) NOT NULL,            -- taxable_amount + tax_amount

    -- Profit (calculated at sale time)
    total_cost DECIMAL(12,2),                       -- unit_cost × quantity
    profit_amount DECIMAL(12,2),                    -- total_amount - total_cost
    profit_percentage DECIMAL(5,2),                 -- profit_amount / total_cost × 100

    -- Status flags
    is_returned BOOLEAN DEFAULT false,
    is_void BOOLEAN DEFAULT false,

    -- Serial / batch tracking
    serial_numbers TEXT[],

    -- Sorting
    sort_order INTEGER DEFAULT 0,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_quantity CHECK (quantity > 0),
    CONSTRAINT valid_returned_qty CHECK (returned_quantity >= 0 AND returned_quantity <= quantity),
    CONSTRAINT valid_unit_price CHECK (unit_price >= 0),
    CONSTRAINT valid_discount_pct CHECK (discount_percentage BETWEEN 0 AND 100),
    CONSTRAINT valid_gst_pct CHECK (gst_percentage BETWEEN 0 AND 100)
);

-- ============================================================================
-- 34. SALE_PAYMENTS TABLE
-- Payment records for a sale — supports split payments
-- ============================================================================
CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Payment Details
    payment_method payment_method NOT NULL,
    amount DECIMAL(12,2) NOT NULL,

    -- Cash specific
    cash_tendered DECIMAL(12,2),     -- Amount given by customer
    change_returned DECIMAL(12,2),   -- Change given back

    -- Card specific
    card_last_four TEXT,
    card_type TEXT,                  -- VISA, MC, AMEX, RUPAY
    card_bank TEXT,
    authorization_code TEXT,
    terminal_id TEXT,                -- Card terminal ID

    -- UPI / Wallet specific
    upi_id TEXT,
    upi_ref_number TEXT,
    wallet_name TEXT,                -- Paytm, PhonePe, GPay

    -- Net Banking / NEFT / RTGS
    bank_reference TEXT,
    bank_name TEXT,
    transaction_id TEXT,

    -- Cheque
    cheque_number TEXT,
    cheque_bank TEXT,
    cheque_date DATE,
    cheque_status TEXT DEFAULT 'pending', -- pending, cleared, bounced

    -- Gift Card
    gift_card_code TEXT,
    gift_card_id UUID,

    -- Credit Note redemption
    credit_note_id UUID,

    -- Payment Status
    status TEXT DEFAULT 'SUCCESS',   -- SUCCESS, FAILED, PENDING, REVERSED
    payment_at TIMESTAMPTZ DEFAULT NOW(),

    -- Reference for reconciliation
    gateway_transaction_id TEXT,
    gateway_response JSONB DEFAULT '{}'::jsonb,

    -- Notes
    notes TEXT,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    CONSTRAINT valid_payment_amount CHECK (amount > 0)
);

-- ============================================================================
-- 35. SALE_RETURNS TABLE
-- Return/refund header — linked to original sale
-- ============================================================================
CREATE TABLE sale_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Reference to original sale
    sale_id UUID NOT NULL REFERENCES sales(id),
    original_invoice_number TEXT NOT NULL,   -- Snapshot

    -- Return Invoice
    return_number TEXT NOT NULL,

    -- Who processed the return
    processed_by UUID NOT NULL REFERENCES auth.users(id),
    shift_id UUID REFERENCES cash_shifts(id),

    -- Customer
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT,

    -- Return Reason
    return_reason TEXT NOT NULL,
    return_notes TEXT,

    -- Financial (return amounts are POSITIVE values)
    subtotal_returned DECIMAL(12,2) DEFAULT 0,
    tax_returned DECIMAL(12,2) DEFAULT 0,
    cgst_returned DECIMAL(12,2) DEFAULT 0,
    sgst_returned DECIMAL(12,2) DEFAULT 0,
    igst_returned DECIMAL(12,2) DEFAULT 0,
    total_returned DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Refund Method
    refund_method payment_method,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    refund_reference TEXT,
    credit_note_issued BOOLEAN DEFAULT false,
    credit_note_amount DECIMAL(12,2) DEFAULT 0,
    credit_note_number TEXT,

    -- Status
    status return_status DEFAULT 'INITIATED',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- System fields
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(store_id, return_number),
    CONSTRAINT valid_return_total CHECK (total_returned >= 0)
);

-- ============================================================================
-- 36. SALE_RETURN_ITEMS TABLE
-- Individual items in a return — links back to original sale_items
-- ============================================================================
CREATE TABLE sale_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    store_id UUID NOT NULL REFERENCES stores(id),

    -- Product References
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    batch_id UUID REFERENCES product_batches(id),

    -- Snapshots from original sale
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(12,2),

    -- Return Quantity
    return_quantity DECIMAL(12,3) NOT NULL,

    -- Return reason per item
    item_return_reason TEXT,

    -- Restocking
    restock BOOLEAN DEFAULT true,          -- Should this item go back to inventory?
    restock_condition TEXT DEFAULT 'good', -- good, damaged, expired

    -- Financial
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    taxable_amount DECIMAL(12,2) NOT NULL,
    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_return_qty CHECK (return_quantity > 0)
);

-- ============================================================================
-- 37. CUSTOMER_LEDGER TABLE
-- Credit tracking per customer — every credit/debit creates an entry
-- ============================================================================
CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Entry Date
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Transaction Type
    transaction_type TEXT NOT NULL, -- SALE_CREDIT, PAYMENT_RECEIVED, RETURN_CREDIT, ADJUSTMENT, OPENING_BALANCE

    -- Reference
    reference_type TEXT,            -- sale, sale_return, manual_adjustment
    reference_id UUID,
    reference_number TEXT,          -- Invoice number for display

    -- Amounts (always positive — use transaction_type to determine debit/credit)
    debit_amount DECIMAL(12,2) DEFAULT 0,      -- Amount customer owes (sale on credit)
    credit_amount DECIMAL(12,2) DEFAULT 0,     -- Amount applied to reduce balance (payment/return)

    -- Running Balance (updated by trigger)
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,  -- Positive = customer owes money

    -- Payment Details (when transaction_type = PAYMENT_RECEIVED)
    payment_method payment_method,
    payment_reference TEXT,

    -- Notes
    notes TEXT,

    -- Processed By
    processed_by UUID NOT NULL REFERENCES auth.users(id),

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT valid_ledger_amounts CHECK (
        (debit_amount >= 0 AND credit_amount = 0) OR
        (credit_amount >= 0 AND debit_amount = 0)
    )
);

-- ============================================================================
-- 38. INVOICE_SEQUENCES TABLE
-- Per-store invoice number sequences to avoid race conditions
-- ============================================================================
CREATE TABLE invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sequence_type TEXT NOT NULL,            -- INVOICE, RETURN, QUOTATION, CREDIT_NOTE
    prefix TEXT NOT NULL,                   -- INV, RET, QUO, CN
    current_number INTEGER NOT NULL DEFAULT 0,
    financial_year TEXT NOT NULL,           -- e.g., "2025-26"
    last_generated_at TIMESTAMPTZ,

    UNIQUE(store_id, sequence_type, financial_year)
);

-- ============================================================================
-- 39. CREDIT_NOTES TABLE
-- Credit notes issued to customers for returns / adjustments
-- ============================================================================
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),

    -- Credit Note Number
    credit_note_number TEXT NOT NULL,

    -- Source
    return_id UUID REFERENCES sale_returns(id),
    sale_id UUID REFERENCES sales(id),

    -- Amount
    amount DECIMAL(12,2) NOT NULL,
    amount_used DECIMAL(12,2) DEFAULT 0,
    amount_remaining DECIMAL(12,2)
        GENERATED ALWAYS AS (amount - amount_used) STORED,

    -- Validity
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_fully_redeemed BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,
    issued_by UUID REFERENCES auth.users(id),

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(store_id, credit_note_number),
    CONSTRAINT valid_cn_amount CHECK (amount > 0),
    CONSTRAINT valid_cn_used CHECK (amount_used >= 0 AND amount_used <= amount)
);

-- ============================================================================
-- 40. CASH_MOVEMENTS TABLE
-- Mid-shift cash-in / cash-out log (petty cash, safe drops, etc.)
-- ============================================================================
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES cash_shifts(id) ON DELETE CASCADE,

    -- Movement
    movement_type TEXT NOT NULL,    -- CASH_IN, CASH_OUT, SAFE_DROP, PETTY_CASH, OPENING, CLOSING
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT NOT NULL,

    -- Authorization (for large amounts)
    authorized_by UUID REFERENCES auth.users(id),

    -- Performed by
    performed_by UUID NOT NULL REFERENCES auth.users(id),

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_movement_amount CHECK (amount > 0)
);

-- ============================================================================
-- INDEXES — Optimized for POS high-concurrency read patterns
-- ============================================================================

-- Customers
CREATE INDEX idx_customers_store_phone ON customers(store_id, phone);
CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_name ON customers USING gin(to_tsvector('simple', name));
CREATE INDEX idx_customers_outstanding ON customers(store_id, outstanding_balance) WHERE outstanding_balance > 0;

-- Sales — critical for POS dashboard and reports
CREATE INDEX idx_sales_store_date ON sales(store_id, sale_date DESC);
CREATE INDEX idx_sales_invoice_number ON sales(store_id, invoice_number);
CREATE INDEX idx_sales_customer ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_cashier ON sales(cashier_id, sale_date DESC);
CREATE INDEX idx_sales_shift ON sales(shift_id);
CREATE INDEX idx_sales_status ON sales(store_id, status);
CREATE INDEX idx_sales_credit ON sales(store_id, status) WHERE status IN ('CREDIT', 'PARTIAL_PAID');

-- Sale Items — for product-level reporting
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id, created_at DESC);
CREATE INDEX idx_sale_items_batch ON sale_items(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_sale_items_store ON sale_items(store_id);
CREATE INDEX idx_sale_items_variant ON sale_items(variant_id) WHERE variant_id IS NOT NULL;

-- Sale Payments
CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX idx_sale_payments_method ON sale_payments(store_id, payment_method, created_at DESC);
CREATE INDEX idx_sale_payments_store_date ON sale_payments(store_id, payment_at DESC);

-- Sale Returns
CREATE INDEX idx_sale_returns_sale ON sale_returns(sale_id);
CREATE INDEX idx_sale_returns_store ON sale_returns(store_id, return_date DESC);
CREATE INDEX idx_sale_returns_status ON sale_returns(store_id, status);

-- Sale Return Items
CREATE INDEX idx_sale_return_items_return ON sale_return_items(return_id);
CREATE INDEX idx_sale_return_items_product ON sale_return_items(product_id);

-- Cash Shifts
CREATE INDEX idx_cash_shifts_store_date ON cash_shifts(store_id, shift_date DESC);
CREATE INDEX idx_cash_shifts_open ON cash_shifts(store_id, status) WHERE status = 'OPEN';
CREATE INDEX idx_cash_shifts_cashier ON cash_shifts(opened_by, shift_date DESC);

-- Customer Ledger
CREATE INDEX idx_customer_ledger_customer ON customer_ledger(customer_id, entry_date DESC);
CREATE INDEX idx_customer_ledger_store ON customer_ledger(store_id, entry_date DESC);
CREATE INDEX idx_customer_ledger_reference ON customer_ledger(reference_type, reference_id);

-- Credit Notes
CREATE INDEX idx_credit_notes_customer ON credit_notes(customer_id, issued_date DESC);
CREATE INDEX idx_credit_notes_active ON credit_notes(store_id) WHERE is_active = true AND NOT is_fully_redeemed;

-- Cash Movements
CREATE INDEX idx_cash_movements_shift ON cash_movements(shift_id, created_at DESC);

-- Invoice Sequences
CREATE INDEX idx_invoice_sequences_store ON invoice_sequences(store_id, sequence_type, financial_year);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- ============ CUSTOMERS ============
CREATE POLICY "Users can view customers in their store"
    ON customers FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Cashiers and above can manage customers"
    ON customers FOR ALL
    USING (
        (public.has_permission('manage_customers', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- ============ CASH SHIFTS ============
CREATE POLICY "Users can view shifts in their store"
    ON cash_shifts FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Cashiers can open/manage their shifts"
    ON cash_shifts FOR ALL
    USING (
        (store_id = public.get_user_store()
        AND (opened_by = auth.uid() OR public.has_permission('manage_cash_drawer', store_id)))
        OR public.is_super_admin()
    );

-- ============ SALES ============
CREATE POLICY "Users can view sales in their store"
    ON sales FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Cashiers can create sales"
    ON sales FOR INSERT
    WITH CHECK (
        store_id = public.get_user_store()
        AND public.has_permission('process_sales', store_id)
    );

CREATE POLICY "Cashiers can update their own draft/hold sales"
    ON sales FOR UPDATE
    USING (
        store_id = public.get_user_store()
        AND (
            -- Own draft/hold bills: cashier can update
            (cashier_id = auth.uid() AND status IN ('DRAFT', 'HOLD'))
            -- Managers can update any sale in allowed statuses
            OR public.has_permission('void_transactions', store_id)
        )
        OR public.is_super_admin()
    );

-- ============ SALE ITEMS ============
CREATE POLICY "Users can view sale items in their store"
    ON sale_items FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "System can insert sale items"
    ON sale_items FOR INSERT
    WITH CHECK (
        store_id = public.get_user_store()
        AND public.has_permission('process_sales', store_id)
    );

CREATE POLICY "Authorized users can update sale items"
    ON sale_items FOR UPDATE
    USING (
        store_id = public.get_user_store()
        AND public.has_permission('void_transactions', store_id)
        OR public.is_super_admin()
    );

-- ============ SALE PAYMENTS ============
CREATE POLICY "Users can view payments in their store"
    ON sale_payments FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Cashiers can record payments"
    ON sale_payments FOR INSERT
    WITH CHECK (
        store_id = public.get_user_store()
        AND public.has_permission('process_sales', store_id)
    );

-- ============ SALE RETURNS ============
CREATE POLICY "Users can view returns in their store"
    ON sale_returns FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Authorized users can process returns"
    ON sale_returns FOR ALL
    USING (
        (store_id = public.get_user_store()
        AND public.has_permission('process_refunds', store_id))
        OR public.is_super_admin()
    );

-- ============ SALE RETURN ITEMS ============
CREATE POLICY "Users can view return items in their store"
    ON sale_return_items FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Authorized users can insert return items"
    ON sale_return_items FOR INSERT
    WITH CHECK (
        store_id = public.get_user_store()
        AND public.has_permission('process_refunds', store_id)
    );

-- ============ CUSTOMER LEDGER ============
CREATE POLICY "Users can view customer ledger in their store"
    ON customer_ledger FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Cashiers and managers can insert ledger entries"
    ON customer_ledger FOR INSERT
    WITH CHECK (
        store_id = public.get_user_store()
        AND (
            public.has_permission('process_sales', store_id)
            OR public.has_permission('process_refunds', store_id)
        )
    );

-- ============ INVOICE SEQUENCES ============
CREATE POLICY "Store members can view sequences"
    ON invoice_sequences FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "System manages sequences"
    ON invoice_sequences FOR ALL
    USING (store_id = public.get_user_store() OR public.is_super_admin());

-- ============ CREDIT NOTES ============
CREATE POLICY "Users can view credit notes in their store"
    ON credit_notes FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Authorized users can manage credit notes"
    ON credit_notes FOR ALL
    USING (
        (store_id = public.get_user_store()
        AND public.has_permission('process_refunds', store_id))
        OR public.is_super_admin()
    );

-- ============ CASH MOVEMENTS ============
CREATE POLICY "Users can view cash movements in their store"
    ON cash_movements FOR SELECT
    USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Cashiers can record cash movements"
    ON cash_movements FOR INSERT
    WITH CHECK (
        store_id = public.get_user_store()
        AND public.has_permission('manage_cash_drawer', store_id)
    );

-- ============================================================================
-- FUNCTION: Generate Invoice Number
-- Thread-safe using SELECT FOR UPDATE on invoice_sequences
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(
    p_store_id UUID,
    p_type TEXT DEFAULT 'INVOICE'
)
RETURNS TEXT AS $$
DECLARE
    v_sequence_row invoice_sequences%ROWTYPE;
    v_financial_year TEXT;
    v_prefix TEXT;
    v_new_number INTEGER;
    v_invoice_number TEXT;
    v_store_code TEXT;
BEGIN
    -- Determine current financial year (India: April-March)
    v_financial_year := CASE
        WHEN EXTRACT(MONTH FROM NOW()) >= 4
            THEN EXTRACT(YEAR FROM NOW())::TEXT || '-' || RIGHT((EXTRACT(YEAR FROM NOW()) + 1)::TEXT, 2)
        ELSE (EXTRACT(YEAR FROM NOW()) - 1)::TEXT || '-' || RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2)
    END;

    -- Get store code for prefix
    SELECT store_code INTO v_store_code FROM stores WHERE id = p_store_id;

    -- Determine prefix
    v_prefix := CASE p_type
        WHEN 'INVOICE' THEN 'INV'
        WHEN 'RETURN' THEN 'RET'
        WHEN 'CREDIT_NOTE' THEN 'CN'
        WHEN 'QUOTATION' THEN 'QUO'
        ELSE 'INV'
    END;

    -- Lock and increment sequence (prevents race conditions)
    SELECT * INTO v_sequence_row
    FROM invoice_sequences
    WHERE store_id = p_store_id
    AND sequence_type = p_type
    AND financial_year = v_financial_year
    FOR UPDATE;

    IF NOT FOUND THEN
        -- First invoice of the year — initialize
        INSERT INTO invoice_sequences(store_id, sequence_type, prefix, current_number, financial_year, last_generated_at)
        VALUES (p_store_id, p_type, v_prefix, 1, v_financial_year, NOW())
        RETURNING current_number INTO v_new_number;
    ELSE
        v_new_number := v_sequence_row.current_number + 1;
        UPDATE invoice_sequences
        SET current_number = v_new_number,
            last_generated_at = NOW()
        WHERE id = v_sequence_row.id;
    END IF;

    -- Format: INV/STORE001/2025-26/0001
    v_invoice_number := v_prefix || '/' || v_store_code || '/' || v_financial_year || '/' || LPAD(v_new_number::TEXT, 4, '0');

    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- FUNCTION: Complete a Sale
-- Atomically: sets invoice number, status=COMPLETED, updates paid/due
-- Called by application AFTER all items and payments are added
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_sale(p_sale_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_sale sales%ROWTYPE;
    v_total_paid DECIMAL(12,2);
    v_invoice_number TEXT;
BEGIN
    -- Lock the sale row
    SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
    END IF;

    IF v_sale.status NOT IN ('DRAFT', 'HOLD') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sale is not in a completable state: ' || v_sale.status);
    END IF;

    -- Sum up all payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM sale_payments WHERE sale_id = p_sale_id AND status = 'SUCCESS';

    -- Generate invoice number
    v_invoice_number := generate_invoice_number(v_sale.store_id, 'INVOICE');

    -- Update sale
    UPDATE sales SET
        invoice_number = v_invoice_number,
        paid_amount = v_total_paid,
        due_amount = GREATEST(0, total_amount - v_total_paid),
        status = CASE
            WHEN v_total_paid >= total_amount THEN 'COMPLETED'
            WHEN v_total_paid > 0 THEN 'PARTIAL_PAID'
            WHEN is_credit_sale THEN 'CREDIT'
            ELSE 'PARTIAL_PAID'
        END,
        updated_at = NOW()
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_number', v_invoice_number,
        'total_paid', v_total_paid,
        'status', (SELECT status FROM sales WHERE id = p_sale_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- TRIGGER FUNCTION: Deduct inventory when a sale item is inserted
-- Inserts SALE record into inventory_transactions (never touches inventory directly)
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_sale sales%ROWTYPE;
BEGIN
    -- Only process completed or in-progress sales, not DRAFT
    SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;

    -- Insert into inventory_transactions (the inventory trigger will update stock)
    INSERT INTO inventory_transactions (
        store_id,
        product_id,
        variant_id,
        transaction_type,
        transaction_date,
        quantity,
        unit_cost,
        total_cost,
        reference_type,
        reference_id,
        reference_number,
        batch_number,
        performed_by,
        notes
    )
    SELECT
        NEW.store_id,
        NEW.product_id,
        NEW.variant_id,
        'SALE',
        NOW(),
        NEW.quantity,
        NEW.unit_cost,
        NEW.total_cost,
        'sale',
        NEW.sale_id,
        v_sale.invoice_number,
        pb.batch_number,
        v_sale.cashier_id,
        'POS Sale: ' || NEW.product_name
    FROM (SELECT 1) AS dummy
    LEFT JOIN product_batches pb ON pb.id = NEW.batch_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Only fire when sale is NOT in draft (avoid deducting on draft saves)
CREATE OR REPLACE FUNCTION should_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_status sale_status;
BEGIN
    SELECT status INTO v_sale_status FROM sales WHERE id = NEW.sale_id;

    IF v_sale_status NOT IN ('DRAFT', 'HOLD') THEN
        PERFORM deduct_inventory_on_sale_fn(NEW);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Simpler approach: Inventory deduction triggered when sale status moves to COMPLETED
CREATE OR REPLACE FUNCTION handle_sale_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a sale transitions from DRAFT/HOLD to a completed state
    IF OLD.status IN ('DRAFT', 'HOLD') AND NEW.status IN ('COMPLETED', 'CREDIT', 'PARTIAL_PAID') THEN

        -- Deduct inventory for all line items
        INSERT INTO inventory_transactions (
            store_id,
            product_id,
            variant_id,
            transaction_type,
            transaction_date,
            quantity,
            unit_cost,
            total_cost,
            reference_type,
            reference_id,
            reference_number,
            performed_by,
            notes
        )
        SELECT
            si.store_id,
            si.product_id,
            si.variant_id,
            'SALE',
            NOW(),
            si.quantity,
            si.unit_cost,
            si.total_cost,
            'sale',
            NEW.id,
            NEW.invoice_number,
            NEW.cashier_id,
            'POS Sale: ' || si.product_name
        FROM sale_items si
        WHERE si.sale_id = NEW.id
        AND si.is_void = false;

        -- Update customer summary if sale has customer
        IF NEW.customer_id IS NOT NULL THEN
            UPDATE customers SET
                total_purchases = total_purchases + NEW.total_amount,
                total_visits = total_visits + 1,
                last_purchase_date = NEW.sale_date,
                last_purchase_amount = NEW.total_amount,
                average_purchase_value = CASE
                    WHEN total_visits = 0 THEN NEW.total_amount
                    ELSE (total_purchases + NEW.total_amount) / (total_visits + 1)
                END,
                updated_at = NOW()
            WHERE id = NEW.customer_id;

            -- For credit sales, create ledger entry and update outstanding
            IF NEW.status IN ('CREDIT', 'PARTIAL_PAID') AND NEW.due_amount > 0 THEN
                INSERT INTO customer_ledger (
                    store_id, customer_id, entry_date, transaction_type,
                    reference_type, reference_id, reference_number,
                    debit_amount, balance, processed_by, notes
                )
                SELECT
                    NEW.store_id, NEW.customer_id, NEW.sale_date, 'SALE_CREDIT',
                    'sale', NEW.id, NEW.invoice_number,
                    NEW.due_amount,
                    COALESCE((
                        SELECT balance FROM customer_ledger
                        WHERE customer_id = NEW.customer_id
                        ORDER BY entry_time DESC LIMIT 1
                    ), 0) + NEW.due_amount,
                    NEW.cashier_id,
                    'Credit sale: ' || NEW.invoice_number;

                -- Update customer outstanding balance
                UPDATE customers SET
                    outstanding_balance = outstanding_balance + NEW.due_amount,
                    updated_at = NOW()
                WHERE id = NEW.customer_id;
            END IF;
        END IF;

        -- Update shift totals
        IF NEW.shift_id IS NOT NULL THEN
            UPDATE cash_shifts SET
                total_sales_count = total_sales_count + 1,
                total_sales_amount = total_sales_amount + NEW.total_amount,
                total_discount_given = total_discount_given + NEW.discount_total,
                total_tax_collected = total_tax_collected + NEW.tax_amount,
                updated_at = NOW()
            WHERE id = NEW.shift_id;
        END IF;

    END IF;

    -- When a sale is CANCELLED
    IF OLD.status NOT IN ('CANCELLED') AND NEW.status = 'CANCELLED' THEN
        -- Restore inventory only if sale was previously completed
        IF OLD.status IN ('COMPLETED', 'CREDIT', 'PARTIAL_PAID') THEN
            INSERT INTO inventory_transactions (
                store_id, product_id, variant_id, transaction_type,
                transaction_date, quantity, unit_cost, total_cost,
                reference_type, reference_id, reference_number,
                performed_by, notes
            )
            SELECT
                si.store_id, si.product_id, si.variant_id, 'RETURN',
                NOW(), si.quantity, si.unit_cost, si.total_cost,
                'sale_cancellation', NEW.id, NEW.invoice_number,
                auth.uid(),
                'Cancellation of sale: ' || NEW.invoice_number
            FROM sale_items si
            WHERE si.sale_id = NEW.id AND si.is_void = false;
        END IF;

        -- Update shift totals on cancellation
        IF NEW.shift_id IS NOT NULL AND OLD.status IN ('COMPLETED', 'CREDIT', 'PARTIAL_PAID') THEN
            UPDATE cash_shifts SET
                total_sales_count = GREATEST(0, total_sales_count - 1),
                total_sales_amount = GREATEST(0, total_sales_amount - OLD.total_amount),
                updated_at = NOW()
            WHERE id = NEW.shift_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER handle_sale_completion_trigger
    AFTER UPDATE OF status ON sales
    FOR EACH ROW
    EXECUTE FUNCTION handle_sale_completion();

-- ============================================================================
-- TRIGGER FUNCTION: Restore inventory on return
-- Called when sale_return_items are inserted
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_inventory_on_return()
RETURNS TRIGGER AS $$
DECLARE
    v_return sale_returns%ROWTYPE;
BEGIN
    SELECT * INTO v_return FROM sale_returns WHERE id = NEW.return_id;

    -- Only restock if restock flag is true
    IF NEW.restock = true THEN
        INSERT INTO inventory_transactions (
            store_id, product_id, variant_id, transaction_type,
            transaction_date, quantity, unit_cost, total_cost,
            reference_type, reference_id, reference_number,
            performed_by, notes
        ) VALUES (
            NEW.store_id, NEW.product_id, NEW.variant_id, 'RETURN',
            NOW(), NEW.return_quantity, NEW.unit_cost,
            NEW.return_quantity * COALESCE(NEW.unit_cost, 0),
            'sale_return', NEW.return_id, v_return.return_number,
            auth.uid(),
            'Return of: ' || NEW.product_name || ' (Condition: ' || NEW.restock_condition || ')'
        );
    END IF;

    -- Update sale_items returned_quantity
    UPDATE sale_items
    SET returned_quantity = returned_quantity + NEW.return_quantity,
        is_returned = CASE
            WHEN returned_quantity + NEW.return_quantity >= quantity THEN true
            ELSE false
        END,
        updated_at = NOW()
    WHERE id = NEW.sale_item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER restore_inventory_on_return_trigger
    AFTER INSERT ON sale_return_items
    FOR EACH ROW
    EXECUTE FUNCTION restore_inventory_on_return();

-- ============================================================================
-- TRIGGER FUNCTION: Update sale status on return completion
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sale_status_on_return()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_id UUID;
    v_total_qty DECIMAL(12,3);
    v_returned_qty DECIMAL(12,3);
BEGIN
    -- Get sale_id from sale_items
    SELECT sale_id INTO v_sale_id FROM sale_items WHERE id = NEW.sale_item_id;

    -- Check total vs returned quantities
    SELECT
        SUM(quantity), SUM(returned_quantity)
    INTO v_total_qty, v_returned_qty
    FROM sale_items
    WHERE sale_id = v_sale_id AND is_void = false;

    -- Update sale status accordingly
    UPDATE sales SET
        status = CASE
            WHEN v_returned_qty >= v_total_qty THEN 'FULLY_RETURNED'
            WHEN v_returned_qty > 0 THEN 'PARTIAL_RETURN'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_sale_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_sale_status_on_return_trigger
    AFTER INSERT ON sale_return_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_status_on_return();

-- ============================================================================
-- TRIGGER FUNCTION: Ledger entry on payment received
-- When customer pays off credit balance
-- ============================================================================
CREATE OR REPLACE FUNCTION record_payment_in_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_sale sales%ROWTYPE;
    v_current_balance DECIMAL(12,2);
BEGIN
    -- Only process payments for credit/partial-paid sales
    SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;

    IF v_sale.customer_id IS NOT NULL AND
       v_sale.status IN ('CREDIT', 'PARTIAL_PAID') AND
       NEW.status = 'SUCCESS' THEN

        -- Get current customer balance
        SELECT COALESCE(balance, 0) INTO v_current_balance
        FROM customer_ledger
        WHERE customer_id = v_sale.customer_id
        ORDER BY entry_time DESC LIMIT 1;

        -- Insert credit entry
        INSERT INTO customer_ledger (
            store_id, customer_id, entry_date, transaction_type,
            reference_type, reference_id, reference_number,
            credit_amount, balance, payment_method, payment_reference,
            processed_by, notes
        ) VALUES (
            v_sale.store_id, v_sale.customer_id, CURRENT_DATE, 'PAYMENT_RECEIVED',
            'sale_payment', NEW.id, v_sale.invoice_number,
            NEW.amount, GREATEST(0, v_current_balance - NEW.amount),
            NEW.payment_method, COALESCE(NEW.upi_ref_number, NEW.transaction_id, NEW.authorization_code),
            NEW.created_by,
            'Payment received for: ' || v_sale.invoice_number
        );

        -- Update customer outstanding
        UPDATE customers SET
            outstanding_balance = GREATEST(0, outstanding_balance - NEW.amount),
            updated_at = NOW()
        WHERE id = v_sale.customer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER record_payment_in_ledger_trigger
    AFTER INSERT ON sale_payments
    FOR EACH ROW
    EXECUTE FUNCTION record_payment_in_ledger();

-- ============================================================================
-- TRIGGER FUNCTION: Update paid_amount and status after payment insert
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sale_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12,2);
    v_sale sales%ROWTYPE;
BEGIN
    SELECT * INTO v_sale FROM sales WHERE id = NEW.sale_id;

    -- Recalculate total paid from all successful payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM sale_payments
    WHERE sale_id = NEW.sale_id AND status = 'SUCCESS';

    -- Update sale paid/due
    UPDATE sales SET
        paid_amount = v_total_paid,
        due_amount = GREATEST(0, total_amount - v_total_paid),
        status = CASE
            WHEN v_total_paid >= total_amount AND status NOT IN ('CANCELLED', 'FULLY_RETURNED') THEN 'COMPLETED'
            WHEN v_total_paid > 0 AND status NOT IN ('CANCELLED', 'FULLY_RETURNED') THEN 'PARTIAL_PAID'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.sale_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_sale_paid_amount_trigger
    AFTER INSERT OR UPDATE OF status ON sale_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_paid_amount();

-- ============================================================================
-- TRIGGER FUNCTION: Close shift — calculate and snapshot all totals
-- ============================================================================
CREATE OR REPLACE FUNCTION close_shift(p_shift_id UUID, p_closing_cash_actual DECIMAL(12,2))
RETURNS JSONB AS $$
DECLARE
    v_shift cash_shifts%ROWTYPE;
    v_cash_expected DECIMAL(12,2);
    v_total_sales DECIMAL(12,2);
    v_total_returns DECIMAL(12,2);
    v_cash_payments DECIMAL(12,2);
    v_card_payments DECIMAL(12,2);
    v_upi_payments DECIMAL(12,2);
    v_other_payments DECIMAL(12,2);
BEGIN
    SELECT * INTO v_shift FROM cash_shifts WHERE id = p_shift_id FOR UPDATE;

    IF NOT FOUND OR v_shift.status != 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found or not open');
    END IF;

    -- Calculate payment totals from completed sales in this shift
    SELECT
        COALESCE(SUM(CASE WHEN sp.payment_method = 'CASH' THEN sp.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN sp.payment_method IN ('CARD_CREDIT', 'CARD_DEBIT') THEN sp.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN sp.payment_method = 'UPI' THEN sp.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN sp.payment_method NOT IN ('CASH', 'CARD_CREDIT', 'CARD_DEBIT', 'UPI') THEN sp.amount ELSE 0 END), 0)
    INTO v_cash_payments, v_card_payments, v_upi_payments, v_other_payments
    FROM sale_payments sp
    JOIN sales s ON sp.sale_id = s.id
    WHERE s.shift_id = p_shift_id
    AND s.status NOT IN ('CANCELLED', 'DRAFT', 'HOLD')
    AND sp.status = 'SUCCESS';

    -- Expected closing cash = opening + cash movements + cash sales
    SELECT
        v_shift.opening_cash + v_cash_payments
        + COALESCE(SUM(CASE WHEN movement_type = 'CASH_IN' THEN amount ELSE -amount END), 0)
    INTO v_cash_expected
    FROM cash_movements
    WHERE shift_id = p_shift_id;

    -- Get return totals
    SELECT COALESCE(SUM(sr.total_returned), 0) INTO v_total_returns
    FROM sale_returns sr
    JOIN sales s ON sr.sale_id = s.id
    WHERE s.shift_id = p_shift_id AND sr.status = 'COMPLETED';

    -- Close the shift
    UPDATE cash_shifts SET
        closed_at = NOW(),
        closed_by = auth.uid(),
        status = 'CLOSED',
        closing_cash_expected = v_cash_expected,
        closing_cash_actual = p_closing_cash_actual,
        total_returns_amount = v_total_returns,
        cash_sales = v_cash_payments,
        card_sales = v_card_payments,
        upi_sales = v_upi_payments,
        other_sales = v_other_payments,
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
        'success', true,
        'shift_id', p_shift_id,
        'closing_cash_expected', v_cash_expected,
        'closing_cash_actual', p_closing_cash_actual,
        'cash_difference', p_closing_cash_actual - v_cash_expected,
        'cash_sales', v_cash_payments,
        'card_sales', v_card_payments,
        'upi_sales', v_upi_payments
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- TRIGGER FUNCTION: Auto-create customer code
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TRIGGER AS $$
DECLARE
    v_store_code TEXT;
    v_counter INTEGER;
BEGIN
    IF NEW.customer_code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT store_code INTO v_store_code FROM stores WHERE id = NEW.store_id;

    SELECT COUNT(*) + 1 INTO v_counter
    FROM customers WHERE store_id = NEW.store_id;

    NEW.customer_code := v_store_code || '-CUST' || LPAD(v_counter::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_customer_code_trigger
    BEFORE INSERT ON customers
    FOR EACH ROW
    WHEN (NEW.customer_code IS NULL)
    EXECUTE FUNCTION generate_customer_code();

-- ============================================================================
-- TRIGGER FUNCTION: Validate shift is OPEN before sale insert
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_shift_open()
RETURNS TRIGGER AS $$
DECLARE
    v_shift_status shift_status;
BEGIN
    IF NEW.shift_id IS NOT NULL THEN
        SELECT status INTO v_shift_status FROM cash_shifts WHERE id = NEW.shift_id;
        IF v_shift_status IS NULL OR v_shift_status != 'OPEN' THEN
            RAISE EXCEPTION 'Cannot create sale: Cash shift is not open. Shift status: %',
                COALESCE(v_shift_status::TEXT, 'NOT_FOUND');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_shift_before_sale
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION validate_shift_open();

-- ============================================================================
-- TRIGGER FUNCTION: Validate credit limit before credit sale
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_credit_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_customer customers%ROWTYPE;
BEGIN
    IF NEW.is_credit_sale AND NEW.due_amount > 0 AND NEW.customer_id IS NOT NULL THEN
        SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;

        IF NOT v_customer.is_credit_allowed THEN
            RAISE EXCEPTION 'Credit sales not allowed for this customer';
        END IF;

        IF (v_customer.outstanding_balance + NEW.due_amount) > v_customer.credit_limit THEN
            RAISE EXCEPTION 'Credit limit exceeded. Limit: %, Current outstanding: %, New due: %',
                v_customer.credit_limit, v_customer.outstanding_balance, NEW.due_amount;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_credit_limit_trigger
    BEFORE UPDATE OF status ON sales
    FOR EACH ROW
    WHEN (NEW.status IN ('CREDIT', 'PARTIAL_PAID'))
    EXECUTE FUNCTION validate_credit_limit();

-- ============================================================================
-- TRIGGER FUNCTION: Prevent modifying COMPLETED/CANCELLED sales
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_completed_sale_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('COMPLETED', 'CANCELLED', 'FULLY_RETURNED') THEN
        -- Only managers/admins can modify closed sales
        IF NOT public.has_permission('void_transactions', OLD.store_id) AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Cannot modify a % sale without void_transactions permission', OLD.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_completed_sale_modification_trigger
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION prevent_completed_sale_modification();

-- ============================================================================
-- TRIGGER FUNCTION: Return validation — can't return more than sold
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_return_quantity()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_item sale_items%ROWTYPE;
BEGIN
    SELECT * INTO v_sale_item FROM sale_items WHERE id = NEW.sale_item_id;

    IF v_sale_item.quantity - v_sale_item.returned_quantity < NEW.return_quantity THEN
        RAISE EXCEPTION 'Cannot return % units. Only % units available for return for product: %',
            NEW.return_quantity,
            v_sale_item.quantity - v_sale_item.returned_quantity,
            v_sale_item.product_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_return_quantity_trigger
    BEFORE INSERT ON sale_return_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_return_quantity();

-- ============================================================================
-- updated_at triggers for new tables
-- ============================================================================
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_shifts_updated_at
    BEFORE UPDATE ON cash_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON sale_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_returns_updated_at
    BEFORE UPDATE ON sale_returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_notes_updated_at
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON POS QUERIES
-- ============================================================================

-- View: Sales summary with customer and cashier info
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT
    s.id,
    s.store_id,
    s.invoice_number,
    s.sale_date,
    s.sale_time,
    s.status,
    s.total_amount,
    s.paid_amount,
    s.due_amount,
    s.tax_amount,
    s.discount_total,
    s.is_credit_sale,
    -- Customer
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.customer_type,
    -- Cashier
    p.full_name AS cashier_name,
    -- Shift
    cs.shift_date,
    cs.terminal_name,
    -- Item count
    (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id AND si.is_void = false) AS item_count,
    (SELECT SUM(quantity) FROM sale_items si WHERE si.sale_id = s.id AND si.is_void = false) AS total_quantity
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN profiles p ON s.cashier_id = p.id
LEFT JOIN cash_shifts cs ON s.shift_id = cs.id;

-- View: Customer credit summary
CREATE OR REPLACE VIEW v_customer_credit_summary AS
SELECT
    c.id AS customer_id,
    c.store_id,
    c.name,
    c.phone,
    c.credit_limit,
    c.outstanding_balance,
    c.credit_days,
    c.is_credit_allowed,
    COALESCE(s.overdue_count, 0) AS overdue_invoices,
    COALESCE(s.oldest_due_days, 0) AS oldest_due_days
FROM customers c
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS overdue_count,
        MAX(CURRENT_DATE - credit_due_date) AS oldest_due_days
    FROM sales
    WHERE customer_id = c.id
    AND status IN ('CREDIT', 'PARTIAL_PAID')
    AND credit_due_date < CURRENT_DATE
) s ON true
WHERE c.outstanding_balance > 0;

-- View: Today's shift summary per store
CREATE OR REPLACE VIEW v_today_shift_summary AS
SELECT
    cs.id AS shift_id,
    cs.store_id,
    cs.terminal_id,
    cs.terminal_name,
    cs.status AS shift_status,
    cs.opened_at,
    cs.opening_cash,
    cs.total_sales_count,
    cs.total_sales_amount,
    cs.total_discount_given,
    cs.total_tax_collected,
    cs.cash_sales,
    cs.card_sales,
    cs.upi_sales,
    p.full_name AS cashier_name
FROM cash_shifts cs
LEFT JOIN profiles p ON cs.opened_by = p.id
WHERE cs.shift_date = CURRENT_DATE;

-- View: Product sales performance (for reporting)
CREATE OR REPLACE VIEW v_product_sales_report AS
SELECT
    si.store_id,
    si.product_id,
    si.product_name,
    si.product_code,
    DATE(s.sale_time) AS sale_date,
    SUM(si.quantity) AS total_quantity_sold,
    SUM(si.returned_quantity) AS total_returned,
    SUM(si.net_quantity) AS net_quantity_sold,
    SUM(si.total_amount) AS total_revenue,
    SUM(si.total_cost) AS total_cost,
    SUM(si.profit_amount) AS total_profit,
    CASE WHEN SUM(si.total_cost) > 0
        THEN ROUND(SUM(si.profit_amount) / SUM(si.total_cost) * 100, 2)
        ELSE 0
    END AS profit_percentage,
    COUNT(DISTINCT si.sale_id) AS transaction_count
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
WHERE s.status NOT IN ('CANCELLED', 'DRAFT', 'HOLD')
AND si.is_void = false
GROUP BY si.store_id, si.product_id, si.product_name, si.product_code, DATE(s.sale_time);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE customers IS 'POS customer master — phone is primary lookup key';
COMMENT ON TABLE cash_shifts IS 'Cash register shifts with opening/closing reconciliation';
COMMENT ON TABLE sales IS 'Master POS sale/invoice record — source of truth for all transactions';
COMMENT ON TABLE sale_items IS 'Line items in a sale — all prices are snapshots at time of sale';
COMMENT ON TABLE sale_payments IS 'Payment records — supports split payments across multiple methods';
COMMENT ON TABLE sale_returns IS 'Return/refund header linked to original sale';
COMMENT ON TABLE sale_return_items IS 'Individual returned items with restock control';
COMMENT ON TABLE customer_ledger IS 'Double-entry running ledger for customer credit tracking';
COMMENT ON TABLE invoice_sequences IS 'Thread-safe invoice number sequences per store per year';
COMMENT ON TABLE credit_notes IS 'Store credit issued to customers for returns';
COMMENT ON TABLE cash_movements IS 'Mid-shift cash-in/out log for reconciliation';

COMMENT ON COLUMN sale_items.unit_price IS 'Selling price per unit SNAPSHOT — never changes after sale';
COMMENT ON COLUMN sale_items.unit_cost IS 'Purchase cost SNAPSHOT — used for profit calculation';
COMMENT ON COLUMN sale_items.mrp IS 'Maximum Retail Price SNAPSHOT at time of sale';
COMMENT ON COLUMN sales.round_off IS 'Rounding adjustment, max ±₹0.50 as per Indian convention';
COMMENT ON COLUMN sales.invoice_number IS 'Generated via generate_invoice_number() — unique per store per FY';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ PHASE 3: POS BILLING SYSTEM — CREATED SUCCESSFULLY
    ============================================================================

    New Tables (11):
    30. customers           - POS customer master with loyalty & credit
    31. cash_shifts         - Cash register open/close with reconciliation
    32. sales               - Master invoice/transaction record
    33. sale_items          - Line items with price/cost snapshots
    34. sale_payments       - Multi-method split payment support
    35. sale_returns        - Return/refund header
    36. sale_return_items   - Returned items with restock control
    37. customer_ledger     - Running credit ledger (double-entry style)
    38. invoice_sequences   - Thread-safe FY-aware invoice numbering
    39. credit_notes        - Store credit issued to customers
    40. cash_movements      - Mid-shift cash-in/out log

    New ENUMs (5):
    ✓ sale_status          (DRAFT, HOLD, COMPLETED, CANCELLED, CREDIT, PARTIAL_PAID...)
    ✓ payment_method       (CASH, CARD, UPI, WALLET, CHEQUE, CREDIT_NOTE...)
    ✓ return_status        (INITIATED, APPROVED, REJECTED, COMPLETED...)
    ✓ shift_status         (OPEN, CLOSED, SUSPENDED)
    ✓ discount_type        (PERCENTAGE, FLAT_AMOUNT, LOYALTY...)

    Key Triggers (10):
    ✓ handle_sale_completion     → Deducts inventory on COMPLETED/CREDIT status
    ✓ restore_inventory_on_return → Restores stock when items are returned
    ✓ update_sale_status_on_return → Marks sale PARTIAL_RETURN / FULLY_RETURNED
    ✓ record_payment_in_ledger   → Adds credit entry to customer_ledger
    ✓ update_sale_paid_amount    → Recalculates paid/due after each payment
    ✓ validate_shift_open        → Prevents sales on closed shifts
    ✓ validate_credit_limit      → Blocks credit sales over credit limit
    ✓ validate_return_quantity   → Prevents over-returning
    ✓ prevent_completed_sale_modification → Protects closed bills
    ✓ generate_customer_code     → Auto-generates STORECODE-CUST0001 format

    Key Functions:
    ✓ generate_invoice_number()  → Thread-safe, FY-aware (INV/STORE/2025-26/0001)
    ✓ complete_sale()            → Atomic sale completion with status resolution
    ✓ close_shift()              → Shift closing with full reconciliation

    Total tables: 40 (Phase 1: 16 + Phase 2: 13 + Phase 3: 11)

    Architecture Rules Enforced:
    ✓ Inventory NEVER modified directly — always via inventory_transactions
    ✓ All prices/costs are SNAPSHOTS at time of sale
    ✓ Split payments fully supported
    ✓ GST breakdown (CGST/SGST/IGST) per line item and per sale
    ✓ Credit sales tracked in double-entry customer_ledger
    ✓ RLS on all 11 tables
    ✓ 35+ indexes for POS high-concurrency patterns

    ============================================================================
    ';
END $$;