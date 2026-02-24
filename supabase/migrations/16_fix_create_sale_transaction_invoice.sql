-- ============================================================================
-- FIX: create_sale_transaction — multiple column/type mismatches
--
-- Bug 1 (previous migration):
--   invoice_number NOT NULL violated because the INSERT had no invoice_number.
--   Fix: generate_invoice_number() is now called BEFORE the INSERT.
--
-- Bug 2 (this migration):
--   sale_payments INSERT used wrong column name `change_amount`.
--   Actual column in sale_payments is `change_returned`.
--
-- Bug 3 (this migration):
--   sale_payments INSERT used `processed_by` which does not exist.
--   Actual column is `created_by`.
--
-- Bug 4 (this migration):
--   sale_payments INSERT cast status as `'SUCCESS'::payment_record_status`.
--   `payment_record_status` is not a custom type — status is plain TEXT.
--   Fix: use bare string literal 'SUCCESS'.
-- ============================================================================

DROP FUNCTION IF EXISTS create_sale_transaction(jsonb);

CREATE OR REPLACE FUNCTION create_sale_transaction(payload jsonb)
RETURNS jsonb AS $$
DECLARE
    v_sale_id        UUID;
    v_user_id        UUID;
    v_store_id       UUID;
    v_invoice_number TEXT;
    v_total_paid     DECIMAL(12,2) := 0;
    v_sale_status    sale_status;
    v_item           jsonb;
    v_payment        jsonb;
BEGIN
    -- ====================================================================
    -- 1. EXTRACT & VALIDATE
    -- ====================================================================
    v_user_id  := auth.uid();
    v_store_id := (payload->>'store_id')::UUID;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF v_store_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'store_id is required');
    END IF;

    IF jsonb_typeof(payload->'items') <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'error', 'items must be an array');
    END IF;

    IF jsonb_typeof(payload->'payments') <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'error', 'payments must be an array');
    END IF;

    -- ====================================================================
    -- 2. GENERATE INVOICE NUMBER FIRST
    --    (must happen before INSERT because invoice_number is NOT NULL)
    -- ====================================================================
    v_invoice_number := generate_invoice_number(v_store_id, 'INVOICE');

    IF v_invoice_number IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to generate invoice number');
    END IF;

    -- ====================================================================
    -- 3. INSERT SALE HEADER (includes invoice_number from the start)
    -- ====================================================================
    INSERT INTO sales (
        store_id, cashier_id, shift_id,
        customer_id, customer_name, customer_phone, customer_gstin,
        is_interstate, gst_type, supply_type,
        bill_discount_percentage, bill_discount_amount,
        subtotal, item_discount_total, discount_total,
        taxable_amount, cgst_amount, sgst_amount, igst_amount, cess_amount,
        tax_amount, gross_total, round_off, total_amount,
        is_credit_sale, credit_due_date,
        notes, internal_notes, tags,
        reference_type, reference_id, reference_number,
        invoice_number,
        status, created_by
    ) VALUES (
        v_store_id,
        v_user_id,
        (payload->>'shift_id')::UUID,
        (payload->>'customer_id')::UUID,
        payload->>'customer_name',
        payload->>'customer_phone',
        payload->>'customer_gstin',
        COALESCE((payload->>'is_interstate')::BOOLEAN, false),
        COALESCE(payload->>'gst_type', 'B2C'),
        COALESCE(payload->>'supply_type', 'intra'),
        COALESCE((payload->>'bill_discount_percentage')::DECIMAL, 0),
        COALESCE((payload->>'bill_discount_amount')::DECIMAL, 0),
        COALESCE((payload->>'subtotal')::DECIMAL, 0),
        COALESCE((payload->>'item_discount_total')::DECIMAL, 0),
        COALESCE((payload->>'discount_total')::DECIMAL, 0),
        COALESCE((payload->>'taxable_amount')::DECIMAL, 0),
        COALESCE((payload->>'cgst_amount')::DECIMAL, 0),
        COALESCE((payload->>'sgst_amount')::DECIMAL, 0),
        COALESCE((payload->>'igst_amount')::DECIMAL, 0),
        COALESCE((payload->>'cess_amount')::DECIMAL, 0),
        COALESCE((payload->>'tax_amount')::DECIMAL, 0),
        COALESCE((payload->>'gross_total')::DECIMAL, 0),
        COALESCE((payload->>'round_off')::DECIMAL, 0),
        COALESCE((payload->>'total_amount')::DECIMAL, 0),
        COALESCE((payload->>'is_credit_sale')::BOOLEAN, false),
        CASE WHEN payload->>'credit_due_date' IS NOT NULL
             THEN (payload->>'credit_due_date')::DATE
             ELSE NULL
        END,
        payload->>'notes',
        payload->>'internal_notes',
        CASE WHEN jsonb_typeof(payload->'tags') = 'array'
             THEN ARRAY(SELECT jsonb_array_elements_text(payload->'tags'))
             ELSE NULL
        END,
        payload->>'reference_type',
        CASE WHEN payload->>'reference_id' IS NOT NULL
             THEN (payload->>'reference_id')::UUID
             ELSE NULL
        END,
        payload->>'reference_number',
        v_invoice_number,
        'DRAFT'::sale_status,
        v_user_id
    )
    RETURNING id INTO v_sale_id;

    -- ====================================================================
    -- 4. INSERT SALE ITEMS
    -- ====================================================================
    FOR v_item IN SELECT jsonb_array_elements(payload->'items')
    LOOP
        INSERT INTO sale_items (
            sale_id, store_id,
            product_id, variant_id, batch_id,
            product_name, product_code, barcode, hsn_code, unit_name,
            quantity, mrp, unit_price, unit_cost,
            discount_type, discount_percentage, discount_amount,
            price_after_discount,
            subtotal, discount_total, taxable_amount,
            cgst_percentage, cgst_amount,
            sgst_percentage, sgst_amount,
            igst_percentage, igst_amount,
            cess_percentage, cess_amount,
            tax_amount, total_amount,
            total_cost, profit_amount, profit_percentage,
            serial_numbers,
            sort_order
        ) VALUES (
            v_sale_id,
            v_store_id,
            (v_item->>'product_id')::UUID,
            CASE WHEN v_item->>'variant_id' IS NOT NULL
                 THEN (v_item->>'variant_id')::UUID ELSE NULL END,
            CASE WHEN v_item->>'batch_id' IS NOT NULL
                 THEN (v_item->>'batch_id')::UUID ELSE NULL END,
            v_item->>'product_name',
            v_item->>'product_code',
            v_item->>'barcode',
            v_item->>'hsn_code',
            v_item->>'unit_name',
            (v_item->>'quantity')::DECIMAL,
            (v_item->>'mrp')::DECIMAL,
            (v_item->>'unit_price')::DECIMAL,
            CASE WHEN v_item->>'unit_cost' IS NOT NULL
                 THEN (v_item->>'unit_cost')::DECIMAL ELSE NULL END,
            COALESCE(v_item->>'discount_type', 'PERCENTAGE')::discount_type,
            COALESCE((v_item->>'discount_percentage')::DECIMAL, 0),
            COALESCE((v_item->>'discount_amount')::DECIMAL, 0),
            COALESCE((v_item->>'price_after_discount')::DECIMAL, 0),
            COALESCE((v_item->>'subtotal')::DECIMAL, 0),
            COALESCE((v_item->>'discount_total')::DECIMAL, 0),
            COALESCE((v_item->>'taxable_amount')::DECIMAL, 0),
            COALESCE((v_item->>'cgst_percentage')::DECIMAL, 0),
            COALESCE((v_item->>'cgst_amount')::DECIMAL, 0),
            COALESCE((v_item->>'sgst_percentage')::DECIMAL, 0),
            COALESCE((v_item->>'sgst_amount')::DECIMAL, 0),
            COALESCE((v_item->>'igst_percentage')::DECIMAL, 0),
            COALESCE((v_item->>'igst_amount')::DECIMAL, 0),
            COALESCE((v_item->>'cess_percentage')::DECIMAL, 0),
            COALESCE((v_item->>'cess_amount')::DECIMAL, 0),
            COALESCE((v_item->>'tax_amount')::DECIMAL, 0),
            COALESCE((v_item->>'total_amount')::DECIMAL, 0),
            CASE WHEN v_item->>'total_cost' IS NOT NULL
                 THEN (v_item->>'total_cost')::DECIMAL ELSE NULL END,
            CASE WHEN v_item->>'profit_amount' IS NOT NULL
                 THEN (v_item->>'profit_amount')::DECIMAL ELSE NULL END,
            CASE WHEN v_item->>'profit_percentage' IS NOT NULL
                 THEN (v_item->>'profit_percentage')::DECIMAL ELSE NULL END,
            CASE WHEN jsonb_typeof(v_item->'serial_numbers') = 'array'
                 THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'serial_numbers'))
                 ELSE NULL END,
            COALESCE((v_item->>'sort_order')::INT, 0)
        );
    END LOOP;

    -- ====================================================================
    -- 5. INSERT PAYMENTS
    -- ====================================================================
    FOR v_payment IN SELECT jsonb_array_elements(payload->'payments')
    LOOP
        INSERT INTO sale_payments (
            sale_id, store_id,
            payment_method, amount,
            cash_tendered, change_returned,
            reference_number, notes,
            status, created_by
        ) VALUES (
            v_sale_id,
            v_store_id,
            (v_payment->>'payment_method')::payment_method,
            (v_payment->>'amount')::DECIMAL,
            CASE WHEN v_payment->>'cash_tendered' IS NOT NULL
                 THEN (v_payment->>'cash_tendered')::DECIMAL ELSE NULL END,
            CASE
                WHEN v_payment->>'change_returned' IS NOT NULL
                     THEN (v_payment->>'change_returned')::DECIMAL
                WHEN v_payment->>'change_amount' IS NOT NULL
                     THEN (v_payment->>'change_amount')::DECIMAL
                ELSE NULL
            END,
            v_payment->>'reference_number',
            v_payment->>'notes',
            'SUCCESS',
            v_user_id
        );

        v_total_paid := v_total_paid + (v_payment->>'amount')::DECIMAL;
    END LOOP;

    -- ====================================================================
    -- 6. FINALIZE SALE STATUS & AMOUNTS
    -- ====================================================================
    v_sale_status := CASE
        WHEN v_total_paid >= COALESCE((payload->>'total_amount')::DECIMAL, 0)
             THEN 'COMPLETED'::sale_status
        WHEN v_total_paid > 0
             THEN 'PARTIAL_PAID'::sale_status
        WHEN COALESCE((payload->>'is_credit_sale')::BOOLEAN, false)
             THEN 'CREDIT'::sale_status
        ELSE 'PARTIAL_PAID'::sale_status
    END;

    UPDATE sales SET
        paid_amount   = v_total_paid,
        due_amount    = GREATEST(0,
            COALESCE((payload->>'total_amount')::DECIMAL, 0) - v_total_paid
        ),
        change_amount = GREATEST(0,
            v_total_paid - COALESCE((payload->>'total_amount')::DECIMAL, 0)
        ),
        status        = v_sale_status,
        sale_date     = CURRENT_DATE,
        sale_time     = NOW(),
        updated_at    = NOW()
    WHERE id = v_sale_id;

    -- ====================================================================
    -- 7. RETURN
    -- ====================================================================
    RETURN jsonb_build_object(
        'success',        true,
        'sale_id',        v_sale_id,
        'invoice_number', v_invoice_number,
        'total_paid',     v_total_paid,
        'status',         v_sale_status::TEXT
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error',   SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_sale_transaction(jsonb) TO authenticated;
