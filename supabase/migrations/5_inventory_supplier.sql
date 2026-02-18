-- ============================================================================
-- PHASE 2: BUSINESS DATA SETUP TABLES
-- Supplier Management, Product Management, Inventory
-- Add this to your existing Supabase schema
-- ============================================================================

-- First enable the pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 17. UNITS_OF_MEASURE TABLE
-- Product units (kg, pcs, box, dozen, etc.)
-- ============================================================================
CREATE TABLE units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Unit Details
    name TEXT NOT NULL, -- Kilogram, Piece, Box, Dozen
    code TEXT NOT NULL, -- kg, pcs, box, dz
    symbol TEXT, -- kg, pcs, 📦
    
    -- Category (for grouping)
    category TEXT, -- weight, quantity, volume, length
    
    -- Conversion (for base unit)
    is_base_unit BOOLEAN DEFAULT false,
    base_unit_id UUID REFERENCES units_of_measure(id),
    conversion_factor DECIMAL(10,4), -- e.g., 1 dozen = 12 pieces
    
    -- Decimals allowed
    decimal_places INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(store_id, code),
    UNIQUE(store_id, name)
);

-- ============================================================================
-- 18. SUPPLIERS TABLE (Distributors)
-- ============================================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Basic Info
    supplier_code TEXT NOT NULL,
    name TEXT NOT NULL,
    legal_name TEXT,
    type TEXT DEFAULT 'distributor', -- manufacturer, distributor, wholesaler, retailer
    
    -- GST & Tax Info
    gstin TEXT,
    pan_number TEXT,
    tan_number TEXT,
    msme_number TEXT,
    
    -- Primary Contact
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    whatsapp TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    landmark TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    
    -- Bank Details
    bank_name TEXT,
    bank_account_number TEXT, -- Will be encrypted
    ifsc_code TEXT,
    bank_branch TEXT,
    upi_id TEXT,
    
    -- Payment Terms
    payment_terms TEXT DEFAULT 'immediate', -- immediate, 7_days, 15_days, 30_days, 45_days, 60_days
    credit_limit DECIMAL(12,2),
    credit_days INTEGER DEFAULT 0,
    
    -- Purchase Settings
    default_discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false,
    blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    
    -- Metadata
    website TEXT,
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(store_id, supplier_code),
    CONSTRAINT valid_supplier_gstin CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$'),
    CONSTRAINT valid_supplier_pan CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
);

-- ============================================================================
-- 19. SUPPLIER_CONTACTS TABLE
-- Multiple contacts per supplier
-- ============================================================================
CREATE TABLE supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Contact Info
    name TEXT NOT NULL,
    designation TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    
    -- Role
    is_primary BOOLEAN DEFAULT false,
    is_authorized BOOLEAN DEFAULT true, -- Can place orders
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 20. CATEGORIES TABLE
-- Product categories (hierarchical)
-- ============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Category Details
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    path TEXT, -- Materialized path: /Electronics/Mobiles/Smartphones
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    icon TEXT,
    image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_leaf BOOLEAN DEFAULT true, -- Can have products
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(store_id, name, parent_id)
);

-- ============================================================================
-- 21. PRODUCTS TABLE (with barcode for POS scanning)
-- Core product master data
-- ============================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Product Identification
    product_code TEXT NOT NULL, -- Internal SKU (store's own code)
    barcode TEXT, -- Manufacturer barcode (GTIN, EAN-13, UPC-A, etc.) - THIS IS SCANNED AT POS
    alternate_barcodes TEXT[], -- Multiple barcodes for same product (if product has multiple barcodes)
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    
    -- Categorization
    category_id UUID REFERENCES categories(id),
    brand TEXT,
    model TEXT,
    
    -- Tax & Compliance (GST)
    hsn_code TEXT, -- HSN/SAC code for GST
    gst_percentage DECIMAL(5,2) DEFAULT 0, -- GST rate (0, 5, 12, 18, 28)
    cess_percentage DECIMAL(5,2) DEFAULT 0, -- Cess if applicable
    
    -- Pricing
    mrp DECIMAL(12,2) NOT NULL, -- Maximum Retail Price (printed on product)
    selling_price DECIMAL(12,2) NOT NULL, -- Actual selling price (may be less than MRP)
    purchase_price DECIMAL(12,2), -- Last purchase price from supplier
    
    -- Costing
    average_cost DECIMAL(12,2), -- Weighted average cost for inventory valuation
    
    -- Units
    unit_id UUID REFERENCES units_of_measure(id), -- kg, pcs, box, etc.
    
    -- Inventory Settings
    minimum_stock INTEGER DEFAULT 0, -- Low stock alert threshold
    reorder_level INTEGER DEFAULT 0, -- When to reorder
    is_batch_tracked BOOLEAN DEFAULT false, -- For expiry tracking (medicines, food)
    
    -- Product Status
    is_active BOOLEAN DEFAULT true,
    is_taxable BOOLEAN DEFAULT true,
    
    -- Images
    primary_image TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(store_id, product_code), -- SKU must be unique per store
    UNIQUE(store_id, barcode) -- Barcode must be unique per store (if provided)
);

-- CRITICAL: Index for barcode lookups (for POS scanning)
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Indexes for product searches (without trigram to avoid extension dependency)
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_hsn_code ON products(hsn_code);
CREATE INDEX idx_products_name ON products(name); -- Regular B-tree index on name

-- ============================================================================
-- 22. PRODUCT_BARCODES TABLE (For products with multiple barcodes)
-- Some products may have multiple barcodes (e.g., same product different packaging)
-- ============================================================================
CREATE TABLE product_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Barcode
    barcode TEXT NOT NULL,
    barcode_type TEXT DEFAULT 'EAN13', -- EAN13, UPC, CODE128, etc.
    
    -- Which price to use with this barcode
    price_type TEXT DEFAULT 'selling', -- selling, mrp, wholesale
    
    -- Status
    is_primary BOOLEAN DEFAULT false, -- Is this the main barcode?
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, barcode) -- Barcode must be unique per store
);

-- Index for quick barcode lookup
CREATE INDEX idx_product_barcodes_barcode ON product_barcodes(barcode) WHERE is_active = true;

-- ============================================================================
-- 23. PRODUCT_VARIANTS TABLE
-- For products with variants (size, color, flavor, etc.) - each may have own barcode
-- ============================================================================
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Variant Identification
    variant_code TEXT NOT NULL, -- Internal variant SKU
    barcode TEXT, -- Manufacturer barcode for this variant (scanned at POS)
    name TEXT, -- e.g., "Coca-Cola 500ml", "Red - Large"
    
    -- Variant Attributes
    attributes JSONB NOT NULL, -- {"color": "Red", "size": "Large", "flavor": "Cola"}
    
    -- Pricing (override parent if different)
    mrp DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Image
    image_url TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, variant_code),
    UNIQUE(store_id, barcode) -- Variant barcode must be unique per store
);

-- Index for variant barcode lookups
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;

-- ============================================================================
-- 24. INVENTORY TABLE
-- Current stock levels per store/product
-- ============================================================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    -- Stock Quantities
    quantity_on_hand DECIMAL(12,3) DEFAULT 0, -- Physical stock
    quantity_committed DECIMAL(12,3) DEFAULT 0, -- Reserved for orders
    quantity_available DECIMAL(12,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_committed) STORED,
    quantity_in_transit DECIMAL(12,3) DEFAULT 0, -- Coming from purchase orders
    
    -- Stock Status
    reorder_point DECIMAL(12,3) DEFAULT 0,
    maximum_stock DECIMAL(12,3),
    
    -- Location
    location TEXT, -- Shelf, rack, bin
    warehouse TEXT,
    
    -- Tracking
    last_counted_at TIMESTAMPTZ,
    last_counted_by UUID REFERENCES auth.users(id),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Valuation
    average_cost DECIMAL(12,2),
    total_value DECIMAL(12,2) GENERATED ALWAYS AS (quantity_on_hand * average_cost) STORED,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, product_id, variant_id)
);

-- Index for low stock alerts
CREATE INDEX idx_inventory_low_stock ON inventory(store_id) 
WHERE quantity_on_hand <= reorder_point;

-- ============================================================================
-- 25. INVENTORY_TRANSACTIONS TABLE
-- Stock movement history
-- ============================================================================
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    -- Transaction Details
    transaction_type TEXT NOT NULL, -- PURCHASE, SALE, RETURN, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, DAMAGE, EXPIRY
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Quantities
    quantity DECIMAL(12,3) NOT NULL,
    previous_quantity DECIMAL(12,3),
    new_quantity DECIMAL(12,3),
    
    -- Valuation
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    
    -- Reference (Polymorphic)
    reference_type TEXT, -- purchase_order, sales_invoice, stock_adjustment, etc.
    reference_id UUID,
    reference_number TEXT,
    
    -- Batch/Serial Tracking
    batch_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    manufacturing_date DATE,
    
    -- Reason (for adjustments)
    reason TEXT,
    
    -- Location
    from_location TEXT,
    to_location TEXT,
    
    -- Performed by
    performed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for inventory transactions
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(store_id, product_id, transaction_date DESC);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(transaction_date DESC);

-- ============================================================================
-- 26. PRODUCT_BATCHES TABLE
-- For batch/lot tracking (expiry items like medicines, food)
-- ============================================================================
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Batch Details
    batch_number TEXT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    mrp DECIMAL(12,2),
    
    -- Quantities
    initial_quantity DECIMAL(12,3) NOT NULL,
    current_quantity DECIMAL(12,3) NOT NULL,
    
    -- Purchase Info
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    supplier_id UUID REFERENCES suppliers(id),
    purchase_invoice TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, batch_number, product_id)
);

-- Index for expiry tracking
CREATE INDEX idx_product_batches_expiry ON product_batches(expiry_date) WHERE is_active = true;

-- ============================================================================
-- 27. SUPPLIER_PRODUCTS TABLE
-- Supplier-specific product details (pricing, lead time)
-- ============================================================================
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Supplier's Product Info
    supplier_product_code TEXT,
    supplier_product_name TEXT,
    
    -- Pricing
    purchase_price DECIMAL(12,2) NOT NULL,
    mrp DECIMAL(12,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Lead Time & Minimum Order
    lead_time_days INTEGER, -- Days to deliver
    minimum_order_quantity INTEGER DEFAULT 1,
    
    -- Status
    is_preferred BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(supplier_id, product_id)
);

-- ============================================================================
-- 28. PRICE_HISTORY TABLE
-- Track price changes over time
-- ============================================================================
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    -- Price Change
    price_type TEXT NOT NULL, -- PURCHASE, SELLING, MRP
    old_price DECIMAL(12,2),
    new_price DECIMAL(12,2),
    
    -- Change Reason
    reason TEXT,
    
    -- Effective Dates
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    
    -- Changed by
    changed_by UUID REFERENCES auth.users(id),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 29. STOCK_ALERTS TABLE
-- Low stock and expiry notifications
-- ============================================================================
CREATE TABLE stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    batch_id UUID REFERENCES product_batches(id),
    
    -- Alert Type
    alert_type TEXT NOT NULL, -- LOW_STOCK, EXPIRY, OVERSTOCK
    severity TEXT DEFAULT 'medium', -- low, medium, high, critical
    
    -- Alert Details
    current_quantity DECIMAL(12,3),
    threshold_quantity DECIMAL(12,3),
    expiry_date DATE,
    
    -- Status
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unresolved alerts
CREATE INDEX idx_stock_alerts_unresolved ON stock_alerts(store_id, alert_type) WHERE NOT is_resolved;

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Units of Measure policies
CREATE POLICY "Users can view units in their store" ON units_of_measure
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage units" ON units_of_measure
    FOR ALL USING (
        (public.has_permission('manage_inventory', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Suppliers policies
CREATE POLICY "Users can view suppliers in their store" ON suppliers
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Store admins and managers can manage suppliers" ON suppliers
    FOR ALL USING (
        (public.has_permission('manage_suppliers', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Supplier contacts policies
CREATE POLICY "Users can view supplier contacts" ON supplier_contacts
    FOR SELECT USING (
        supplier_id IN (SELECT id FROM suppliers WHERE store_id = public.get_user_store())
        OR public.is_super_admin()
    );

CREATE POLICY "Store admins can manage supplier contacts" ON supplier_contacts
    FOR ALL USING (
        supplier_id IN (SELECT id FROM suppliers WHERE store_id = public.get_user_store() 
            AND public.has_permission('manage_suppliers', store_id))
        OR public.is_super_admin()
    );

-- Categories policies
CREATE POLICY "Users can view categories in their store" ON categories
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage categories" ON categories
    FOR ALL USING (
        (public.has_permission('manage_categories', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Products policies
CREATE POLICY "Users can view products in their store" ON products
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage products" ON products
    FOR ALL USING (
        (public.has_permission('manage_products', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Product barcodes policies
CREATE POLICY "Users can view product barcodes" ON product_barcodes
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage product barcodes" ON product_barcodes
    FOR ALL USING (
        (public.has_permission('manage_products', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Product variants policies
CREATE POLICY "Users can view product variants" ON product_variants
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage product variants" ON product_variants
    FOR ALL USING (
        (public.has_permission('manage_products', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Inventory policies
CREATE POLICY "Users can view inventory in their store" ON inventory
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage inventory" ON inventory
    FOR ALL USING (
        (public.has_permission('manage_inventory', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Inventory transactions policies
CREATE POLICY "Users can view inventory transactions" ON inventory_transactions
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "System can insert inventory transactions" ON inventory_transactions
    FOR INSERT WITH CHECK (store_id = public.get_user_store() OR public.is_super_admin());

-- Product batches policies
CREATE POLICY "Users can view product batches" ON product_batches
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage product batches" ON product_batches
    FOR ALL USING (
        (public.has_permission('manage_inventory', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Supplier products policies
CREATE POLICY "Users can view supplier products" ON supplier_products
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage supplier products" ON supplier_products
    FOR ALL USING (
        (public.has_permission('manage_suppliers', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- Price history policies
CREATE POLICY "Users can view price history" ON price_history
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "System can insert price history" ON price_history
    FOR INSERT WITH CHECK (store_id = public.get_user_store() OR public.is_super_admin());

-- Stock alerts policies
CREATE POLICY "Users can view stock alerts" ON stock_alerts
    FOR SELECT USING (store_id = public.get_user_store() OR public.is_super_admin());

CREATE POLICY "Inventory managers can manage stock alerts" ON stock_alerts
    FOR ALL USING (
        (public.has_permission('manage_inventory', store_id) AND store_id = public.get_user_store())
        OR public.is_super_admin()
    );

-- ============================================================================
-- TRIGGERS FOR INVENTORY MANAGEMENT
-- ============================================================================

-- Function: Update inventory on transaction
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_quantity DECIMAL(12,3);
    v_new_quantity DECIMAL(12,3);
BEGIN
    -- Get current quantity
    SELECT quantity_on_hand INTO v_current_quantity
    FROM inventory
    WHERE store_id = NEW.store_id 
    AND product_id = NEW.product_id 
    AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL));
    
    -- If no inventory record exists, create one with zero
    IF v_current_quantity IS NULL THEN
        v_current_quantity := 0;
    END IF;
    
    -- Calculate new quantity based on transaction type
    IF NEW.transaction_type IN ('PURCHASE', 'RETURN', 'TRANSFER_IN') THEN
        v_new_quantity := v_current_quantity + NEW.quantity;
    ELSIF NEW.transaction_type IN ('SALE', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY') THEN
        v_new_quantity := v_current_quantity - NEW.quantity;
    ELSIF NEW.transaction_type = 'ADJUSTMENT' THEN
        v_new_quantity := NEW.new_quantity;
    ELSE
        v_new_quantity := v_current_quantity;
    END IF;
    
    -- Update or insert inventory record
    INSERT INTO inventory (store_id, product_id, variant_id, quantity_on_hand, last_updated_at)
    VALUES (NEW.store_id, NEW.product_id, NEW.variant_id, v_new_quantity, NOW())
    ON CONFLICT (store_id, product_id, variant_id) 
    DO UPDATE SET 
        quantity_on_hand = EXCLUDED.quantity_on_hand,
        last_updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_trigger
    AFTER INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_transaction();

-- Function: Create low stock alert
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name TEXT;
BEGIN
    -- Check if quantity is below or equal to reorder point
    IF NEW.quantity_on_hand <= NEW.reorder_point THEN
        -- Get product name
        SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;
        
        -- Create alert
        INSERT INTO stock_alerts (
            store_id, product_id, alert_type, severity,
            current_quantity, threshold_quantity
        ) VALUES (
            NEW.store_id, NEW.product_id, 'LOW_STOCK',
            CASE 
                WHEN NEW.quantity_on_hand = 0 THEN 'critical'
                WHEN NEW.quantity_on_hand <= NEW.reorder_point * 0.5 THEN 'high'
                ELSE 'medium'
            END,
            NEW.quantity_on_hand,
            NEW.reorder_point
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_low_stock_trigger
    AFTER INSERT OR UPDATE OF quantity_on_hand ON inventory
    FOR EACH ROW
    WHEN (NEW.quantity_on_hand <= NEW.reorder_point)
    EXECUTE FUNCTION check_low_stock();

-- Function: Validate barcode format
CREATE OR REPLACE FUNCTION validate_barcode_format()
RETURNS TRIGGER AS $$
BEGIN
    -- Basic validation: barcodes are typically numeric and 8-14 digits
    IF NEW.barcode IS NOT NULL AND NEW.barcode !~ '^[0-9]{8,14}$' THEN
        RAISE WARNING 'Barcode % does not match standard format. Expected 8-14 digits.', NEW.barcode;
        -- We still allow it, just warn
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_product_barcode
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    WHEN (NEW.barcode IS NOT NULL)
    EXECUTE FUNCTION validate_barcode_format();

CREATE TRIGGER validate_variant_barcode
    BEFORE INSERT OR UPDATE ON product_variants
    FOR EACH ROW
    WHEN (NEW.barcode IS NOT NULL)
    EXECUTE FUNCTION validate_barcode_format();

CREATE TRIGGER validate_product_barcodes_table
    BEFORE INSERT OR UPDATE ON product_barcodes
    FOR EACH ROW
    EXECUTE FUNCTION validate_barcode_format();

-- ============================================================================
-- FUNCTION TO INSERT DEFAULT UNITS FOR A STORE
-- Call this when a new store is created
-- ============================================================================
CREATE OR REPLACE FUNCTION insert_default_units(p_store_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO units_of_measure (store_id, name, code, symbol, category, is_base_unit, decimal_places) VALUES
    (p_store_id, 'Piece', 'pcs', 'pcs', 'quantity', true, 0),
    (p_store_id, 'Kilogram', 'kg', 'kg', 'weight', true, 2),
    (p_store_id, 'Gram', 'g', 'g', 'weight', false, 0),
    (p_store_id, 'Liter', 'ltr', 'L', 'volume', true, 2),
    (p_store_id, 'Milliliter', 'ml', 'mL', 'volume', false, 0),
    (p_store_id, 'Dozen', 'dz', 'dz', 'quantity', false, 0),
    (p_store_id, 'Box', 'box', '📦', 'quantity', false, 0),
    (p_store_id, 'Meter', 'm', 'm', 'length', true, 2),
    (p_store_id, 'Centimeter', 'cm', 'cm', 'length', false, 0),
    (p_store_id, 'Pack', 'pack', 'pack', 'quantity', false, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-insert default units when store is created
CREATE OR REPLACE FUNCTION auto_insert_default_units()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM insert_default_units(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insert_default_units_after_store_create
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_default_units();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE units_of_measure IS 'Product units of measure with conversion support';
COMMENT ON TABLE suppliers IS 'Supplier/Distributor master data with GST and contact info';
COMMENT ON TABLE categories IS 'Hierarchical product categories';
COMMENT ON TABLE products IS 'Core product master with barcode for POS scanning';
COMMENT ON COLUMN products.barcode IS 'Manufacturer barcode (EAN-13, UPC-A, etc.) - scanned at POS';
COMMENT ON TABLE product_barcodes IS 'Additional barcodes for products with multiple barcodes';
COMMENT ON TABLE product_variants IS 'Product variants with their own barcodes';
COMMENT ON TABLE inventory IS 'Current stock levels per product per store';
COMMENT ON TABLE inventory_transactions IS 'Complete stock movement history';
COMMENT ON TABLE product_batches IS 'Batch/lot tracking for expiry management';
COMMENT ON TABLE stock_alerts IS 'Low stock and expiry notifications';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ PHASE 2 TABLES ADDED SUCCESSFULLY
    ============================================================================
    
    Added 13 new tables:
    1. units_of_measure     - Product units (kg, pcs, box)
    2. suppliers            - Distributors with GST
    3. supplier_contacts    - Multiple contacts per supplier
    4. categories           - Product categories
    5. products             - Core products with BARCODE for POS scanning
    6. product_barcodes     - Additional barcodes per product
    7. product_variants     - Variants with own barcodes
    8. inventory            - Current stock levels
    9. inventory_transactions - Stock movement history
    10. product_batches     - Batch/expiry tracking
    11. supplier_products   - Supplier-specific pricing
    12. price_history       - Track price changes
    13. stock_alerts        - Low stock notifications
    
    Total tables now: 29 (16 original + 13 new)
    
    Key Features:
    ✓ BARCODE field in products table for POS scanning
    ✓ Multiple barcode support via product_barcodes table
    ✓ Variant-specific barcodes
    ✓ Fast barcode lookup indexes
    ✓ GST and HSN code support
    ✓ Inventory tracking with alerts
    ✓ RLS policies for security
    ✓ Automatic triggers for stock updates
    
    Next: Phase 3 - POS Billing System
    ============================================================================
    ';
END $$;