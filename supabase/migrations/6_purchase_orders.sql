-- ============================================================================
-- PHASE 3: PURCHASE ORDER SYSTEM
-- Purchase Orders, Payments, Returns with Indian GST (CGST/SGST/IGST)
-- Depends on: 1_create_onboarding_system.sql (stores, store_users, roles)
--             5_inventory_supplier.sql (products, variants, units, suppliers, inventory)
-- ============================================================================

-- ============================================================================
-- 30. PURCHASE_ORDERS TABLE
-- Core purchase order header with GST treatment
-- ============================================================================
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Identification
    po_number TEXT NOT NULL,
    invoice_number TEXT,
    reference_number TEXT,

    -- Supplier
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_name TEXT NOT NULL,
    supplier_gstin TEXT,

    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    received_date DATE,
    invoice_date DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'partially_received', 'received', 'cancelled', 'returned')),

    -- Amounts
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,

    -- Tax (GST)
    taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    cgst_amount DECIMAL(14,2) DEFAULT 0,
    sgst_amount DECIMAL(14,2) DEFAULT 0,
    igst_amount DECIMAL(14,2) DEFAULT 0,
    cess_amount DECIMAL(14,2) DEFAULT 0,
    total_tax DECIMAL(14,2) DEFAULT 0,

    -- Additional charges
    shipping_charges DECIMAL(14,2) DEFAULT 0,
    other_charges DECIMAL(14,2) DEFAULT 0,
    round_off DECIMAL(14,2) DEFAULT 0,

    -- Grand total
    grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded')),
    paid_amount DECIMAL(14,2) DEFAULT 0,
    due_amount DECIMAL(14,2) DEFAULT 0,
    payment_due_date DATE,

    -- GST type
    is_inter_state BOOLEAN DEFAULT false,
    place_of_supply TEXT,

    -- Warehouse
    receiving_warehouse TEXT,
    receiving_notes TEXT,

    -- Approval
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,

    -- Cancellation
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Metadata
    notes TEXT,
    terms_and_conditions TEXT,
    internal_notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    attachment_urls TEXT[],

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    UNIQUE(store_id, po_number)
);

-- Indexes
CREATE INDEX idx_purchase_orders_store ON purchase_orders(store_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(store_id, status);
CREATE INDEX idx_purchase_orders_payment_status ON purchase_orders(store_id, payment_status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date DESC);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_invoice ON purchase_orders(invoice_number) WHERE invoice_number IS NOT NULL;

-- ============================================================================
-- 31. PURCHASE_ORDER_ITEMS TABLE
-- Line items with per-item GST breakdown
-- ============================================================================
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Product
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    barcode TEXT,
    hsn_code TEXT,

    -- Unit
    unit_id UUID REFERENCES units_of_measure(id),
    unit_code TEXT,

    -- Quantities
    ordered_quantity DECIMAL(12,3) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity DECIMAL(12,3) DEFAULT 0,
    returned_quantity DECIMAL(12,3) DEFAULT 0,
    pending_quantity DECIMAL(12,3) GENERATED ALWAYS AS (
        GREATEST(ordered_quantity - received_quantity - returned_quantity, 0)
    ) STORED,

    -- Pricing
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    mrp DECIMAL(12,2),

    -- Discount
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(14,2) DEFAULT 0,

    -- Line total (before tax)
    line_total DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Tax (GST rates)
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    cgst_percentage DECIMAL(5,2) DEFAULT 0,
    sgst_percentage DECIMAL(5,2) DEFAULT 0,
    igst_percentage DECIMAL(5,2) DEFAULT 0,
    cess_percentage DECIMAL(5,2) DEFAULT 0,

    -- Tax amounts
    cgst_amount DECIMAL(14,2) DEFAULT 0,
    sgst_amount DECIMAL(14,2) DEFAULT 0,
    igst_amount DECIMAL(14,2) DEFAULT 0,
    cess_amount DECIMAL(14,2) DEFAULT 0,
    tax_amount DECIMAL(14,2) DEFAULT 0,

    -- Total (line_total + tax)
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Batch tracking
    batch_number TEXT,
    manufacturing_date DATE,
    expiry_date DATE,

    -- Status
    item_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (item_status IN ('pending', 'partially_received', 'received', 'cancelled', 'returned')),

    -- Notes
    notes TEXT,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_expiry CHECK (
        expiry_date IS NULL OR manufacturing_date IS NULL OR expiry_date > manufacturing_date
    )
);

-- Indexes
CREATE INDEX idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);
CREATE INDEX idx_po_items_store ON purchase_order_items(store_id);
CREATE INDEX idx_po_items_status ON purchase_order_items(item_status);

-- ============================================================================
-- 32. PURCHASE_PAYMENTS TABLE
-- Payment records against purchase orders
-- ============================================================================
CREATE TABLE purchase_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Payment
    payment_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),

    -- Method
    payment_method TEXT NOT NULL DEFAULT 'cash'
        CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'credit_note', 'other')),
    transaction_reference TEXT,
    bank_name TEXT,
    cheque_number TEXT,
    cheque_date DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),

    -- Notes
    notes TEXT,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(store_id, payment_number)
);

-- Indexes
CREATE INDEX idx_purchase_payments_order ON purchase_payments(purchase_order_id);
CREATE INDEX idx_purchase_payments_store ON purchase_payments(store_id);
CREATE INDEX idx_purchase_payments_date ON purchase_payments(payment_date DESC);

-- ============================================================================
-- 33. PURCHASE_RETURNS TABLE
-- Return headers linked to purchase orders
-- ============================================================================
CREATE TABLE purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Identification
    return_number TEXT NOT NULL,
    debit_note_number TEXT,

    -- Supplier
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_name TEXT NOT NULL,

    -- Date
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Amounts
    subtotal DECIMAL(14,2) DEFAULT 0,
    cgst_amount DECIMAL(14,2) DEFAULT 0,
    sgst_amount DECIMAL(14,2) DEFAULT 0,
    igst_amount DECIMAL(14,2) DEFAULT 0,
    cess_amount DECIMAL(14,2) DEFAULT 0,
    total_tax DECIMAL(14,2) DEFAULT 0,
    grand_total DECIMAL(14,2) DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),

    -- Reason
    reason TEXT NOT NULL,

    -- Refund
    refund_status TEXT DEFAULT 'pending'
        CHECK (refund_status IN ('pending', 'refunded', 'credit_note', 'adjusted')),
    refund_amount DECIMAL(14,2) DEFAULT 0,

    -- Notes
    notes TEXT,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(store_id, return_number)
);

-- Indexes
CREATE INDEX idx_purchase_returns_order ON purchase_returns(purchase_order_id);
CREATE INDEX idx_purchase_returns_store ON purchase_returns(store_id);
CREATE INDEX idx_purchase_returns_supplier ON purchase_returns(supplier_id);

-- ============================================================================
-- 34. PURCHASE_RETURN_ITEMS TABLE
-- Individual return line items
-- ============================================================================
CREATE TABLE purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Product
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    hsn_code TEXT,

    -- Quantities
    return_quantity DECIMAL(12,3) NOT NULL CHECK (return_quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),

    -- Tax
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(14,2) DEFAULT 0,
    sgst_amount DECIMAL(14,2) DEFAULT 0,
    igst_amount DECIMAL(14,2) DEFAULT 0,
    cess_amount DECIMAL(14,2) DEFAULT 0,
    tax_amount DECIMAL(14,2) DEFAULT 0,

    -- Totals
    line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Batch
    batch_number TEXT,

    -- Reason
    reason TEXT,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_return_items_return ON purchase_return_items(purchase_return_id);
CREATE INDEX idx_return_items_product ON purchase_return_items(product_id);

-- ============================================================================
-- ENABLE RLS ON ALL PURCHASE TABLES
-- ============================================================================

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: PURCHASE_ORDERS
-- SELECT: manage_inventory, manage_suppliers, view_reports, view_financials
-- INSERT/UPDATE/DELETE: manage_inventory, manage_suppliers
-- ============================================================================

CREATE POLICY "Users can view purchase orders in their store" ON purchase_orders
    FOR SELECT USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('view_reports', store_id)
                OR public.has_permission('view_financials', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can create purchase orders" ON purchase_orders
    FOR INSERT WITH CHECK (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can update purchase orders" ON purchase_orders
    FOR UPDATE USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can delete purchase orders" ON purchase_orders
    FOR DELETE USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- RLS POLICIES: PURCHASE_ORDER_ITEMS
-- ============================================================================

CREATE POLICY "Users can view PO items in their store" ON purchase_order_items
    FOR SELECT USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('view_reports', store_id)
                OR public.has_permission('view_financials', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can manage PO items" ON purchase_order_items
    FOR ALL USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- RLS POLICIES: PURCHASE_PAYMENTS
-- ============================================================================

CREATE POLICY "Users can view purchase payments in their store" ON purchase_payments
    FOR SELECT USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('view_reports', store_id)
                OR public.has_permission('view_financials', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can manage purchase payments" ON purchase_payments
    FOR ALL USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- RLS POLICIES: PURCHASE_RETURNS
-- ============================================================================

CREATE POLICY "Users can view purchase returns in their store" ON purchase_returns
    FOR SELECT USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('view_reports', store_id)
                OR public.has_permission('view_financials', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can manage purchase returns" ON purchase_returns
    FOR ALL USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- RLS POLICIES: PURCHASE_RETURN_ITEMS
-- ============================================================================

CREATE POLICY "Users can view purchase return items in their store" ON purchase_return_items
    FOR SELECT USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('view_reports', store_id)
                OR public.has_permission('view_financials', store_id)
            )
        )
        OR public.is_super_admin()
    );

CREATE POLICY "Authorized users can manage purchase return items" ON purchase_return_items
    FOR ALL USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_inventory', store_id)
                OR public.has_permission('manage_suppliers', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- TRIGGER: AUTO-GENERATE PO NUMBER
-- Format: PO-{STORE_CODE}-{YYYYMMDD}-{SEQ}
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    v_store_code TEXT;
    v_date_part TEXT;
    v_seq INTEGER;
    v_po_number TEXT;
BEGIN
    -- Get store code
    SELECT store_code INTO v_store_code FROM stores WHERE id = NEW.store_id;

    -- Date part
    v_date_part := TO_CHAR(COALESCE(NEW.order_date, CURRENT_DATE), 'YYYYMMDD');

    -- Get next sequence for this store + date
    SELECT COALESCE(MAX(
        CAST(
            NULLIF(SPLIT_PART(po_number, '-', 4), '') AS INTEGER
        )
    ), 0) + 1
    INTO v_seq
    FROM purchase_orders
    WHERE store_id = NEW.store_id
    AND po_number LIKE 'PO-' || v_store_code || '-' || v_date_part || '-%';

    v_po_number := 'PO-' || v_store_code || '-' || v_date_part || '-' || LPAD(v_seq::TEXT, 4, '0');

    NEW.po_number := v_po_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_po_number_trigger
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
    EXECUTE FUNCTION generate_po_number();

-- ============================================================================
-- TRIGGER: AUTO-GENERATE PAYMENT NUMBER
-- Format: PAY-{STORE_CODE}-{YYYYMMDD}-{SEQ}
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
DECLARE
    v_store_code TEXT;
    v_date_part TEXT;
    v_seq INTEGER;
    v_payment_number TEXT;
BEGIN
    -- Get store code
    SELECT store_code INTO v_store_code FROM stores WHERE id = NEW.store_id;

    v_date_part := TO_CHAR(COALESCE(NEW.payment_date, CURRENT_DATE), 'YYYYMMDD');

    SELECT COALESCE(MAX(
        CAST(
            NULLIF(SPLIT_PART(payment_number, '-', 4), '') AS INTEGER
        )
    ), 0) + 1
    INTO v_seq
    FROM purchase_payments
    WHERE store_id = NEW.store_id
    AND payment_number LIKE 'PAY-' || v_store_code || '-' || v_date_part || '-%';

    v_payment_number := 'PAY-' || v_store_code || '-' || v_date_part || '-' || LPAD(v_seq::TEXT, 4, '0');

    NEW.payment_number := v_payment_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_payment_number_trigger
    BEFORE INSERT ON purchase_payments
    FOR EACH ROW
    WHEN (NEW.payment_number IS NULL OR NEW.payment_number = '')
    EXECUTE FUNCTION generate_payment_number();

-- ============================================================================
-- TRIGGER: AUTO-GENERATE RETURN NUMBER
-- Format: RET-{STORE_CODE}-{YYYYMMDD}-{SEQ}
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
    v_store_code TEXT;
    v_date_part TEXT;
    v_seq INTEGER;
    v_return_number TEXT;
BEGIN
    -- Get store code
    SELECT store_code INTO v_store_code FROM stores WHERE id = NEW.store_id;

    v_date_part := TO_CHAR(COALESCE(NEW.return_date, CURRENT_DATE), 'YYYYMMDD');

    SELECT COALESCE(MAX(
        CAST(
            NULLIF(SPLIT_PART(return_number, '-', 4), '') AS INTEGER
        )
    ), 0) + 1
    INTO v_seq
    FROM purchase_returns
    WHERE store_id = NEW.store_id
    AND return_number LIKE 'RET-' || v_store_code || '-' || v_date_part || '-%';

    v_return_number := 'RET-' || v_store_code || '-' || v_date_part || '-' || LPAD(v_seq::TEXT, 4, '0');

    NEW.return_number := v_return_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_return_number_trigger
    BEFORE INSERT ON purchase_returns
    FOR EACH ROW
    WHEN (NEW.return_number IS NULL OR NEW.return_number = '')
    EXECUTE FUNCTION generate_return_number();

-- ============================================================================
-- TRIGGER: RECALCULATE PO TOTALS ON ITEM INSERT/UPDATE/DELETE
-- Aggregates all items into the PO header totals
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
    v_subtotal DECIMAL(14,2);
    v_discount DECIMAL(14,2);
    v_taxable DECIMAL(14,2);
    v_cgst DECIMAL(14,2);
    v_sgst DECIMAL(14,2);
    v_igst DECIMAL(14,2);
    v_cess DECIMAL(14,2);
    v_total_tax DECIMAL(14,2);
    v_shipping DECIMAL(14,2);
    v_other DECIMAL(14,2);
    v_round_off DECIMAL(14,2);
BEGIN
    -- Determine which PO to recalculate
    IF TG_OP = 'DELETE' THEN
        v_po_id := OLD.purchase_order_id;
    ELSE
        v_po_id := NEW.purchase_order_id;
    END IF;

    -- Aggregate from all items
    SELECT
        COALESCE(SUM(ordered_quantity * unit_price), 0),
        COALESCE(SUM(discount_amount), 0),
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(cgst_amount), 0),
        COALESCE(SUM(sgst_amount), 0),
        COALESCE(SUM(igst_amount), 0),
        COALESCE(SUM(cess_amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_discount, v_taxable, v_cgst, v_sgst, v_igst, v_cess, v_total_tax
    FROM purchase_order_items
    WHERE purchase_order_id = v_po_id
    AND item_status != 'cancelled';

    -- Get existing additional charges from the PO
    SELECT
        COALESCE(shipping_charges, 0),
        COALESCE(other_charges, 0),
        COALESCE(round_off, 0)
    INTO v_shipping, v_other, v_round_off
    FROM purchase_orders
    WHERE id = v_po_id;

    -- Update PO header
    UPDATE purchase_orders
    SET
        subtotal = v_subtotal,
        discount_amount = v_discount,
        taxable_amount = v_taxable,
        cgst_amount = v_cgst,
        sgst_amount = v_sgst,
        igst_amount = v_igst,
        cess_amount = v_cess,
        total_tax = v_total_tax,
        grand_total = v_taxable + v_total_tax + v_shipping + v_other + v_round_off,
        due_amount = (v_taxable + v_total_tax + v_shipping + v_other + v_round_off) - COALESCE(paid_amount, 0),
        updated_at = NOW()
    WHERE id = v_po_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_po_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_po_totals();

-- ============================================================================
-- TRIGGER: UPDATE PAYMENT STATUS ON PAYMENT INSERT/UPDATE/DELETE
-- Automatically sets payment_status and paid/due amounts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_po_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
    v_total_paid DECIMAL(14,2);
    v_grand_total DECIMAL(14,2);
    v_new_status TEXT;
BEGIN
    -- Determine which PO
    IF TG_OP = 'DELETE' THEN
        v_po_id := OLD.purchase_order_id;
    ELSE
        v_po_id := NEW.purchase_order_id;
    END IF;

    -- Sum all completed/pending payments (exclude cancelled/failed)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM purchase_payments
    WHERE purchase_order_id = v_po_id
    AND status IN ('completed', 'pending');

    -- Get grand total
    SELECT COALESCE(grand_total, 0)
    INTO v_grand_total
    FROM purchase_orders
    WHERE id = v_po_id;

    -- Determine payment status
    IF v_total_paid <= 0 THEN
        v_new_status := 'unpaid';
    ELSIF v_total_paid >= v_grand_total THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partially_paid';
    END IF;

    -- Update the PO
    UPDATE purchase_orders
    SET
        paid_amount = v_total_paid,
        due_amount = GREATEST(v_grand_total - v_total_paid, 0),
        payment_status = v_new_status,
        updated_at = NOW()
    WHERE id = v_po_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON purchase_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_po_payment_status();

-- ============================================================================
-- TRIGGER: PREVENT DELETION OF NON-DRAFT PURCHASE ORDERS
-- Only draft POs can be deleted; confirmed/received/etc. must be cancelled
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_non_draft_po_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'draft' THEN
        RAISE EXCEPTION 'Cannot delete purchase order with status "%". Only draft orders can be deleted.', OLD.status;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_non_draft_po_deletion_trigger
    BEFORE DELETE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION prevent_non_draft_po_deletion();

-- ============================================================================
-- TRIGGER: UPDATE PO STATUS WHEN ITEM STATUSES CHANGE
-- Determines partially_received / received based on item states
-- ============================================================================

CREATE OR REPLACE FUNCTION update_po_status_on_item_change()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
    v_po_status TEXT;
    v_total_items INTEGER;
    v_received_items INTEGER;
    v_partially_received INTEGER;
    v_new_status TEXT;
BEGIN
    v_po_id := NEW.purchase_order_id;

    -- Get current PO status
    SELECT status INTO v_po_status FROM purchase_orders WHERE id = v_po_id;

    -- Only process for confirmed or partially_received POs
    IF v_po_status NOT IN ('confirmed', 'partially_received') THEN
        RETURN NEW;
    END IF;

    -- Count item statuses (exclude cancelled)
    SELECT
        COUNT(*) FILTER (WHERE item_status != 'cancelled'),
        COUNT(*) FILTER (WHERE item_status = 'received'),
        COUNT(*) FILTER (WHERE item_status = 'partially_received')
    INTO v_total_items, v_received_items, v_partially_received
    FROM purchase_order_items
    WHERE purchase_order_id = v_po_id;

    -- Decide new PO status
    IF v_total_items > 0 AND v_received_items = v_total_items THEN
        v_new_status := 'received';
    ELSIF v_received_items > 0 OR v_partially_received > 0 THEN
        v_new_status := 'partially_received';
    ELSE
        v_new_status := v_po_status; -- Keep current
    END IF;

    -- Update PO status if changed
    IF v_new_status != v_po_status THEN
        UPDATE purchase_orders
        SET
            status = v_new_status,
            received_date = CASE WHEN v_new_status = 'received' THEN CURRENT_DATE ELSE received_date END,
            updated_at = NOW()
        WHERE id = v_po_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_po_status_on_item_status_change
    AFTER UPDATE OF item_status ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_status_on_item_change();

-- ============================================================================
-- TRIGGER: UPDATE INVENTORY WHEN ITEMS ARE RECEIVED
-- Creates inventory_transactions when received_quantity changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_on_po_receive()
RETURNS TRIGGER AS $$
DECLARE
    v_qty_diff DECIMAL(12,3);
    v_store_id UUID;
    v_po_number TEXT;
BEGIN
    -- Only fire when received_quantity actually increases
    v_qty_diff := NEW.received_quantity - COALESCE(OLD.received_quantity, 0);

    IF v_qty_diff <= 0 THEN
        RETURN NEW;
    END IF;

    -- Get store_id and po_number
    SELECT po.store_id, po.po_number
    INTO v_store_id, v_po_number
    FROM purchase_orders po
    WHERE po.id = NEW.purchase_order_id;

    -- Insert an inventory transaction (will trigger update_inventory_on_transaction from migration 5)
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
        expiry_date,
        manufacturing_date,
        performed_by,
        notes
    ) VALUES (
        v_store_id,
        NEW.product_id,
        NEW.variant_id,
        'PURCHASE',
        NOW(),
        v_qty_diff,
        NEW.unit_price,
        v_qty_diff * NEW.unit_price,
        'purchase_order',
        NEW.purchase_order_id,
        v_po_number,
        NEW.batch_number,
        NEW.expiry_date,
        NEW.manufacturing_date,
        auth.uid(),
        'Received via PO: ' || v_po_number
    );

    -- Update item_status based on received vs ordered
    IF NEW.received_quantity >= NEW.ordered_quantity THEN
        NEW.item_status := 'received';
    ELSIF NEW.received_quantity > 0 THEN
        NEW.item_status := 'partially_received';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_on_po_receive_trigger
    BEFORE UPDATE OF received_quantity ON purchase_order_items
    FOR EACH ROW
    WHEN (NEW.received_quantity IS DISTINCT FROM OLD.received_quantity)
    EXECUTE FUNCTION update_inventory_on_po_receive();

-- ============================================================================
-- TRIGGER: HANDLE PURCHASE RETURN COMPLETED
-- Deducts inventory when a return is marked as completed
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_purchase_return_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_store_id UUID;
    v_return_number TEXT;
    v_po_number TEXT;
BEGIN
    -- Only fire when status changes to 'completed'
    IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
        RETURN NEW;
    END IF;

    v_store_id := NEW.store_id;
    v_return_number := NEW.return_number;

    -- Get PO number for reference
    SELECT po_number INTO v_po_number
    FROM purchase_orders WHERE id = NEW.purchase_order_id;

    -- Iterate over return items and create RETURN transactions
    FOR v_item IN
        SELECT * FROM purchase_return_items
        WHERE purchase_return_id = NEW.id
    LOOP
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
        ) VALUES (
            v_store_id,
            v_item.product_id,
            v_item.variant_id,
            'RETURN',
            NOW(),
            v_item.return_quantity,
            v_item.unit_price,
            v_item.return_quantity * v_item.unit_price,
            'purchase_return',
            NEW.id,
            v_return_number,
            v_item.batch_number,
            auth.uid(),
            'Purchase return: ' || v_return_number || ' (PO: ' || v_po_number || ')'
        );

        -- Update the PO item's returned_quantity if linked
        IF v_item.purchase_order_item_id IS NOT NULL THEN
            UPDATE purchase_order_items
            SET
                returned_quantity = returned_quantity + v_item.return_quantity,
                item_status = CASE
                    WHEN (returned_quantity + v_item.return_quantity) >= received_quantity THEN 'returned'
                    ELSE item_status
                END,
                updated_at = NOW()
            WHERE id = v_item.purchase_order_item_id;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_purchase_return_completed_trigger
    BEFORE UPDATE OF status ON purchase_returns
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION handle_purchase_return_completed();

-- ============================================================================
-- TRIGGER: AUTO-UPDATE updated_at TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_purchase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_updated_at();

CREATE TRIGGER purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_updated_at();

CREATE TRIGGER purchase_payments_updated_at
    BEFORE UPDATE ON purchase_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_updated_at();

CREATE TRIGGER purchase_returns_updated_at
    BEFORE UPDATE ON purchase_returns
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_updated_at();

-- ============================================================================
-- RPC FUNCTION: GET PURCHASE DASHBOARD STATS
-- Returns aggregated purchase statistics for a store
-- ============================================================================

CREATE OR REPLACE FUNCTION get_purchase_dashboard_stats(p_store_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Permission check
    IF NOT (
        public.has_permission('manage_inventory', p_store_id)
        OR public.has_permission('manage_suppliers', p_store_id)
        OR public.has_permission('view_reports', p_store_id)
        OR public.has_permission('view_financials', p_store_id)
        OR public.is_super_admin()
    ) THEN
        RAISE EXCEPTION 'Access denied: insufficient permissions';
    END IF;

    SELECT json_build_object(
        'total_orders', COUNT(*),
        'draft_orders', COUNT(*) FILTER (WHERE status = 'draft'),
        'confirmed_orders', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'received_orders', COUNT(*) FILTER (WHERE status = 'received'),
        'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'total_amount', COALESCE(SUM(grand_total), 0),
        'paid_amount', COALESCE(SUM(paid_amount), 0),
        'unpaid_amount', COALESCE(SUM(due_amount), 0),
        'unpaid_orders', COUNT(*) FILTER (WHERE payment_status IN ('unpaid', 'partially_paid') AND status != 'cancelled'),
        'this_month_total', COALESCE(SUM(grand_total) FILTER (
            WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0),
        'this_month_count', COUNT(*) FILTER (
            WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
        ),
        'overdue_payments', COUNT(*) FILTER (
            WHERE payment_due_date < CURRENT_DATE
            AND payment_status IN ('unpaid', 'partially_paid')
            AND status NOT IN ('cancelled', 'returned')
        )
    ) INTO v_result
    FROM purchase_orders
    WHERE store_id = p_store_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- RPC FUNCTION: GET SUPPLIER PURCHASE SUMMARY
-- Returns purchase statistics for a specific supplier within a store
-- ============================================================================

CREATE OR REPLACE FUNCTION get_supplier_purchase_summary(p_store_id UUID, p_supplier_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Permission check
    IF NOT (
        public.has_permission('manage_inventory', p_store_id)
        OR public.has_permission('manage_suppliers', p_store_id)
        OR public.has_permission('view_reports', p_store_id)
        OR public.has_permission('view_financials', p_store_id)
        OR public.is_super_admin()
    ) THEN
        RAISE EXCEPTION 'Access denied: insufficient permissions';
    END IF;

    SELECT json_build_object(
        'total_orders', COUNT(*),
        'total_amount', COALESCE(SUM(grand_total), 0),
        'paid_amount', COALESCE(SUM(paid_amount), 0),
        'pending_amount', COALESCE(SUM(due_amount), 0),
        'last_order_date', MAX(order_date),
        'average_order_value', CASE
            WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(grand_total), 0) / COUNT(*), 2)
            ELSE 0
        END,
        'return_count', (
            SELECT COUNT(*)
            FROM purchase_returns pr
            WHERE pr.store_id = p_store_id
            AND pr.supplier_id = p_supplier_id
            AND pr.status != 'cancelled'
        )
    ) INTO v_result
    FROM purchase_orders
    WHERE store_id = p_store_id
    AND supplier_id = p_supplier_id
    AND status != 'cancelled';

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE purchase_orders IS 'Purchase order headers with supplier, GST, and payment tracking';
COMMENT ON TABLE purchase_order_items IS 'Purchase order line items with per-item GST breakdown (CGST/SGST or IGST)';
COMMENT ON TABLE purchase_payments IS 'Payment records against purchase orders (cash, cheque, bank transfer, UPI)';
COMMENT ON TABLE purchase_returns IS 'Purchase return headers with debit note reference and refund tracking';
COMMENT ON TABLE purchase_return_items IS 'Purchase return line items with quantity, reason, and tax breakdown';

COMMENT ON FUNCTION generate_po_number() IS 'Auto-generates PO number: PO-{STORE_CODE}-{YYYYMMDD}-{SEQ}';
COMMENT ON FUNCTION generate_payment_number() IS 'Auto-generates payment number: PAY-{STORE_CODE}-{YYYYMMDD}-{SEQ}';
COMMENT ON FUNCTION generate_return_number() IS 'Auto-generates return number: RET-{STORE_CODE}-{YYYYMMDD}-{SEQ}';
COMMENT ON FUNCTION recalculate_po_totals() IS 'Recalculates PO totals when items are added/updated/removed';
COMMENT ON FUNCTION update_po_payment_status() IS 'Updates PO payment status based on sum of payments';
COMMENT ON FUNCTION prevent_non_draft_po_deletion() IS 'Prevents deletion of non-draft purchase orders';
COMMENT ON FUNCTION update_po_status_on_item_change() IS 'Updates PO status based on item receive statuses';
COMMENT ON FUNCTION update_inventory_on_po_receive() IS 'Creates inventory_transactions when PO items are received';
COMMENT ON FUNCTION handle_purchase_return_completed() IS 'Creates RETURN inventory_transactions and updates PO items when return is completed';
COMMENT ON FUNCTION get_purchase_dashboard_stats(UUID) IS 'RPC: Aggregated purchase statistics for a store';
COMMENT ON FUNCTION get_supplier_purchase_summary(UUID, UUID) IS 'RPC: Per-supplier purchase statistics';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ PHASE 3: PURCHASE ORDER SYSTEM ADDED SUCCESSFULLY
    ============================================================================

    Added 5 new tables:
    30. purchase_orders        - PO headers with GST and payment tracking
    31. purchase_order_items   - Line items with per-item CGST/SGST/IGST
    32. purchase_payments      - Payment records (cash, cheque, UPI, bank)
    33. purchase_returns       - Return headers with debit note
    34. purchase_return_items  - Return line items with tax

    Total tables now: 34 (29 previous + 5 new)

    Triggers:
    ✓ Auto-generate PO number (PO-STORE-DATE-SEQ)
    ✓ Auto-generate payment number (PAY-STORE-DATE-SEQ)
    ✓ Auto-generate return number (RET-STORE-DATE-SEQ)
    ✓ Recalculate PO totals on item changes
    ✓ Update payment status on payment changes
    ✓ Prevent deletion of non-draft orders
    ✓ Update PO status on item receive
    ✓ Update inventory on item receive
    ✓ Handle purchase return (inventory deduction)
    ✓ Auto-update updated_at timestamps

    RLS Policies:
    ✓ SELECT: manage_inventory, manage_suppliers, view_reports, view_financials
    ✓ INSERT/UPDATE/DELETE: manage_inventory, manage_suppliers
    ✓ Super admin: full access

    RPC Functions:
    ✓ get_purchase_dashboard_stats(store_id)
    ✓ get_supplier_purchase_summary(store_id, supplier_id)

    GST Support:
    ✓ Intra-state: CGST + SGST
    ✓ Inter-state: IGST
    ✓ Cess support
    ✓ HSN codes per item

    Next: Phase 4 - POS Billing System
    ============================================================================
    ';
END $$;