-- ============================================================================
-- SUPPLIER OFFERS SYSTEM
-- BOGO, Buy X Get Y Free, Volume-based offers from suppliers
-- Integrates with Purchase Orders and POS billing
-- ============================================================================

-- Required for GiST equality operators on scalar types (e.g., uuid in EXCLUDE)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- SUPPLIER_OFFERS TABLE
-- Master table for supplier promotional offers
-- ============================================================================
CREATE TABLE supplier_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

    -- Offer Identification
    offer_code TEXT NOT NULL,
    offer_name TEXT NOT NULL,
    description TEXT,

    -- Offer Type
    offer_type TEXT NOT NULL CHECK (offer_type IN (
        'BOGO',                  -- Buy 1 Get 1 Free (classic)
        'BUY_X_GET_Y_FREE',      -- Buy X Get Y Free (e.g., Buy 2 Get 1 Free)
        'BUY_X_GET_Y_DISCOUNT',  -- Buy X Get Y at discount (e.g., Buy 2 Get 1 at 50% off)
        'VOLUME_FREE'            -- Volume threshold (e.g., Buy 10+ Get 2 Free)
    )),

    -- Buy/Get Configuration
    buy_quantity INTEGER NOT NULL DEFAULT 1 CHECK (buy_quantity > 0),
    get_quantity INTEGER NOT NULL DEFAULT 1 CHECK (get_quantity > 0),
    
    -- Discount on free items (100 = fully free, 50 = 50% off, 0 = no discount)
    discount_on_free DECIMAL(5,2) NOT NULL DEFAULT 100 CHECK (discount_on_free BETWEEN 0 AND 100),

    -- Applicable Products (NULL = manual selection per PO)
    applicable_product_ids UUID[],
    applicable_category_ids UUID[],
    applicable_brand TEXT,
    
    -- When apply_to_all_products is true, offer applies to all supplier products
    apply_to_all_products BOOLEAN DEFAULT false,

    -- Validity Period
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,

    -- Usage Limits
    max_uses_per_purchase_order INTEGER,
    max_total_uses INTEGER,
    current_uses INTEGER DEFAULT 0,

    -- POS Settings
    apply_to_pos BOOLEAN DEFAULT true,  -- Should this offer appear at POS?
    auto_apply_at_pos BOOLEAN DEFAULT true,  -- Auto-apply or require manual selection?
    pos_display_message TEXT,  -- Message to show cashier at POS

    -- Metadata
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    UNIQUE(store_id, offer_code),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================================
-- PRODUCT_OFFERS TABLE
-- Links specific products to active offers for fast POS lookup
-- Denormalized for O(1) lookup during billing
-- ============================================================================
CREATE TABLE product_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES supplier_offers(id) ON DELETE CASCADE,

    -- Denormalized offer details (for fast POS lookup without joins)
    offer_type TEXT NOT NULL,
    offer_code TEXT NOT NULL,
    offer_name TEXT NOT NULL,
    buy_quantity INTEGER NOT NULL,
    get_quantity INTEGER NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
    pos_display_message TEXT,
    auto_apply BOOLEAN DEFAULT true,

    -- Validity (copied from supplier_offers for indexed filtering)
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,

    -- Priority for multiple offers (lower = higher priority)
    priority INTEGER DEFAULT 100,

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One active offer per product/variant combination at a time
    CONSTRAINT unique_active_product_offer 
        EXCLUDE USING gist (
            store_id WITH =,
            product_id WITH =,
            COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
            daterange(start_date, COALESCE(end_date, '9999-12-31'::date)) WITH &&
        ) WHERE (is_active = true)
);

-- ============================================================================
-- ALTER PURCHASE_ORDER_ITEMS — Add offer tracking columns
-- ============================================================================
ALTER TABLE purchase_order_items 
    ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES supplier_offers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS free_quantity DECIMAL(12,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS offer_applied BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS offer_details JSONB DEFAULT NULL;

COMMENT ON COLUMN purchase_order_items.offer_id IS 'Reference to the supplier offer applied to this line item';
COMMENT ON COLUMN purchase_order_items.free_quantity IS 'Bonus/free quantity received from supplier offer';
COMMENT ON COLUMN purchase_order_items.offer_applied IS 'Whether a supplier offer was applied to this item';
COMMENT ON COLUMN purchase_order_items.offer_details IS 'Snapshot of offer details at time of PO creation';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Supplier Offers
CREATE INDEX idx_supplier_offers_store ON supplier_offers(store_id);
CREATE INDEX idx_supplier_offers_supplier ON supplier_offers(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_supplier_offers_active ON supplier_offers(store_id, is_active) WHERE is_active = true;
CREATE INDEX idx_supplier_offers_dates ON supplier_offers(store_id, start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_supplier_offers_type ON supplier_offers(store_id, offer_type);
CREATE INDEX idx_supplier_offers_pos ON supplier_offers(store_id) WHERE apply_to_pos = true AND is_active = true;

-- Product Offers (critical for POS performance)
CREATE INDEX idx_product_offers_store ON product_offers(store_id);
CREATE INDEX idx_product_offers_product ON product_offers(product_id);
CREATE INDEX idx_product_offers_variant ON product_offers(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_product_offers_offer ON product_offers(offer_id);
CREATE INDEX idx_product_offers_active_lookup ON product_offers(store_id, product_id, is_active) 
    WHERE is_active = true;
CREATE INDEX idx_product_offers_dates ON product_offers(store_id, start_date, end_date) 
    WHERE is_active = true;

-- Purchase Order Items offer columns
CREATE INDEX idx_po_items_offer ON purchase_order_items(offer_id) WHERE offer_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE supplier_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_offers ENABLE ROW LEVEL SECURITY;

-- SUPPLIER_OFFERS Policies
CREATE POLICY "Users can view supplier offers in their store" ON supplier_offers
    FOR SELECT USING (
        store_id = public.get_user_store()
        OR public.is_super_admin()
    );

CREATE POLICY "Users with manage_suppliers or manage_inventory can manage offers" ON supplier_offers
    FOR ALL USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('manage_inventory', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- PRODUCT_OFFERS Policies
CREATE POLICY "Users can view product offers in their store" ON product_offers
    FOR SELECT USING (
        store_id = public.get_user_store()
        OR public.is_super_admin()
    );

CREATE POLICY "Users with manage_suppliers or manage_inventory can manage product offers" ON product_offers
    FOR ALL USING (
        (
            store_id = public.get_user_store()
            AND (
                public.has_permission('manage_suppliers', store_id)
                OR public.has_permission('manage_inventory', store_id)
            )
        )
        OR public.is_super_admin()
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER supplier_offers_updated_at
    BEFORE UPDATE ON supplier_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_updated_at();

CREATE TRIGGER product_offers_updated_at
    BEFORE UPDATE ON product_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_updated_at();

-- ============================================================================
-- FUNCTION: Create product offers from supplier offer
-- When a supplier offer is created/updated, auto-generate product_offers entries
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_product_offers_from_supplier_offer()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if offer doesn't apply to POS
    IF NOT NEW.apply_to_pos THEN
        -- Deactivate any existing product offers for this supplier offer
        UPDATE product_offers 
        SET is_active = false, updated_at = NOW()
        WHERE offer_id = NEW.id;
        RETURN NEW;
    END IF;

    -- If offer applies to all products or has specific product IDs, sync
    IF NEW.apply_to_all_products OR NEW.applicable_product_ids IS NOT NULL THEN
        -- First, deactivate existing product offers for this supplier offer
        UPDATE product_offers 
        SET is_active = false, updated_at = NOW()
        WHERE offer_id = NEW.id;

        -- If offer is active, create/update product_offers entries
        IF NEW.is_active THEN
            IF NEW.apply_to_all_products THEN
                -- Create product_offers for all products from this supplier
                INSERT INTO product_offers (
                    store_id, product_id, variant_id, offer_id,
                    offer_type, offer_code, offer_name, buy_quantity, get_quantity,
                    discount_percentage, pos_display_message, auto_apply,
                    start_date, end_date, is_active
                )
                SELECT 
                    NEW.store_id,
                    p.id,
                    NULL,
                    NEW.id,
                    NEW.offer_type,
                    NEW.offer_code,
                    NEW.offer_name,
                    NEW.buy_quantity,
                    NEW.get_quantity,
                    NEW.discount_on_free,
                    NEW.pos_display_message,
                    NEW.auto_apply_at_pos,
                    NEW.start_date,
                    NEW.end_date,
                    true
                FROM products p
                WHERE p.store_id = NEW.store_id
                AND p.is_active = true
                AND (
                    NEW.supplier_id IS NULL 
                    OR p.id IN (
                        SELECT DISTINCT poi.product_id 
                        FROM purchase_order_items poi
                        JOIN purchase_orders po ON poi.purchase_order_id = po.id
                        WHERE po.supplier_id = NEW.supplier_id
                        AND po.store_id = NEW.store_id
                    )
                )
                ON CONFLICT ON CONSTRAINT unique_active_product_offer DO UPDATE
                SET 
                    offer_type = EXCLUDED.offer_type,
                    offer_code = EXCLUDED.offer_code,
                    offer_name = EXCLUDED.offer_name,
                    buy_quantity = EXCLUDED.buy_quantity,
                    get_quantity = EXCLUDED.get_quantity,
                    discount_percentage = EXCLUDED.discount_percentage,
                    pos_display_message = EXCLUDED.pos_display_message,
                    auto_apply = EXCLUDED.auto_apply,
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    is_active = true,
                    updated_at = NOW();
                    
            ELSIF NEW.applicable_product_ids IS NOT NULL THEN
                -- Create product_offers for specific products
                INSERT INTO product_offers (
                    store_id, product_id, variant_id, offer_id,
                    offer_type, offer_code, offer_name, buy_quantity, get_quantity,
                    discount_percentage, pos_display_message, auto_apply,
                    start_date, end_date, is_active
                )
                SELECT 
                    NEW.store_id,
                    product_id,
                    NULL,
                    NEW.id,
                    NEW.offer_type,
                    NEW.offer_code,
                    NEW.offer_name,
                    NEW.buy_quantity,
                    NEW.get_quantity,
                    NEW.discount_on_free,
                    NEW.pos_display_message,
                    NEW.auto_apply_at_pos,
                    NEW.start_date,
                    NEW.end_date,
                    true
                FROM UNNEST(NEW.applicable_product_ids) AS product_id
                ON CONFLICT ON CONSTRAINT unique_active_product_offer DO UPDATE
                SET 
                    offer_type = EXCLUDED.offer_type,
                    offer_code = EXCLUDED.offer_code,
                    offer_name = EXCLUDED.offer_name,
                    buy_quantity = EXCLUDED.buy_quantity,
                    get_quantity = EXCLUDED.get_quantity,
                    discount_percentage = EXCLUDED.discount_percentage,
                    pos_display_message = EXCLUDED.pos_display_message,
                    auto_apply = EXCLUDED.auto_apply,
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    is_active = true,
                    updated_at = NOW();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_product_offers_trigger
    AFTER INSERT OR UPDATE ON supplier_offers
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_offers_from_supplier_offer();

-- ============================================================================
-- FUNCTION: Calculate free quantity for PO item based on offer
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_offer_free_quantity(
    p_offer_id UUID,
    p_ordered_quantity DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    v_offer RECORD;
    v_sets INTEGER;
    v_free_qty DECIMAL;
BEGIN
    IF p_offer_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT * INTO v_offer FROM supplier_offers WHERE id = p_offer_id;
    
    IF NOT FOUND OR NOT v_offer.is_active THEN
        RETURN 0;
    END IF;

    -- Calculate how many complete "buy sets" we have
    v_sets := FLOOR(p_ordered_quantity / v_offer.buy_quantity);
    
    -- Calculate free quantity based on offer type
    CASE v_offer.offer_type
        WHEN 'BOGO' THEN
            -- Buy 1 Get 1: each purchased item gets 1 free
            v_free_qty := v_sets * v_offer.get_quantity;
        WHEN 'BUY_X_GET_Y_FREE' THEN
            -- Buy X Get Y: for every X bought, get Y free
            v_free_qty := v_sets * v_offer.get_quantity;
        WHEN 'BUY_X_GET_Y_DISCOUNT' THEN
            -- Discount offers: free_quantity is the discounted quantity
            v_free_qty := v_sets * v_offer.get_quantity;
        WHEN 'VOLUME_FREE' THEN
            -- Volume: if you buy >= buy_quantity, get get_quantity free (once)
            IF p_ordered_quantity >= v_offer.buy_quantity THEN
                v_free_qty := v_offer.get_quantity;
            ELSE
                v_free_qty := 0;
            END IF;
        ELSE
            v_free_qty := 0;
    END CASE;

    RETURN v_free_qty;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Auto-apply offer to PO item
-- Called when updating purchase_order_items with an offer
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_offer_to_po_item()
RETURNS TRIGGER AS $$
DECLARE
    v_offer RECORD;
BEGIN
    -- If offer_id is set but free_quantity is not calculated
    IF NEW.offer_id IS NOT NULL AND (NEW.free_quantity IS NULL OR NEW.free_quantity = 0) THEN
        SELECT * INTO v_offer FROM supplier_offers WHERE id = NEW.offer_id;
        
        IF FOUND THEN
            NEW.free_quantity := calculate_offer_free_quantity(NEW.offer_id, NEW.ordered_quantity);
            NEW.offer_applied := NEW.free_quantity > 0;
            NEW.offer_details := jsonb_build_object(
                'offer_type', v_offer.offer_type,
                'offer_code', v_offer.offer_code,
                'offer_name', v_offer.offer_name,
                'buy_quantity', v_offer.buy_quantity,
                'get_quantity', v_offer.get_quantity,
                'discount_on_free', v_offer.discount_on_free,
                'calculated_free_qty', NEW.free_quantity
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apply_offer_to_po_item_trigger
    BEFORE INSERT OR UPDATE OF offer_id, ordered_quantity ON purchase_order_items
    FOR EACH ROW
    WHEN (NEW.offer_id IS NOT NULL)
    EXECUTE FUNCTION apply_offer_to_po_item();

-- ============================================================================
-- RPC: Get active offers for POS
-- Returns all active product offers for a store (used by POS data service)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_pos_offers(p_store_id UUID)
RETURNS TABLE (
    product_id UUID,
    variant_id UUID,
    offer_id UUID,
    offer_type TEXT,
    offer_code TEXT,
    offer_name TEXT,
    buy_quantity INTEGER,
    get_quantity INTEGER,
    discount_percentage DECIMAL,
    pos_display_message TEXT,
    auto_apply BOOLEAN,
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        po.product_id,
        po.variant_id,
        po.offer_id,
        po.offer_type,
        po.offer_code,
        po.offer_name,
        po.buy_quantity,
        po.get_quantity,
        po.discount_percentage,
        po.pos_display_message,
        po.auto_apply,
        po.start_date,
        po.end_date
    FROM product_offers po
    WHERE po.store_id = p_store_id
    AND po.is_active = true
    AND po.start_date <= CURRENT_DATE
    AND (po.end_date IS NULL OR po.end_date >= CURRENT_DATE)
    ORDER BY po.priority ASC, po.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- RPC: Get supplier offers with usage stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_supplier_offers_with_stats(p_store_id UUID)
RETURNS TABLE (
    id UUID,
    offer_code TEXT,
    offer_name TEXT,
    offer_type TEXT,
    supplier_id UUID,
    supplier_name TEXT,
    buy_quantity INTEGER,
    get_quantity INTEGER,
    discount_on_free DECIMAL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN,
    apply_to_pos BOOLEAN,
    current_uses INTEGER,
    max_total_uses INTEGER,
    product_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        so.id,
        so.offer_code,
        so.offer_name,
        so.offer_type,
        so.supplier_id,
        s.name AS supplier_name,
        so.buy_quantity,
        so.get_quantity,
        so.discount_on_free,
        so.start_date,
        so.end_date,
        so.is_active,
        so.apply_to_pos,
        so.current_uses,
        so.max_total_uses,
        (SELECT COUNT(*) FROM product_offers po WHERE po.offer_id = so.id AND po.is_active = true) AS product_count,
        so.created_at
    FROM supplier_offers so
    LEFT JOIN suppliers s ON so.supplier_id = s.id
    WHERE so.store_id = p_store_id
    ORDER BY so.is_active DESC, so.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE supplier_offers IS 'Supplier promotional offers like BOGO, Buy X Get Y Free';
COMMENT ON TABLE product_offers IS 'Product-level offer mappings for fast POS lookup';
COMMENT ON FUNCTION calculate_offer_free_quantity(UUID, DECIMAL) IS 'Calculate free quantity based on offer type and ordered quantity';
COMMENT ON FUNCTION get_active_pos_offers(UUID) IS 'RPC: Get all active product offers for POS billing';
COMMENT ON FUNCTION get_supplier_offers_with_stats(UUID) IS 'RPC: Get supplier offers with usage statistics';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ SUPPLIER OFFERS SYSTEM CREATED SUCCESSFULLY
    ============================================================================

    Added 2 new tables:
    • supplier_offers       - Master offer definitions (BOGO, Buy X Get Y, etc.)
    • product_offers        - Product-level offer mappings for POS lookup

    Modified 1 table:
    • purchase_order_items  - Added offer_id, free_quantity, offer_applied, offer_details

    Offer Types Supported:
    • BOGO                  - Buy 1 Get 1 Free
    • BUY_X_GET_Y_FREE      - Buy X Get Y Free (configurable)
    • BUY_X_GET_Y_DISCOUNT  - Buy X Get Y at discount
    • VOLUME_FREE           - Volume threshold free items

    Functions:
    • calculate_offer_free_quantity() - Calculate free qty from offer
    • get_active_pos_offers()         - RPC for POS to fetch offers
    • get_supplier_offers_with_stats() - RPC for management UI

    Triggers:
    • sync_product_offers_trigger     - Auto-sync product_offers from supplier_offers
    • apply_offer_to_po_item_trigger  - Auto-apply offers on PO items

    RLS Policies:
    • SELECT: All store users
    • ALL: Users with manage_suppliers or manage_inventory permission

    ============================================================================
    ';
END $$;
