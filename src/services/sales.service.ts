import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type {
    Sale,
    SaleItem,
    SalePayment,
    SaleReturn,
    SaleReturnItem,
    EnrichedSale,
    EnrichedSaleReturn,
    CompleteSaleResult,
    CreateSaleRequest,
    UpdateSaleRequest,
    CreateSaleItemRequest,
    CreateSalePaymentRequest,
    CancelSaleRequest,
    CreateSaleReturnRequest,
    ApproveReturnRequest,
    MarkReceiptPrintedRequest,
    SaleFilters,
    SalePagination,
    SaleListResponse,
    ReturnFilters,
    ReturnPagination,
    ReturnListResponse,
    SalePaymentListResponse,
    SaleSummaryView,
    ProductSalesReport,
    InvoiceSequence,
} from "@/types/sales.types";
import {
    buildSaleItemPayload,
    calculateSaleTotals,
    calculateReturnItemTotals,
} from "@/utils/sales.utils";

const getClient = () => createClient();

// ============================================================================
// SALES SERVICE
// All CRUD operations for sales, items, payments, returns & invoice sequences
// ============================================================================

export const salesService = {
    // ========================================================================
    // SALE CRUD
    // ========================================================================

    /**
     * Create a new sale (DRAFT) with items.
     * The sale starts in DRAFT status — call completeSale() to finalize.
     */
    create: async (
        storeId: string,
        data: CreateSaleRequest
    ): Promise<ServiceResponse<Sale>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { items, ...headerData } = data;
            const isInterstate = headerData.is_interstate ?? false;

            // Calculate sale-level totals from items
            const cartItems = items.map((item) => ({
                cart_key: "",
                product_id: item.product_id,
                variant_id: item.variant_id ?? null,
                batch_id: item.batch_id ?? null,
                product_name: item.product_name,
                product_code: item.product_code,
                barcode: item.barcode ?? null,
                hsn_code: item.hsn_code ?? null,
                unit_name: item.unit_name ?? null,
                mrp: item.mrp,
                unit_price: item.unit_price,
                unit_cost: item.unit_cost ?? null,
                gst_percentage: item.gst_percentage ?? 0,
                cess_percentage: item.cess_percentage ?? 0,
                quantity: item.quantity,
                discount_type: item.discount_type ?? "PERCENTAGE",
                discount_percentage: item.discount_percentage ?? 0,
                discount_amount: item.discount_amount ?? 0,
                serial_numbers: item.serial_numbers ?? [],
                sort_order: item.sort_order ?? 0,
            }));

            const saleTotals = calculateSaleTotals(
                cartItems,
                headerData.bill_discount_percentage ?? 0,
                headerData.bill_discount_amount ?? 0,
                isInterstate
            );

            // Create sale header
            const { data: sale, error: saleError } = await getClient()
                .from("sales")
                .insert({
                    store_id: storeId,
                    cashier_id: user.id,
                    shift_id: headerData.shift_id ?? null,
                    customer_id: headerData.customer_id ?? null,
                    customer_name: headerData.customer_name ?? null,
                    customer_phone: headerData.customer_phone ?? null,
                    customer_gstin: headerData.customer_gstin ?? null,
                    is_interstate: isInterstate,
                    gst_type: headerData.gst_type ?? "B2C",
                    supply_type: headerData.supply_type ?? "intra",
                    bill_discount_percentage:
                        headerData.bill_discount_percentage ?? 0,
                    ...saleTotals,
                    status: "DRAFT",
                    is_credit_sale: headerData.is_credit_sale ?? false,
                    credit_due_date: headerData.credit_due_date ?? null,
                    notes: headerData.notes ?? null,
                    internal_notes: headerData.internal_notes ?? null,
                    tags: headerData.tags ?? null,
                    reference_type: headerData.reference_type ?? null,
                    reference_id: headerData.reference_id ?? null,
                    reference_number: headerData.reference_number ?? null,
                    created_by: user.id,
                } as never)
                .select()
                .single();

            if (saleError) return { data: null, error: saleError.message };
            if (!sale) return { data: null, error: "Failed to create sale" };

            const saleRecord = sale as unknown as Sale;

            // Create sale items with calculated tax fields
            const itemPayloads = items.map((item) => ({
                ...buildSaleItemPayload(item, isInterstate),
                sale_id: saleRecord.id,
                store_id: storeId,
            }));

            const { error: itemsError } = await getClient()
                .from("sale_items")
                .insert(itemPayloads as never[]);

            if (itemsError) {
                // Rollback: delete the sale header
                await getClient()
                    .from("sales")
                    .delete()
                    .eq("id", saleRecord.id);
                return {
                    data: null,
                    error: `Failed to create items: ${itemsError.message}`,
                };
            }

            // Re-fetch to get trigger-computed values
            const { data: refreshed, error: refetchError } = await getClient()
                .from("sales")
                .select("*")
                .eq("id", saleRecord.id)
                .single();

            if (refetchError) return { data: saleRecord, error: null };
            return { data: refreshed as unknown as Sale, error: null };
        } catch {
            return { data: null, error: "Failed to create sale" };
        }
    },

    /**
     * Get a sale by ID with all related data (items, payments, returns)
     */
    getById: async (
        storeId: string,
        saleId: string
    ): Promise<ServiceResponse<EnrichedSale>> => {
        try {
            const { data: sale, error } = await getClient()
                .from("sales")
                .select(
                    `
                    *,
                    sale_items (*),
                    sale_payments (*),
                    sale_returns (
                        *,
                        sale_return_items (*)
                    ),
                    cashier:cashier_id (id, full_name),
                    salesperson:salesperson_id (id, full_name)
                `
                )
                .eq("id", saleId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!sale) return { data: null, error: "Sale not found" };

            const raw = sale as Record<string, unknown>;

            const enriched: EnrichedSale = {
                ...(raw as unknown as Sale),
                items: ((raw.sale_items as unknown[]) ?? []) as SaleItem[],
                payments: ((raw.sale_payments as unknown[]) ??
                    []) as SalePayment[],
                returns: ((raw.sale_returns as unknown[]) ?? []).map(
                    (r: unknown) => {
                        const ret = r as Record<string, unknown>;
                        return {
                            ...ret,
                            items: ((ret.sale_return_items as unknown[]) ??
                                []) as SaleReturnItem[],
                        } as unknown as SaleReturn;
                    }
                ),
                cashier_name:
                    (
                        raw.cashier as {
                            full_name: string | null;
                        } | null
                    )?.full_name ?? null,
                salesperson_name:
                    (
                        raw.salesperson as {
                            full_name: string | null;
                        } | null
                    )?.full_name ?? null,
            };

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch sale" };
        }
    },

    /**
     * Get paginated list of sales with filters
     */
    getList: async (
        storeId: string,
        filters?: SaleFilters,
        pagination?: SalePagination
    ): Promise<ServiceResponse<SaleListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 20;
            const sortBy = pagination?.sort_by ?? "sale_time";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("sales")
                .select("*", { count: "exact" })
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.status) {
                    query = query.eq("status", filters.status);
                }
                if (filters.payment_method) {
                    // Filter sales that have this payment method
                    // This requires a sub-query or join; use a simpler approach
                    // by filtering client-side or via summary view
                }
                if (filters.cashier_id) {
                    query = query.eq("cashier_id", filters.cashier_id);
                }
                if (filters.customer_id) {
                    query = query.eq("customer_id", filters.customer_id);
                }
                if (filters.shift_id) {
                    query = query.eq("shift_id", filters.shift_id);
                }
                if (filters.date_from) {
                    query = query.gte("sale_date", filters.date_from);
                }
                if (filters.date_to) {
                    query = query.lte("sale_date", filters.date_to);
                }
                if (filters.sale_date) {
                    query = query.eq("sale_date", filters.sale_date);
                }
                if (filters.is_credit_sale !== undefined) {
                    query = query.eq("is_credit_sale", filters.is_credit_sale);
                }
                if (filters.has_due_amount === true) {
                    query = query.gt("due_amount", 0);
                } else if (filters.has_due_amount === false) {
                    query = query.lte("due_amount", 0);
                }
                if (filters.min_amount != null) {
                    query = query.gte("total_amount", filters.min_amount);
                }
                if (filters.max_amount != null) {
                    query = query.lte("total_amount", filters.max_amount);
                }
                if (filters.tags && filters.tags.length > 0) {
                    query = query.overlaps("tags", filters.tags);
                }
                if (filters.search) {
                    query = query.or(
                        `invoice_number.ilike.%${filters.search}%,` +
                            `customer_name.ilike.%${filters.search}%,` +
                            `customer_phone.ilike.%${filters.search}%`
                    );
                }
            }

            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;

            return {
                data: {
                    sales: (data ?? []) as unknown as Sale[],
                    total,
                    page,
                    limit,
                    total_pages: Math.ceil(total / limit),
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch sales" };
        }
    },

    /**
     * Get sales list from v_sales_summary view (lighter, pre-joined)
     */
    getSummaryList: async (
        storeId: string,
        filters?: SaleFilters,
        pagination?: SalePagination
    ): Promise<ServiceResponse<{ summaries: SaleSummaryView[]; total: number }>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 20;
            const sortBy = pagination?.sort_by ?? "sale_time";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("v_sales_summary")
                .select("*", { count: "exact" })
                .eq("store_id", storeId);

            if (filters) {
                if (filters.status) query = query.eq("status", filters.status);
                if (filters.sale_date)
                    query = query.eq("sale_date", filters.sale_date);
                if (filters.date_from)
                    query = query.gte("sale_date", filters.date_from);
                if (filters.date_to)
                    query = query.lte("sale_date", filters.date_to);
                if (filters.is_credit_sale !== undefined)
                    query = query.eq("is_credit_sale", filters.is_credit_sale);
                if (filters.has_due_amount === true)
                    query = query.gt("due_amount", 0);
                if (filters.search) {
                    query = query.or(
                        `invoice_number.ilike.%${filters.search}%,` +
                            `customer_name.ilike.%${filters.search}%,` +
                            `customer_phone.ilike.%${filters.search}%,` +
                            `cashier_name.ilike.%${filters.search}%`
                    );
                }
            }

            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            return {
                data: {
                    summaries: (data ?? []) as unknown as SaleSummaryView[],
                    total: count ?? 0,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch sales summary" };
        }
    },

    /**
     * Update a sale header (only DRAFT/HOLD sales)
     */
    update: async (
        storeId: string,
        saleId: string,
        data: UpdateSaleRequest
    ): Promise<ServiceResponse<Sale>> => {
        try {
            const { data: sale, error } = await getClient()
                .from("sales")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", saleId)
                .eq("store_id", storeId)
                .in("status", ["DRAFT", "HOLD"])
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sale as unknown as Sale, error: null };
        } catch {
            return { data: null, error: "Failed to update sale" };
        }
    },

    /**
     * Delete a sale (only DRAFT)
     */
    delete: async (
        storeId: string,
        saleId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("sales")
                .delete()
                .eq("id", saleId)
                .eq("store_id", storeId)
                .eq("status", "DRAFT");

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete sale" };
        }
    },

    // ========================================================================
    // STATUS TRANSITIONS
    // ========================================================================

    /**
     * Complete a sale using the `complete_sale` RPC function.
     * Validates payments, generates invoice number, updates status.
     */
    completeSale: async (
        saleId: string
    ): Promise<ServiceResponse<CompleteSaleResult>> => {
        try {
            const { data, error } = await getClient().rpc("complete_sale", {
                p_sale_id: saleId,
            });

            if (error) return { data: null, error: error.message };

            const result = data as unknown as CompleteSaleResult;
            if (!result.success) {
                return { data: null, error: result.error ?? "Failed to complete sale" };
            }

            return { data: result, error: null };
        } catch {
            return { data: null, error: "Failed to complete sale" };
        }
    },

    /**
     * Put a sale on hold (DRAFT → HOLD)
     */
    holdSale: async (
        storeId: string,
        saleId: string,
        notes?: string
    ): Promise<ServiceResponse<Sale>> => {
        try {
            const { data: sale, error } = await getClient()
                .from("sales")
                .update({
                    status: "HOLD",
                    internal_notes: notes ?? null,
                    reference_type: "hold_bill",
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", saleId)
                .eq("store_id", storeId)
                .eq("status", "DRAFT")
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sale as unknown as Sale, error: null };
        } catch {
            return { data: null, error: "Failed to hold sale" };
        }
    },

    /**
     * Recall a held sale (HOLD → DRAFT)
     */
    recallSale: async (
        storeId: string,
        saleId: string
    ): Promise<ServiceResponse<Sale>> => {
        try {
            const { data: sale, error } = await getClient()
                .from("sales")
                .update({
                    status: "DRAFT",
                    reference_type: null,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", saleId)
                .eq("store_id", storeId)
                .eq("status", "HOLD")
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sale as unknown as Sale, error: null };
        } catch {
            return { data: null, error: "Failed to recall sale" };
        }
    },

    /**
     * Cancel a sale
     */
    cancelSale: async (
        storeId: string,
        saleId: string,
        data: CancelSaleRequest
    ): Promise<ServiceResponse<Sale>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const { data: sale, error } = await getClient()
                .from("sales")
                .update({
                    status: "CANCELLED",
                    cancellation_reason: data.cancellation_reason,
                    cancelled_by: user?.id ?? null,
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", saleId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sale as unknown as Sale, error: null };
        } catch {
            return { data: null, error: "Failed to cancel sale" };
        }
    },

    /**
     * Mark receipt as printed / sent via SMS / sent via email
     */
    markReceiptPrinted: async (
        storeId: string,
        saleId: string,
        data: MarkReceiptPrintedRequest
    ): Promise<ServiceResponse<Sale>> => {
        try {
            const updatePayload: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (data.receipt_printed !== undefined) {
                updatePayload.receipt_printed = data.receipt_printed;
                updatePayload.receipt_printed_at = data.receipt_printed
                    ? new Date().toISOString()
                    : null;
            }
            if (data.receipt_print_count !== undefined) {
                updatePayload.receipt_print_count = data.receipt_print_count;
            }
            if (data.email_sent !== undefined) {
                updatePayload.email_sent = data.email_sent;
            }
            if (data.sms_sent !== undefined) {
                updatePayload.sms_sent = data.sms_sent;
            }

            const { data: sale, error } = await getClient()
                .from("sales")
                .update(updatePayload as never)
                .eq("id", saleId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sale as unknown as Sale, error: null };
        } catch {
            return { data: null, error: "Failed to update receipt status" };
        }
    },

    // ========================================================================
    // SALE ITEMS
    // ========================================================================

    /**
     * Add an item to an existing sale (DRAFT/HOLD only)
     */
    addItem: async (
        storeId: string,
        saleId: string,
        item: CreateSaleItemRequest,
        isInterstate: boolean
    ): Promise<ServiceResponse<SaleItem>> => {
        try {
            const payload = buildSaleItemPayload(item, isInterstate);

            const { data: saleItem, error } = await getClient()
                .from("sale_items")
                .insert({
                    ...payload,
                    sale_id: saleId,
                    store_id: storeId,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: saleItem as unknown as SaleItem, error: null };
        } catch {
            return { data: null, error: "Failed to add item" };
        }
    },

    /**
     * Update a sale item (quantity, discount, price — DRAFT/HOLD only).
     * Re-computes all calculated fields.
     */
    updateItem: async (
        storeId: string,
        itemId: string,
        updates: Partial<CreateSaleItemRequest>,
        currentItem: SaleItem,
        isInterstate: boolean
    ): Promise<ServiceResponse<SaleItem>> => {
        try {
            // Merge current values with updates
            const merged: CreateSaleItemRequest = {
                product_id: currentItem.product_id,
                product_name: currentItem.product_name,
                product_code: currentItem.product_code,
                mrp: currentItem.mrp,
                unit_price: updates.unit_price ?? currentItem.unit_price,
                quantity: updates.quantity ?? currentItem.quantity,
                unit_cost: updates.unit_cost ?? currentItem.unit_cost ?? undefined,
                discount_type:
                    updates.discount_type ?? currentItem.discount_type,
                discount_percentage:
                    updates.discount_percentage ??
                    currentItem.discount_percentage,
                discount_amount:
                    updates.discount_amount ?? currentItem.discount_amount,
                gst_percentage:
                    updates.gst_percentage ?? currentItem.gst_percentage,
                cess_percentage:
                    updates.cess_percentage ?? currentItem.cess_percentage,
                serial_numbers:
                    updates.serial_numbers ?? currentItem.serial_numbers ?? undefined,
                sort_order: updates.sort_order ?? currentItem.sort_order,
            };

            const payload = buildSaleItemPayload(merged, isInterstate);

            const { data: item, error } = await getClient()
                .from("sale_items")
                .update(payload as never)
                .eq("id", itemId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: item as unknown as SaleItem, error: null };
        } catch {
            return { data: null, error: "Failed to update item" };
        }
    },

    /**
     * Void a sale item (mark as void — DRAFT/HOLD only)
     */
    voidItem: async (
        storeId: string,
        itemId: string
    ): Promise<ServiceResponse<SaleItem>> => {
        try {
            const { data: item, error } = await getClient()
                .from("sale_items")
                .update({
                    is_void: true,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", itemId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: item as unknown as SaleItem, error: null };
        } catch {
            return { data: null, error: "Failed to void item" };
        }
    },

    /**
     * Remove a sale item completely (DRAFT/HOLD only)
     */
    removeItem: async (
        storeId: string,
        itemId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("sale_items")
                .delete()
                .eq("id", itemId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to remove item" };
        }
    },

    /**
     * Get all items for a sale
     */
    getItems: async (
        storeId: string,
        saleId: string
    ): Promise<ServiceResponse<SaleItem[]>> => {
        try {
            const { data, error } = await getClient()
                .from("sale_items")
                .select("*")
                .eq("sale_id", saleId)
                .eq("store_id", storeId)
                .order("sort_order", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as SaleItem[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch items" };
        }
    },

    // ========================================================================
    // SALE PAYMENTS
    // ========================================================================

    /**
     * Add a payment to a sale
     */
    addPayment: async (
        storeId: string,
        saleId: string,
        data: CreateSalePaymentRequest
    ): Promise<ServiceResponse<SalePayment>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const { data: payment, error } = await getClient()
                .from("sale_payments")
                .insert({
                    sale_id: saleId,
                    store_id: storeId,
                    payment_method: data.payment_method,
                    amount: data.amount,
                    cash_tendered: data.cash_tendered ?? null,
                    change_returned: data.change_returned ?? null,
                    card_last_four: data.card_last_four ?? null,
                    card_type: data.card_type ?? null,
                    card_bank: data.card_bank ?? null,
                    authorization_code: data.authorization_code ?? null,
                    terminal_id: data.terminal_id ?? null,
                    upi_id: data.upi_id ?? null,
                    upi_ref_number: data.upi_ref_number ?? null,
                    wallet_name: data.wallet_name ?? null,
                    bank_reference: data.bank_reference ?? null,
                    bank_name: data.bank_name ?? null,
                    transaction_id: data.transaction_id ?? null,
                    cheque_number: data.cheque_number ?? null,
                    cheque_bank: data.cheque_bank ?? null,
                    cheque_date: data.cheque_date ?? null,
                    gift_card_code: data.gift_card_code ?? null,
                    gift_card_id: data.gift_card_id ?? null,
                    credit_note_id: data.credit_note_id ?? null,
                    gateway_transaction_id:
                        data.gateway_transaction_id ?? null,
                    gateway_response: data.gateway_response ?? null,
                    notes: data.notes ?? null,
                    status: "SUCCESS",
                    created_by: user?.id ?? null,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: payment as unknown as SalePayment, error: null };
        } catch {
            return { data: null, error: "Failed to add payment" };
        }
    },

    /**
     * Get all payments for a sale
     */
    getPayments: async (
        storeId: string,
        saleId: string
    ): Promise<ServiceResponse<SalePaymentListResponse>> => {
        try {
            const { data, error } = await getClient()
                .from("sale_payments")
                .select("*")
                .eq("sale_id", saleId)
                .eq("store_id", storeId)
                .order("created_at", { ascending: true });

            if (error) return { data: null, error: error.message };

            return {
                data: {
                    payments: (data ?? []) as unknown as SalePayment[],
                    total: (data ?? []).length,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch payments" };
        }
    },

    /**
     * Reverse a payment (mark as REVERSED)
     */
    reversePayment: async (
        storeId: string,
        paymentId: string
    ): Promise<ServiceResponse<SalePayment>> => {
        try {
            const { data, error } = await getClient()
                .from("sale_payments")
                .update({ status: "REVERSED" } as never)
                .eq("id", paymentId)
                .eq("store_id", storeId)
                .eq("status", "SUCCESS")
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: data as unknown as SalePayment, error: null };
        } catch {
            return { data: null, error: "Failed to reverse payment" };
        }
    },

    // ========================================================================
    // SALE RETURNS
    // ========================================================================

    /**
     * Create a sale return with items.
     * Return starts in INITIATED status.
     */
    createReturn: async (
        storeId: string,
        data: CreateSaleReturnRequest
    ): Promise<ServiceResponse<SaleReturn>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            // Fetch original sale for invoice number and interstate flag
            const { data: sale, error: saleError } = await getClient()
                .from("sales")
                .select("invoice_number, is_interstate, customer_id, customer_name")
                .eq("id", data.sale_id)
                .eq("store_id", storeId)
                .single();

            if (saleError || !sale) {
                return { data: null, error: "Sale not found" };
            }

            const saleData = sale as unknown as {
                invoice_number: string;
                is_interstate: boolean;
                customer_id: string | null;
                customer_name: string | null;
            };

            // Fetch original sale items for return calculation
            const { data: saleItems, error: itemsQueryError } = await getClient()
                .from("sale_items")
                .select("*")
                .eq("sale_id", data.sale_id)
                .eq("store_id", storeId);

            if (itemsQueryError) {
                return { data: null, error: itemsQueryError.message };
            }

            const saleItemsMap = new Map(
                ((saleItems ?? []) as unknown as SaleItem[]).map((i) => [
                    i.id,
                    i,
                ])
            );

            // Calculate return totals
            let subtotalReturned = 0;
            let cgstReturned = 0;
            let sgstReturned = 0;
            let igstReturned = 0;
            let taxReturned = 0;

            const returnItemPayloads = data.items.map((ri) => {
                const originalItem = saleItemsMap.get(ri.sale_item_id);
                const totals = originalItem
                    ? calculateReturnItemTotals(
                          originalItem,
                          ri.return_quantity,
                          saleData.is_interstate
                      )
                    : {
                          subtotal: ri.unit_price * ri.return_quantity,
                          discount_amount: 0,
                          taxable_amount: ri.unit_price * ri.return_quantity,
                          cgst_amount: 0,
                          sgst_amount: 0,
                          igst_amount: 0,
                          tax_amount: 0,
                          total_amount: ri.unit_price * ri.return_quantity,
                      };

                subtotalReturned += totals.subtotal;
                cgstReturned += totals.cgst_amount;
                sgstReturned += totals.sgst_amount;
                igstReturned += totals.igst_amount;
                taxReturned += totals.tax_amount;

                return {
                    sale_item_id: ri.sale_item_id,
                    store_id: storeId,
                    product_id: ri.product_id,
                    variant_id: ri.variant_id ?? null,
                    batch_id: ri.batch_id ?? null,
                    product_name: ri.product_name,
                    product_code: ri.product_code,
                    unit_price: ri.unit_price,
                    unit_cost: ri.unit_cost ?? null,
                    return_quantity: ri.return_quantity,
                    item_return_reason: ri.item_return_reason ?? null,
                    restock: ri.restock ?? true,
                    restock_condition: ri.restock_condition ?? "good",
                    subtotal: totals.subtotal,
                    discount_amount: totals.discount_amount,
                    taxable_amount: totals.taxable_amount,
                    cgst_amount: totals.cgst_amount,
                    sgst_amount: totals.sgst_amount,
                    igst_amount: totals.igst_amount,
                    tax_amount: totals.tax_amount,
                    total_amount: totals.total_amount,
                };
            });

            const totalReturned = subtotalReturned + taxReturned;

            // Create return header
            const { data: returnRecord, error: returnError } = await getClient()
                .from("sale_returns")
                .insert({
                    store_id: storeId,
                    sale_id: data.sale_id,
                    original_invoice_number: saleData.invoice_number,
                    processed_by: user.id,
                    shift_id: data.shift_id ?? null,
                    customer_id: saleData.customer_id,
                    customer_name: saleData.customer_name,
                    return_reason: data.return_reason,
                    return_notes: data.return_notes ?? null,
                    subtotal_returned: Math.round(subtotalReturned * 100) / 100,
                    tax_returned: Math.round(taxReturned * 100) / 100,
                    cgst_returned: Math.round(cgstReturned * 100) / 100,
                    sgst_returned: Math.round(sgstReturned * 100) / 100,
                    igst_returned: Math.round(igstReturned * 100) / 100,
                    total_returned: Math.round(totalReturned * 100) / 100,
                    refund_method: data.refund_method ?? null,
                    refund_amount: Math.round(totalReturned * 100) / 100,
                    status: "INITIATED",
                    created_by: user.id,
                } as never)
                .select()
                .single();

            if (returnError) {
                return { data: null, error: returnError.message };
            }

            const retRecord = returnRecord as unknown as SaleReturn;

            // Create return items
            const itemsWithReturnId = returnItemPayloads.map((item) => ({
                ...item,
                return_id: retRecord.id,
            }));

            const { error: returnItemsError } = await getClient()
                .from("sale_return_items")
                .insert(itemsWithReturnId as never[]);

            if (returnItemsError) {
                // Rollback return header
                await getClient()
                    .from("sale_returns")
                    .delete()
                    .eq("id", retRecord.id);
                return {
                    data: null,
                    error: `Failed to create return items: ${returnItemsError.message}`,
                };
            }

            return { data: retRecord, error: null };
        } catch {
            return { data: null, error: "Failed to create return" };
        }
    },

    /**
     * Approve or reject a return
     */
    approveReturn: async (
        storeId: string,
        returnId: string,
        data: ApproveReturnRequest
    ): Promise<ServiceResponse<SaleReturn>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const updateData = data.approved
                ? {
                      status: "APPROVED",
                      approved_by: user?.id ?? null,
                      approved_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                  }
                : {
                      status: "REJECTED",
                      rejection_reason: data.rejection_reason ?? null,
                      approved_by: user?.id ?? null,
                      approved_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                  };

            const { data: ret, error } = await getClient()
                .from("sale_returns")
                .update(updateData as never)
                .eq("id", returnId)
                .eq("store_id", storeId)
                .eq("status", "INITIATED")
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: ret as unknown as SaleReturn, error: null };
        } catch {
            return { data: null, error: "Failed to process return approval" };
        }
    },

    /**
     * Complete a return (APPROVED → COMPLETED, triggers inventory restock)
     */
    completeReturn: async (
        storeId: string,
        returnId: string,
        refundReference?: string
    ): Promise<ServiceResponse<SaleReturn>> => {
        try {
            const { data: ret, error } = await getClient()
                .from("sale_returns")
                .update({
                    status: "COMPLETED",
                    refund_reference: refundReference ?? null,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", returnId)
                .eq("store_id", storeId)
                .in("status", ["APPROVED", "REFUND_PENDING"])
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: ret as unknown as SaleReturn, error: null };
        } catch {
            return { data: null, error: "Failed to complete return" };
        }
    },

    /**
     * Get a return by ID with items
     */
    getReturnById: async (
        storeId: string,
        returnId: string
    ): Promise<ServiceResponse<EnrichedSaleReturn>> => {
        try {
            const { data: ret, error } = await getClient()
                .from("sale_returns")
                .select(
                    `
                    *,
                    sale_return_items (*)
                `
                )
                .eq("id", returnId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!ret) return { data: null, error: "Return not found" };

            const raw = ret as Record<string, unknown>;
            const enriched: EnrichedSaleReturn = {
                ...(raw as unknown as SaleReturn),
                items: ((raw.sale_return_items as unknown[]) ??
                    []) as SaleReturnItem[],
            };

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch return" };
        }
    },

    /**
     * Get paginated list of returns with filters
     */
    getReturnsList: async (
        storeId: string,
        filters?: ReturnFilters,
        pagination?: ReturnPagination
    ): Promise<ServiceResponse<ReturnListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 20;
            const sortBy = pagination?.sort_by ?? "created_at";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("sale_returns")
                .select("*", { count: "exact" })
                .eq("store_id", storeId);

            if (filters) {
                if (filters.status) query = query.eq("status", filters.status);
                if (filters.sale_id)
                    query = query.eq("sale_id", filters.sale_id);
                if (filters.customer_id)
                    query = query.eq("customer_id", filters.customer_id);
                if (filters.date_from)
                    query = query.gte("return_date", filters.date_from);
                if (filters.date_to)
                    query = query.lte("return_date", filters.date_to);
                if (filters.search) {
                    query = query.or(
                        `return_number.ilike.%${filters.search}%,` +
                            `original_invoice_number.ilike.%${filters.search}%,` +
                            `customer_name.ilike.%${filters.search}%`
                    );
                }
            }

            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            return {
                data: {
                    returns: (data ?? []) as unknown as SaleReturn[],
                    total: count ?? 0,
                    page,
                    limit,
                    total_pages: Math.ceil((count ?? 0) / limit),
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch returns" };
        }
    },

    // ========================================================================
    // QUERY HELPERS
    // ========================================================================

    /**
     * Get all hold bills for a store
     */
    getHoldBills: async (
        storeId: string
    ): Promise<ServiceResponse<Sale[]>> => {
        try {
            const { data, error } = await getClient()
                .from("sales")
                .select("*")
                .eq("store_id", storeId)
                .eq("status", "HOLD")
                .order("updated_at", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as Sale[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch hold bills" };
        }
    },

    /**
     * Get sales for a specific shift
     */
    getSalesByShift: async (
        storeId: string,
        shiftId: string
    ): Promise<ServiceResponse<Sale[]>> => {
        try {
            const { data, error } = await getClient()
                .from("sales")
                .select("*")
                .eq("store_id", storeId)
                .eq("shift_id", shiftId)
                .order("sale_time", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as Sale[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch shift sales" };
        }
    },

    /**
     * Get credit sales (unpaid / partial paid)
     */
    getCreditSales: async (
        storeId: string
    ): Promise<ServiceResponse<Sale[]>> => {
        try {
            const { data, error } = await getClient()
                .from("sales")
                .select("*")
                .eq("store_id", storeId)
                .eq("is_credit_sale", true)
                .gt("due_amount", 0)
                .order("credit_due_date", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as Sale[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch credit sales" };
        }
    },

    /**
     * Get sales for a specific customer
     */
    getCustomerSales: async (
        storeId: string,
        customerId: string
    ): Promise<ServiceResponse<Sale[]>> => {
        try {
            const { data, error } = await getClient()
                .from("sales")
                .select("*")
                .eq("store_id", storeId)
                .eq("customer_id", customerId)
                .order("sale_time", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as Sale[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch customer sales" };
        }
    },

    /**
     * Get today's sales for dashboard
     */
    getTodaySales: async (
        storeId: string
    ): Promise<ServiceResponse<SaleSummaryView[]>> => {
        try {
            const today = new Date().toISOString().split("T")[0];

            const { data, error } = await getClient()
                .from("v_sales_summary")
                .select("*")
                .eq("store_id", storeId)
                .eq("sale_date", today)
                .order("sale_time", { ascending: false });

            if (error) return { data: null, error: error.message };
            return {
                data: (data ?? []) as unknown as SaleSummaryView[],
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch today's sales" };
        }
    },

    /**
     * Get product sales report from the view
     */
    getProductSalesReport: async (
        storeId: string,
        dateFrom?: string,
        dateTo?: string
    ): Promise<ServiceResponse<ProductSalesReport[]>> => {
        try {
            let query = getClient()
                .from("v_product_sales_report")
                .select("*")
                .eq("store_id", storeId);

            if (dateFrom) query = query.gte("sale_date", dateFrom);
            if (dateTo) query = query.lte("sale_date", dateTo);

            query = query.order("total_revenue", { ascending: false });

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return {
                data: (data ?? []) as unknown as ProductSalesReport[],
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch product sales report" };
        }
    },

    // ========================================================================
    // INVOICE SEQUENCE
    // ========================================================================

    /**
     * Generate an invoice number using the RPC function
     */
    generateInvoiceNumber: async (
        storeId: string,
        sequenceType?: string
    ): Promise<ServiceResponse<string>> => {
        try {
            const { data, error } = await getClient().rpc(
                "generate_invoice_number",
                {
                    p_store_id: storeId,
                    p_sequence_type: sequenceType ?? "INVOICE",
                }
            );

            if (error) return { data: null, error: error.message };
            return { data: data as string, error: null };
        } catch {
            return { data: null, error: "Failed to generate invoice number" };
        }
    },

    /**
     * Get invoice sequences for a store
     */
    getInvoiceSequences: async (
        storeId: string
    ): Promise<ServiceResponse<InvoiceSequence[]>> => {
        try {
            const { data, error } = await getClient()
                .from("invoice_sequences")
                .select("*")
                .eq("store_id", storeId)
                .order("sequence_type", { ascending: true });

            if (error) return { data: null, error: error.message };
            return {
                data: (data ?? []) as unknown as InvoiceSequence[],
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch invoice sequences" };
        }
    },

    /**
     * Update invoice sequence prefix or reset number
     */
    updateInvoiceSequence: async (
        storeId: string,
        sequenceId: string,
        updates: { prefix?: string; current_number?: number; financial_year?: string }
    ): Promise<ServiceResponse<InvoiceSequence>> => {
        try {
            const { data, error } = await getClient()
                .from("invoice_sequences")
                .update(updates as never)
                .eq("id", sequenceId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return {
                data: data as unknown as InvoiceSequence,
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to update invoice sequence" };
        }
    },

    // ========================================================================
    // SINGLE-RPC SALE COMMIT (POS optimized)
    // ========================================================================

    /**
     * Commit an entire sale in a single DB roundtrip.
     * Creates sale header + items + payments + completes in one atomic transaction.
     * This is the POS-optimized path — use instead of create → addPayment → completeSale.
     */
    commitSale: async (
        storeId: string,
        data: CreateSaleRequest,
        payments: CreateSalePaymentRequest[],
        isInterstate: boolean
    ): Promise<ServiceResponse<CompleteSaleResult & { sale_id: string }>> => {
        try {
            const { items, ...headerData } = data;

            // Build cart items for totals calculation
            const cartItems = items.map((item) => ({
                cart_key: "",
                product_id: item.product_id,
                variant_id: item.variant_id ?? null,
                batch_id: item.batch_id ?? null,
                product_name: item.product_name,
                product_code: item.product_code,
                barcode: item.barcode ?? null,
                hsn_code: item.hsn_code ?? null,
                unit_name: item.unit_name ?? null,
                mrp: item.mrp,
                unit_price: item.unit_price,
                unit_cost: item.unit_cost ?? null,
                gst_percentage: item.gst_percentage ?? 0,
                cess_percentage: item.cess_percentage ?? 0,
                quantity: item.quantity,
                discount_type: item.discount_type ?? ("PERCENTAGE" as const),
                discount_percentage: item.discount_percentage ?? 0,
                discount_amount: item.discount_amount ?? 0,
                serial_numbers: item.serial_numbers ?? [],
                sort_order: item.sort_order ?? 0,
            }));

            // Calculate sale-level totals
            const saleTotals = calculateSaleTotals(
                cartItems,
                headerData.bill_discount_percentage ?? 0,
                headerData.bill_discount_amount ?? 0,
                isInterstate
            );

            // Build fully calculated item payloads
            const itemPayloads = items.map((item) =>
                buildSaleItemPayload(item, isInterstate)
            );

            // Build the single RPC payload
            const payload = {
                store_id: storeId,
                shift_id: headerData.shift_id ?? null,
                customer_id: headerData.customer_id ?? null,
                customer_name: headerData.customer_name ?? null,
                customer_phone: headerData.customer_phone ?? null,
                customer_gstin: headerData.customer_gstin ?? null,
                is_interstate: isInterstate,
                gst_type: headerData.gst_type ?? "B2C",
                supply_type: headerData.supply_type ?? "intra",
                bill_discount_percentage: headerData.bill_discount_percentage ?? 0,
                ...saleTotals,
                is_credit_sale: headerData.is_credit_sale ?? false,
                credit_due_date: headerData.credit_due_date ?? null,
                notes: headerData.notes ?? null,
                internal_notes: headerData.internal_notes ?? null,
                tags: headerData.tags ?? null,
                reference_type: headerData.reference_type ?? null,
                reference_id: headerData.reference_id ?? null,
                reference_number: headerData.reference_number ?? null,
                items: itemPayloads,
                payments: payments.map((p) => ({ ...p })),
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: result, error } = await (getClient() as any).rpc(
                "create_sale_transaction",
                { payload }
            );

            if (error) return { data: null, error: error.message };

            const rpcResult = result as unknown as Record<string, unknown>;

            if (!rpcResult?.success) {
                return {
                    data: null,
                    error: (rpcResult?.error as string) ?? "Sale commit failed",
                };
            }

            return {
                data: {
                    success: true,
                    sale_id: rpcResult.sale_id as string,
                    invoice_number: rpcResult.invoice_number as string,
                    total_paid: rpcResult.total_paid as number,
                    status: rpcResult.status as string as CompleteSaleResult["status"],
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to commit sale" };
        }
    },
};
