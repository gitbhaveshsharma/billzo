    -- ============================================================================
    -- FIX: generate_invoice_number
    --
    -- Two bugs fixed:
    --
    -- 1. NULL store_code → NULL invoice_number (violates NOT NULL constraint)
    --    The old function used `v_store_code || '/'` which returns NULL when
    --    store_code is NULL, making the entire concatenation NULL.
    --    Fix: COALESCE(v_store_code, '') and only include it in the output
    --    when it is not empty.
    --
    -- 2. Store settings ignored
    --    The old function hardcoded prefix ('INV') and always started sequences
    --    at 1, ignoring invoice_settings.prefix, invoice_settings.starting_number,
    --    and invoice_settings.number_format configured per store.
    --    Fix: read those values from store_settings and apply them.
    --
    -- number_format tokens:
    --   {YYYY}   → full 4-digit year (current year of financial year start)
    --   {YY}     → 2-digit year
    --   {FY}     → financial year string, e.g. "2025-26"
    --   {MM}     → current month (2 digits)
    --   {STORE}  → store_code (omitted if blank)
    --   {####}   → zero-padded sequence number (width = number of # chars)
    --   {PREFIX} → resolved prefix
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
        -- 3. Read invoice_settings from store_settings
        --    Falls back gracefully when the store has no settings row or the
        --    individual fields are absent from the JSONB.
        -- ------------------------------------------------------------------
        SELECT
            COALESCE(
                NULLIF(TRIM(invoice_settings->>'prefix'), ''),
                CASE p_type
                    WHEN 'INVOICE'     THEN 'INV'
                    WHEN 'RETURN'      THEN 'RET'
                    WHEN 'CREDIT_NOTE' THEN 'CN'
                    WHEN 'QUOTATION'   THEN 'QUO'
                    ELSE 'INV'
                END
            ),
            COALESCE(
                NULLIF(TRIM(invoice_settings->>'number_format'), ''),
                '{PREFIX}/{FY}/{####}'
            ),
            COALESCE(
                (invoice_settings->>'starting_number')::INTEGER,
                1
            )
        INTO v_prefix, v_number_format, v_starting_number
        FROM store_settings
        WHERE store_id = p_store_id
        LIMIT 1;

        -- Fallback when store has no settings row at all
        IF v_prefix IS NULL THEN
            v_prefix          := CASE p_type
                                    WHEN 'INVOICE'     THEN 'INV'
                                    WHEN 'RETURN'      THEN 'RET'
                                    WHEN 'CREDIT_NOTE' THEN 'CN'
                                    WHEN 'QUOTATION'   THEN 'QUO'
                                    ELSE 'INV'
                                END;
            v_number_format   := '{PREFIX}/{FY}/{####}';
            v_starting_number := 1;
        END IF;

        -- ------------------------------------------------------------------
        -- 4. Lock & increment sequence row (prevents race conditions)
        -- ------------------------------------------------------------------
        SELECT * INTO v_sequence_row
        FROM invoice_sequences
        WHERE store_id      = p_store_id
        AND sequence_type = p_type
        AND financial_year = v_financial_year
        FOR UPDATE;

        IF NOT FOUND THEN
            -- First invoice of the financial year — honour starting_number
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
            -- Subsequent invoices: always increment from last used number
            v_new_number := v_sequence_row.current_number + 1;
            UPDATE invoice_sequences
            SET    current_number     = v_new_number,
                last_generated_at = NOW()
            WHERE  id = v_sequence_row.id;
        END IF;

        -- ------------------------------------------------------------------
        -- 5. Apply number_format template
        --
        -- Detect padding width from the run of '#' chars in the template.
        -- e.g. "{####}" → 4, "{######}" → 6, no '#' → 4 (default)
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

        -- {STORE} token: include store code only when it is non-empty;
        -- also remove a trailing separator before {STORE} when code is blank
        IF v_store_code <> '' THEN
            v_invoice_number := regexp_replace(v_invoice_number, '\{STORE\}', v_store_code, 'g');
        ELSE
            -- Strip "{STORE}" and any immediately preceding separator (/, -, _)
            v_invoice_number := regexp_replace(v_invoice_number, '[/\-_]?\{STORE\}', '', 'g');
        END IF;

        RETURN v_invoice_number;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
