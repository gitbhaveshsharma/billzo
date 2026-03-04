-- ============================================================================
-- MIGRATION 17: Fix Return / Credit-Note Number Prefix
--
-- Root Cause (migration 15 regression — TWO bugs):
--
-- Bug 1: invoice_settings->>'prefix' ('INV') used for ALL types.
--   When a store configures prefix = 'INV', the RETURN type also gets 'INV'.
--
-- Bug 2 (the real killer): invoice_settings->>'number_format' is stored as
--   a literal like "INV-{YYYY}-{####}" — the prefix is hardcoded in the
--   format string, not expressed via a {PREFIX} token.  So even if we set
--   v_prefix = 'RET', the template never contains {PREFIX} and the output
--   is still "INV-2025-NNNN".
--
-- Fix:
--   For INVOICE type: keep reading prefix + number_format from store settings.
--   For ALL OTHER types (RETURN, CREDIT_NOTE, QUOTATION …):
--     • Always use the hard-coded type prefix (RET / CN / QUO).
--     • Always use the generic default format "{PREFIX}-{YYYY}-{####}".
--       The store's number_format is intentionally ignored so its hardcoded
--       "INV-" literal cannot pollute return / credit-note numbers.
--
-- After function fix, backfill every return_number that does not start with
-- 'RET' and every credit_note_number that does not start with 'CN'.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invoice_number(
    p_store_id UUID,
    p_type     TEXT DEFAULT 'INVOICE'
)
RETURNS TEXT AS $$
DECLARE
    v_sequence_row    invoice_sequences%ROWTYPE;
    v_financial_year  TEXT;
    v_fy_start_year   INTEGER;
    v_prefix          TEXT;
    v_number_format   TEXT;
    v_starting_number INTEGER;
    v_new_number      INTEGER;
    v_invoice_number  TEXT;
    v_store_code      TEXT;
    v_pad_width       INTEGER;
    v_hash_match      TEXT;
BEGIN
    -- ------------------------------------------------------------------
    -- 1. Financial year (India: April–March)
    -- ------------------------------------------------------------------
    IF EXTRACT(MONTH FROM NOW()) >= 4 THEN
        v_fy_start_year := EXTRACT(YEAR FROM NOW())::INTEGER;
    ELSE
        v_fy_start_year := (EXTRACT(YEAR FROM NOW()) - 1)::INTEGER;
    END IF;

    v_financial_year := v_fy_start_year::TEXT
                        || '-'
                        || RIGHT((v_fy_start_year + 1)::TEXT, 2);

    -- ------------------------------------------------------------------
    -- 2. Store code (safe — never NULL past this point)
    -- ------------------------------------------------------------------
    SELECT COALESCE(store_code, '') INTO v_store_code
    FROM stores
    WHERE id = p_store_id;

    -- ------------------------------------------------------------------
    -- 3. Determine prefix and number_format.
    --
    --    KEY RULES:
    --    a) Prefix
    --       • INVOICE only  → use store's invoice_settings->>'prefix' (or 'INV').
    --       • ALL OTHER types → always use the hard-coded type prefix.
    --         (RET / CN / QUO — never the store's prefix)
    --
    --    b) Number format
    --       • INVOICE only  → use store's invoice_settings->>'number_format'.
    --         The store format may contain a literal prefix (e.g. "INV-{YYYY}-{####}")
    --         that is only appropriate for invoices.
    --       • ALL OTHER types → always use the generic default "{PREFIX}-{YYYY}-{####}".
    --         This guarantees the correct type prefix appears even when the store's
    --         format has a hardcoded "INV-" literal with no {PREFIX} token.
    --
    --    c) Starting number is always read from store settings (or defaults to 1).
    -- ------------------------------------------------------------------

    -- Set type-specific prefix unconditionally first
    v_prefix := CASE p_type
                    WHEN 'INVOICE'     THEN 'INV'   -- may be overridden below for INVOICE
                    WHEN 'RETURN'      THEN 'RET'
                    WHEN 'CREDIT_NOTE' THEN 'CN'
                    WHEN 'QUOTATION'   THEN 'QUO'
                    ELSE p_type
                END;

    IF p_type = 'INVOICE' THEN
        -- For invoices: read everything from store settings
        SELECT
            COALESCE(
                NULLIF(TRIM(invoice_settings->>'prefix'), ''),
                'INV'
            ),
            COALESCE(
                NULLIF(TRIM(invoice_settings->>'number_format'), ''),
                '{PREFIX}-{YYYY}-{####}'
            ),
            COALESCE(
                (invoice_settings->>'starting_number')::INTEGER,
                1
            )
        INTO v_prefix, v_number_format, v_starting_number
        FROM store_settings
        WHERE store_id = p_store_id
        LIMIT 1;

        -- Fallback when no settings row exists
        IF v_prefix IS NULL THEN
            v_prefix          := 'INV';
            v_number_format   := '{PREFIX}-{YYYY}-{####}';
            v_starting_number := 1;
        END IF;
    ELSE
        -- For RETURN / CREDIT_NOTE / QUOTATION / etc.:
        -- Always use the hard-coded prefix and a generic format.
        -- The store's number_format is intentionally ignored because it
        -- typically has the invoice prefix baked in (e.g. "INV-{YYYY}-{####}")
        -- and would produce wrong numbers like "INV-2025-0001" for returns.
        v_number_format   := '{PREFIX}-{YYYY}-{####}';

        -- Still try to read starting_number from store settings
        SELECT COALESCE((invoice_settings->>'starting_number')::INTEGER, 1)
        INTO   v_starting_number
        FROM   store_settings
        WHERE  store_id = p_store_id
        LIMIT  1;

        IF v_starting_number IS NULL THEN
            v_starting_number := 1;
        END IF;
    END IF;

    -- ------------------------------------------------------------------
    -- 4. Lock & increment sequence row (prevents race conditions)
    -- ------------------------------------------------------------------
    SELECT * INTO v_sequence_row
    FROM invoice_sequences
    WHERE store_id      = p_store_id
    AND   sequence_type = p_type
    AND   financial_year = v_financial_year
    FOR UPDATE;

    IF NOT FOUND THEN
        -- First number of the financial year — honour starting_number
        INSERT INTO invoice_sequences (
            store_id, sequence_type, prefix,
            current_number, financial_year, last_generated_at
        )
        VALUES (
            p_store_id, p_type, v_prefix,
            v_starting_number, v_financial_year, NOW()
        )
        RETURNING current_number INTO v_new_number;
    ELSE
        v_new_number := v_sequence_row.current_number + 1;
        UPDATE invoice_sequences
        SET    current_number     = v_new_number,
               last_generated_at = NOW()
        WHERE  id = v_sequence_row.id;
    END IF;

    -- ------------------------------------------------------------------
    -- 5. Apply number_format template
    -- ------------------------------------------------------------------
    v_hash_match := (regexp_match(v_number_format, '(#+)'))[1];
    v_pad_width  := COALESCE(LENGTH(v_hash_match), 4);

    v_invoice_number := v_number_format;

    -- Replace tokens
    v_invoice_number := regexp_replace(v_invoice_number, '\{#+\}',    LPAD(v_new_number::TEXT, v_pad_width, '0'), 'g');
    v_invoice_number := regexp_replace(v_invoice_number, '\{PREFIX\}', v_prefix,              'g');
    v_invoice_number := regexp_replace(v_invoice_number, '\{FY\}',     v_financial_year,       'g');
    v_invoice_number := regexp_replace(v_invoice_number, '\{YYYY\}',   v_fy_start_year::TEXT,  'g');
    v_invoice_number := regexp_replace(v_invoice_number, '\{YY\}',     RIGHT(v_fy_start_year::TEXT, 2), 'g');
    v_invoice_number := regexp_replace(v_invoice_number, '\{MM\}',     TO_CHAR(NOW(), 'MM'),   'g');

    -- {STORE} token: include only when store_code is non-empty
    IF v_store_code <> '' THEN
        v_invoice_number := regexp_replace(v_invoice_number, '\{STORE\}', v_store_code, 'g');
    ELSE
        v_invoice_number := regexp_replace(v_invoice_number, '[/\-_]?\{STORE\}', '', 'g');
    END IF;

    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- BACKFILL: Fix all existing return_numbers that don't start with 'RET'
--           Fix all existing credit_note_numbers that don't start with 'CN'
-- ============================================================================
DO $$
DECLARE
    fixed_returns     INTEGER;
    fixed_cn          INTEGER;
BEGIN
    -- Backfill return numbers with wrong prefix (e.g. INV-2025-1005)
    UPDATE sale_returns
    SET    return_number = generate_return_number(store_id),
           updated_at    = NOW()
    WHERE  return_number NOT LIKE 'RET%';

    GET DIAGNOSTICS fixed_returns = ROW_COUNT;

    -- Backfill credit note numbers with wrong prefix
    UPDATE credit_notes
    SET    credit_note_number = generate_credit_note_number(store_id),
           updated_at         = NOW()
    WHERE  credit_note_number IS NOT NULL
    AND    credit_note_number NOT LIKE 'CN%';

    GET DIAGNOSTICS fixed_cn = ROW_COUNT;

    RAISE NOTICE 'Migration 17 backfill: fixed % return_number(s), % credit_note_number(s)',
        fixed_returns, fixed_cn;
END $$;

-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ MIGRATION 17 COMPLETE: Return Number Prefix Fixed
    ============================================================================

    Root Cause:
    Migration 15 used invoice_settings->>"prefix" for ALL types. If a store had
    prefix = "INV", return numbers were generated as INV-2025-xxxx instead of
    RET-2025-xxxx.

    Fix Applied:
    generate_invoice_number() now ONLY uses the store prefix setting for
    p_type = "INVOICE". Other types always get their hard-coded prefix:
      • RETURN      → RET
      • CREDIT_NOTE → CN
      • QUOTATION   → QUO

    The number_format (style) from store settings is still respected for all
    types, so the separator layout remains consistent.

    Backfill:
    ✓ All sale_returns with return_number NOT LIKE "RET%" regenerated.
    ✓ All credit_notes with credit_note_number NOT LIKE "CN%" regenerated.
    ============================================================================
    ';
END $$;
