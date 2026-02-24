import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type {
    InventoryRecord,
    InventoryTransaction,
    ProductBatch,
    StockAlert,
    PriceHistory,
    EnrichedInventoryRecord,
    EnrichedInventoryTransaction,
    EnrichedStockAlert,
    EnrichedProductBatch,
    CreateStockAdjustmentRequest,
    CreateStockTransferRequest,
    UpdateInventoryRecordRequest,
    CreateProductBatchRequest,
    UpdateProductBatchRequest,
    ResolveStockAlertRequest,
    StockCountRequest,
    InventoryFilters,
    InventoryPagination,
    TransactionFilters,
    TransactionPagination,
    BatchFilters,
    AlertFilters,
    InventoryListResponse,
    TransactionListResponse,
    BatchListResponse,
    InventoryDashboardStats,
    InventoryValuationSummary,
} from "@/types/inventory.types";

const getClient = () => createClient();

// ============================================================================
// INVENTORY SERVICE
// All CRUD operations for inventory, transactions, batches, alerts, price history
// ============================================================================

export const inventoryService = {
    // ========================================================================
    // INVENTORY RECORD CRUD
    // ========================================================================

    /**
     * Get paginated inventory list with product details and filters
     */
    getList: async (
        storeId: string,
        filters?: InventoryFilters,
        pagination?: InventoryPagination
    ): Promise<ServiceResponse<InventoryListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 20;
            const sortBy = pagination?.sort_by ?? "last_updated_at";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            // We need to join with products for enriched data
            let query = getClient()
                .from("inventory")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code, barcode, hsn_code, category_id,
                        brand, mrp, selling_price, purchase_price,
                        minimum_stock, reorder_level, is_batch_tracked,
                        primary_image, unit_id
                    ),
                    product_variants:variant_id (
                        id, variant_code, name, barcode, attributes
                    )
                `,
                    { count: "exact" }
                )
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.warehouse) {
                    query = query.eq("warehouse", filters.warehouse);
                }
                if (filters.location) {
                    query = query.eq("location", filters.location);
                }
                if (filters.low_stock_only) {
                    query = query.lte("quantity_on_hand", 0).or("quantity_on_hand.lte.reorder_point");
                }
                if (filters.out_of_stock_only) {
                    query = query.lte("quantity_on_hand", 0);
                }
                if (filters.has_variant === true) {
                    query = query.not("variant_id", "is", null);
                } else if (filters.has_variant === false) {
                    query = query.is("variant_id", null);
                }
                if (filters.min_quantity != null) {
                    query = query.gte("quantity_on_hand", filters.min_quantity);
                }
                if (filters.max_quantity != null) {
                    query = query.lte("quantity_on_hand", filters.max_quantity);
                }
                // Search is handled via product name/code join â€” use textSearch or filter after fetch
                // For product-level filters like category, we filter client-side after join
            }

            // Map sort field to actual column
            const sortColumn = mapInventorySortField(sortBy);
            query = query
                .order(sortColumn, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;
            const totalPages = Math.ceil(total / limit);

            // Map to enriched records
            const enrichedItems = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const record = { ...r } as unknown as EnrichedInventoryRecord;
                record.product = r.products as EnrichedInventoryRecord["product"];
                record.variant = r.product_variants as EnrichedInventoryRecord["variant"];
                // Clean up joined fields
                delete (record as unknown as Record<string, unknown>).products;
                delete (record as unknown as Record<string, unknown>).product_variants;
                return record;
            });

            // Client-side search filter (across product fields)
            let filteredItems = enrichedItems;
            if (filters?.search) {
                const lowerSearch = filters.search.toLowerCase().trim();
                filteredItems = enrichedItems.filter(
                    (item) =>
                        item.product?.name?.toLowerCase().includes(lowerSearch) ||
                        item.product?.product_code?.toLowerCase().includes(lowerSearch) ||
                        item.product?.barcode?.toLowerCase().includes(lowerSearch) ||
                        item.product?.brand?.toLowerCase().includes(lowerSearch) ||
                        item.variant?.name?.toLowerCase().includes(lowerSearch) ||
                        item.variant?.variant_code?.toLowerCase().includes(lowerSearch) ||
                        item.location?.toLowerCase().includes(lowerSearch) ||
                        item.warehouse?.toLowerCase().includes(lowerSearch)
                );
            }

            // Client-side category filter
            if (filters?.category_id) {
                filteredItems = filteredItems.filter(
                    (item) => item.product?.category_id === filters.category_id
                );
            }

            // Client-side overstock filter
            if (filters?.overstock_only) {
                filteredItems = filteredItems.filter(
                    (item) =>
                        item.maximum_stock != null &&
                        item.quantity_on_hand > item.maximum_stock
                );
            }

            return {
                data: {
                    items: filteredItems,
                    total: filters?.search || filters?.category_id || filters?.overstock_only
                        ? filteredItems.length
                        : total,
                    page,
                    limit,
                    total_pages: filters?.search || filters?.category_id || filters?.overstock_only
                        ? Math.ceil(filteredItems.length / limit)
                        : totalPages,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch inventory list" };
        }
    },

    /**
     * Get a single inventory record by ID with product details
     */
    getById: async (
        storeId: string,
        inventoryId: string
    ): Promise<ServiceResponse<EnrichedInventoryRecord>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code, barcode, hsn_code, category_id,
                        brand, mrp, selling_price, purchase_price,
                        minimum_stock, reorder_level, is_batch_tracked,
                        primary_image, unit_id
                    ),
                    product_variants:variant_id (
                        id, variant_code, name, barcode, attributes
                    )
                `
                )
                .eq("id", inventoryId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!data) return { data: null, error: "Inventory record not found" };

            const r = data as Record<string, unknown>;
            const record = { ...r } as unknown as EnrichedInventoryRecord;
            record.product = r.products as EnrichedInventoryRecord["product"];
            record.variant = r.product_variants as EnrichedInventoryRecord["variant"];
            delete (record as unknown as Record<string, unknown>).products;
            delete (record as unknown as Record<string, unknown>).product_variants;

            return { data: record, error: null };
        } catch {
            return { data: null, error: "Failed to fetch inventory record" };
        }
    },

    /**
     * Get inventory record for a specific product (and optional variant)
     */
    getByProduct: async (
        storeId: string,
        productId: string,
        variantId?: string
    ): Promise<ServiceResponse<EnrichedInventoryRecord>> => {
        try {
            let query = getClient()
                .from("inventory")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code, barcode, hsn_code, category_id,
                        brand, mrp, selling_price, purchase_price,
                        minimum_stock, reorder_level, is_batch_tracked,
                        primary_image, unit_id
                    ),
                    product_variants:variant_id (
                        id, variant_code, name, barcode, attributes
                    )
                `
                )
                .eq("store_id", storeId)
                .eq("product_id", productId);

            if (variantId) {
                query = query.eq("variant_id", variantId);
            } else {
                query = query.is("variant_id", null);
            }

            const { data, error } = await query.single();

            if (error) return { data: null, error: error.message };
            if (!data) return { data: null, error: "Inventory record not found" };

            const r = data as Record<string, unknown>;
            const record = { ...r } as unknown as EnrichedInventoryRecord;
            record.product = r.products as EnrichedInventoryRecord["product"];
            record.variant = r.product_variants as EnrichedInventoryRecord["variant"];
            delete (record as unknown as Record<string, unknown>).products;
            delete (record as unknown as Record<string, unknown>).product_variants;

            return { data: record, error: null };
        } catch {
            return { data: null, error: "Failed to fetch inventory by product" };
        }
    },

    /**
     * Update inventory record settings (reorder_point, max_stock, location, etc.)
     */
    update: async (
        storeId: string,
        inventoryId: string,
        data: UpdateInventoryRecordRequest
    ): Promise<ServiceResponse<InventoryRecord>> => {
        try {
            const { data: record, error } = await getClient()
                .from("inventory")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", inventoryId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: record as unknown as InventoryRecord, error: null };
        } catch {
            return { data: null, error: "Failed to update inventory record" };
        }
    },

    /**
     * Get low stock items (quantity_on_hand <= reorder_point)
     */
    getLowStock: async (
        storeId: string,
        limit = 50
    ): Promise<ServiceResponse<EnrichedInventoryRecord[]>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code, barcode, brand,
                        minimum_stock, reorder_level, primary_image, unit_id
                    ),
                    product_variants:variant_id (
                        id, variant_code, name, barcode, attributes
                    )
                `
                )
                .eq("store_id", storeId)
                .eq("is_active", true)
                .order("quantity_on_hand", { ascending: true })
                .limit(limit);

            if (error) return { data: null, error: error.message };

            // Filter client-side where on_hand <= reorder_point
            const records = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const record = { ...r } as unknown as EnrichedInventoryRecord;
                record.product = r.products as EnrichedInventoryRecord["product"];
                record.variant = r.product_variants as EnrichedInventoryRecord["variant"];
                delete (record as unknown as Record<string, unknown>).products;
                delete (record as unknown as Record<string, unknown>).product_variants;
                return record;
            });

            const lowStockItems = records.filter(
                (r) => r.reorder_point > 0 && r.quantity_on_hand <= r.reorder_point
            );

            return { data: lowStockItems, error: null };
        } catch {
            return { data: null, error: "Failed to fetch low stock items" };
        }
    },

    /**
     * Get out of stock items (quantity_on_hand <= 0)
     */
    getOutOfStock: async (
        storeId: string,
        limit = 50
    ): Promise<ServiceResponse<EnrichedInventoryRecord[]>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code, barcode, brand,
                        primary_image, unit_id
                    ),
                    product_variants:variant_id (
                        id, variant_code, name, barcode, attributes
                    )
                `
                )
                .eq("store_id", storeId)
                .eq("is_active", true)
                .lte("quantity_on_hand", 0)
                .order("quantity_on_hand", { ascending: true })
                .limit(limit);

            if (error) return { data: null, error: error.message };

            const records = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const record = { ...r } as unknown as EnrichedInventoryRecord;
                record.product = r.products as EnrichedInventoryRecord["product"];
                record.variant = r.product_variants as EnrichedInventoryRecord["variant"];
                delete (record as unknown as Record<string, unknown>).products;
                delete (record as unknown as Record<string, unknown>).product_variants;
                return record;
            });

            return { data: records, error: null };
        } catch {
            return { data: null, error: "Failed to fetch out of stock items" };
        }
    },

    // ========================================================================
    // INVENTORY TRANSACTIONS
    // ========================================================================

    /**
     * Get paginated transaction list with filters
     */
    getTransactions: async (
        storeId: string,
        filters?: TransactionFilters,
        pagination?: TransactionPagination
    ): Promise<ServiceResponse<TransactionListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 20;
            const sortBy = pagination?.sort_by ?? "transaction_date";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("inventory_transactions")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code, barcode
                    ),
                    product_variants:variant_id (
                        id, variant_code, name
                    )
                `,
                    { count: "exact" }
                )
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.transaction_type) {
                    query = query.eq("transaction_type", filters.transaction_type);
                }
                if (filters.product_id) {
                    query = query.eq("product_id", filters.product_id);
                }
                if (filters.variant_id) {
                    query = query.eq("variant_id", filters.variant_id);
                }
                if (filters.reference_type) {
                    query = query.eq("reference_type", filters.reference_type);
                }
                if (filters.date_from) {
                    query = query.gte("transaction_date", filters.date_from);
                }
                if (filters.date_to) {
                    query = query.lte("transaction_date", filters.date_to);
                }
                if (filters.performed_by) {
                    query = query.eq("performed_by", filters.performed_by);
                }
                if (filters.batch_number) {
                    query = query.eq("batch_number", filters.batch_number);
                }
                if (filters.search) {
                    query = query.or(
                        `reference_number.ilike.%${filters.search}%,` +
                        `batch_number.ilike.%${filters.search}%,` +
                        `reason.ilike.%${filters.search}%,` +
                        `notes.ilike.%${filters.search}%`
                    );
                }
            }

            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;
            const totalPages = Math.ceil(total / limit);

            const transactions = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const txn = { ...r } as unknown as EnrichedInventoryTransaction;
                txn.product = r.products as EnrichedInventoryTransaction["product"];
                txn.variant = r.product_variants as EnrichedInventoryTransaction["variant"];
                delete (txn as unknown as Record<string, unknown>).products;
                delete (txn as unknown as Record<string, unknown>).product_variants;
                return txn;
            });

            return {
                data: {
                    transactions,
                    total,
                    page,
                    limit,
                    total_pages: totalPages,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch transactions" };
        }
    },

    /**
     * Get transactions for a specific product
     */
    getProductTransactions: async (
        storeId: string,
        productId: string,
        limit = 50
    ): Promise<ServiceResponse<InventoryTransaction[]>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory_transactions")
                .select("*")
                .eq("store_id", storeId)
                .eq("product_id", productId)
                .order("transaction_date", { ascending: false })
                .limit(limit);

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as InventoryTransaction[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch product transactions" };
        }
    },

    /**
     * Create a stock adjustment transaction
     * DB trigger auto-updates the inventory table
     */
    createStockAdjustment: async (
        storeId: string,
        request: CreateStockAdjustmentRequest
    ): Promise<ServiceResponse<InventoryTransaction>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            // Get current inventory quantity for previous_quantity field
            let currentQtyQuery = getClient()
                .from("inventory")
                .select("quantity_on_hand")
                .eq("store_id", storeId)
                .eq("product_id", request.product_id);

            if (request.variant_id) {
                currentQtyQuery = currentQtyQuery.eq("variant_id", request.variant_id);
            } else {
                currentQtyQuery = currentQtyQuery.is("variant_id", null);
            }

            const { data: inventoryData } = await currentQtyQuery.single();
            const previousQuantity = (inventoryData as Record<string, unknown> | null)
                ?.quantity_on_hand as number ?? 0;

            // Calculate new quantity
            let newQuantity: number;
            let transactionQuantity: number;

            if (request.adjustment_type === "ADJUSTMENT") {
                newQuantity = request.new_quantity ?? 0;
                transactionQuantity = Math.abs(newQuantity - previousQuantity);
            } else {
                // DAMAGE or EXPIRY â€” these reduce stock
                transactionQuantity = request.quantity;
                newQuantity = previousQuantity - transactionQuantity;
            }

            const totalCost = request.unit_cost
                ? transactionQuantity * request.unit_cost
                : undefined;

            const { data: txn, error } = await getClient()
                .from("inventory_transactions")
                .insert({
                    store_id: storeId,
                    product_id: request.product_id,
                    variant_id: request.variant_id ?? null,
                    transaction_type: request.adjustment_type,
                    transaction_date: new Date().toISOString(),
                    quantity: transactionQuantity,
                    previous_quantity: previousQuantity,
                    new_quantity: newQuantity,
                    unit_cost: request.unit_cost ?? null,
                    total_cost: totalCost ?? null,
                    reference_type: "stock_adjustment",
                    batch_number: request.batch_number ?? null,
                    serial_number: request.serial_number ?? null,
                    expiry_date: request.expiry_date ?? null,
                    reason: request.reason,
                    performed_by: user.id,
                    notes: request.notes ?? null,
                    metadata: request.metadata ?? {},
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: txn as unknown as InventoryTransaction, error: null };
        } catch {
            return { data: null, error: "Failed to create stock adjustment" };
        }
    },

    /**
     * Create a stock transfer (creates both TRANSFER_OUT and TRANSFER_IN transactions)
     */
    createStockTransfer: async (
        storeId: string,
        request: CreateStockTransferRequest
    ): Promise<ServiceResponse<InventoryTransaction[]>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            // Get current quantity for previous_quantity
            let currentQtyQuery = getClient()
                .from("inventory")
                .select("quantity_on_hand")
                .eq("store_id", storeId)
                .eq("product_id", request.product_id);

            if (request.variant_id) {
                currentQtyQuery = currentQtyQuery.eq("variant_id", request.variant_id);
            } else {
                currentQtyQuery = currentQtyQuery.is("variant_id", null);
            }

            const { data: inventoryData } = await currentQtyQuery.single();
            const currentQty = (inventoryData as Record<string, unknown> | null)
                ?.quantity_on_hand as number ?? 0;

            if (currentQty < request.quantity) {
                return { data: null, error: "Insufficient stock for transfer" };
            }

            const now = new Date().toISOString();
            const totalCost = request.unit_cost
                ? request.quantity * request.unit_cost
                : undefined;

            // Create TRANSFER_OUT
            const { data: outTxn, error: outError } = await getClient()
                .from("inventory_transactions")
                .insert({
                    store_id: storeId,
                    product_id: request.product_id,
                    variant_id: request.variant_id ?? null,
                    transaction_type: "TRANSFER_OUT",
                    transaction_date: now,
                    quantity: request.quantity,
                    previous_quantity: currentQty,
                    new_quantity: currentQty - request.quantity,
                    unit_cost: request.unit_cost ?? null,
                    total_cost: totalCost ?? null,
                    reference_type: "stock_transfer",
                    batch_number: request.batch_number ?? null,
                    reason: request.reason ?? null,
                    from_location: request.from_location,
                    to_location: request.to_location,
                    performed_by: user.id,
                    notes: request.notes ?? null,
                } as never)
                .select()
                .single();

            if (outError) return { data: null, error: outError.message };

            // Create TRANSFER_IN
            const { data: inTxn, error: inError } = await getClient()
                .from("inventory_transactions")
                .insert({
                    store_id: storeId,
                    product_id: request.product_id,
                    variant_id: request.variant_id ?? null,
                    transaction_type: "TRANSFER_IN",
                    transaction_date: now,
                    quantity: request.quantity,
                    previous_quantity: currentQty - request.quantity,
                    new_quantity: currentQty, // Net effect is zero (transfer is location change)
                    unit_cost: request.unit_cost ?? null,
                    total_cost: totalCost ?? null,
                    reference_type: "stock_transfer",
                    batch_number: request.batch_number ?? null,
                    reason: request.reason ?? null,
                    from_location: request.from_location,
                    to_location: request.to_location,
                    performed_by: user.id,
                    notes: request.notes ?? null,
                } as never)
                .select()
                .single();

            if (inError) return { data: null, error: inError.message };

            return {
                data: [
                    outTxn as unknown as InventoryTransaction,
                    inTxn as unknown as InventoryTransaction,
                ],
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to create stock transfer" };
        }
    },

    /**
     * Perform stock count / physical audit
     * Creates ADJUSTMENT transactions for items with discrepancies
     */
    performStockCount: async (
        storeId: string,
        request: StockCountRequest
    ): Promise<ServiceResponse<InventoryTransaction[]>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const results: InventoryTransaction[] = [];
            const now = new Date().toISOString();

            for (const item of request.items) {
                // Get current inventory
                const { data: inv } = await getClient()
                    .from("inventory")
                    .select("quantity_on_hand, average_cost")
                    .eq("id", item.inventory_id)
                    .eq("store_id", storeId)
                    .single();

                if (!inv) continue;

                const currentQty = (inv as unknown as Record<string, unknown>).quantity_on_hand as number;
                const avgCost = (inv as unknown as Record<string, unknown>).average_cost as number | null;

                // Only create transaction if there's a discrepancy
                if (currentQty !== item.counted_quantity) {
                    const discrepancy = item.counted_quantity - currentQty;

                    const { data: txn, error: txnError } = await getClient()
                        .from("inventory_transactions")
                        .insert({
                            store_id: storeId,
                            product_id: item.product_id,
                            variant_id: item.variant_id ?? null,
                            transaction_type: "ADJUSTMENT",
                            transaction_date: now,
                            quantity: Math.abs(discrepancy),
                            previous_quantity: currentQty,
                            new_quantity: item.counted_quantity,
                            unit_cost: avgCost,
                            total_cost: avgCost ? Math.abs(discrepancy) * avgCost : null,
                            reference_type: "stock_adjustment",
                            reason: `Physical stock count. Discrepancy: ${discrepancy > 0 ? "+" : ""}${discrepancy}`,
                            performed_by: user.id,
                            notes: item.notes ?? request.notes ?? null,
                        } as never)
                        .select()
                        .single();

                    if (txnError) {
                        return {
                            data: null,
                            error: `Stock count failed for product ${item.product_id}: ${txnError.message}`,
                        };
                    }

                    if (txn) results.push(txn as unknown as InventoryTransaction);
                }

                // Update last_counted_at regardless of discrepancy
                await getClient()
                    .from("inventory")
                    .update({
                        last_counted_at: now,
                        last_counted_by: user.id,
                        updated_at: now,
                    } as never)
                    .eq("id", item.inventory_id)
                    .eq("store_id", storeId);
            }

            return { data: results, error: null };
        } catch {
            return { data: null, error: "Failed to perform stock count" };
        }
    },

    // ========================================================================
    // PRODUCT BATCHES
    // ========================================================================

    /**
     * Get batches with filters and pagination
     */
    getBatches: async (
        storeId: string,
        filters?: BatchFilters,
        page = 1,
        limit = 20
    ): Promise<ServiceResponse<BatchListResponse>> => {
        try {
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("product_batches")
                .select(
                    `
                    *,
                    products:product_id (
                        id, name, product_code
                    ),
                    suppliers:supplier_id (
                        id, name, supplier_code
                    )
                `,
                    { count: "exact" }
                )
                .eq("store_id", storeId);

            if (filters) {
                if (filters.product_id) {
                    query = query.eq("product_id", filters.product_id);
                }
                if (filters.supplier_id) {
                    query = query.eq("supplier_id", filters.supplier_id);
                }
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.expired_only) {
                    query = query.lt("expiry_date", new Date().toISOString().split("T")[0]);
                }
                if (filters.expiring_within_days) {
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + filters.expiring_within_days);
                    query = query
                        .gte("expiry_date", new Date().toISOString().split("T")[0])
                        .lte("expiry_date", futureDate.toISOString().split("T")[0]);
                }
                if (filters.search) {
                    query = query.or(
                        `batch_number.ilike.%${filters.search}%,` +
                        `purchase_invoice.ilike.%${filters.search}%`
                    );
                }
            }

            query = query
                .order("expiry_date", { ascending: true })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;
            const totalPages = Math.ceil(total / limit);

            const batches = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const batch = { ...r } as unknown as EnrichedProductBatch;
                batch.product = r.products as EnrichedProductBatch["product"];
                batch.supplier = r.suppliers as EnrichedProductBatch["supplier"];
                delete (batch as unknown as Record<string, unknown>).products;
                delete (batch as unknown as Record<string, unknown>).suppliers;
                return batch;
            });

            return {
                data: {
                    batches,
                    total,
                    page,
                    limit,
                    total_pages: totalPages,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch batches" };
        }
    },

    /**
     * Get a batch by ID
     */
    getBatchById: async (
        storeId: string,
        batchId: string
    ): Promise<ServiceResponse<EnrichedProductBatch>> => {
        try {
            const { data, error } = await getClient()
                .from("product_batches")
                .select(
                    `
                    *,
                    products:product_id (id, name, product_code),
                    suppliers:supplier_id (id, name, supplier_code)
                `
                )
                .eq("id", batchId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!data) return { data: null, error: "Batch not found" };

            const r = data as Record<string, unknown>;
            const batch = { ...r } as unknown as EnrichedProductBatch;
            batch.product = r.products as EnrichedProductBatch["product"];
            batch.supplier = r.suppliers as EnrichedProductBatch["supplier"];
            delete (batch as unknown as Record<string, unknown>).products;
            delete (batch as unknown as Record<string, unknown>).suppliers;

            return { data: batch, error: null };
        } catch {
            return { data: null, error: "Failed to fetch batch" };
        }
    },

    /**
     * Create a new product batch
     */
    createBatch: async (
        storeId: string,
        data: CreateProductBatchRequest
    ): Promise<ServiceResponse<ProductBatch>> => {
        try {
            const { data: batch, error } = await getClient()
                .from("product_batches")
                .insert({
                    ...data,
                    store_id: storeId,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: batch as unknown as ProductBatch, error: null };
        } catch {
            return { data: null, error: "Failed to create batch" };
        }
    },

    /**
     * Update a product batch
     */
    updateBatch: async (
        storeId: string,
        batchId: string,
        data: UpdateProductBatchRequest
    ): Promise<ServiceResponse<ProductBatch>> => {
        try {
            const { data: batch, error } = await getClient()
                .from("product_batches")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", batchId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: batch as unknown as ProductBatch, error: null };
        } catch {
            return { data: null, error: "Failed to update batch" };
        }
    },

    /**
     * Delete a product batch
     */
    deleteBatch: async (
        storeId: string,
        batchId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("product_batches")
                .delete()
                .eq("id", batchId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete batch" };
        }
    },

    /**
     * Get expiring batches (within N days)
     */
    getExpiringBatches: async (
        storeId: string,
        withinDays = 30,
        limit = 50
    ): Promise<ServiceResponse<EnrichedProductBatch[]>> => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + withinDays);
            const futureDateStr = futureDate.toISOString().split("T")[0];

            const { data, error } = await getClient()
                .from("product_batches")
                .select(
                    `
                    *,
                    products:product_id (id, name, product_code),
                    suppliers:supplier_id (id, name, supplier_code)
                `
                )
                .eq("store_id", storeId)
                .eq("is_active", true)
                .gte("expiry_date", today)
                .lte("expiry_date", futureDateStr)
                .gt("current_quantity", 0)
                .order("expiry_date", { ascending: true })
                .limit(limit);

            if (error) return { data: null, error: error.message };

            const batches = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const batch = { ...r } as unknown as EnrichedProductBatch;
                batch.product = r.products as EnrichedProductBatch["product"];
                batch.supplier = r.suppliers as EnrichedProductBatch["supplier"];
                delete (batch as unknown as Record<string, unknown>).products;
                delete (batch as unknown as Record<string, unknown>).suppliers;
                return batch;
            });

            return { data: batches, error: null };
        } catch {
            return { data: null, error: "Failed to fetch expiring batches" };
        }
    },

    /**
     * Get expired batches (with remaining stock)
     */
    getExpiredBatches: async (
        storeId: string,
        limit = 50
    ): Promise<ServiceResponse<EnrichedProductBatch[]>> => {
        try {
            const today = new Date().toISOString().split("T")[0];

            const { data, error } = await getClient()
                .from("product_batches")
                .select(
                    `
                    *,
                    products:product_id (id, name, product_code),
                    suppliers:supplier_id (id, name, supplier_code)
                `
                )
                .eq("store_id", storeId)
                .eq("is_active", true)
                .lt("expiry_date", today)
                .gt("current_quantity", 0)
                .order("expiry_date", { ascending: true })
                .limit(limit);

            if (error) return { data: null, error: error.message };

            const batches = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const batch = { ...r } as unknown as EnrichedProductBatch;
                batch.product = r.products as EnrichedProductBatch["product"];
                batch.supplier = r.suppliers as EnrichedProductBatch["supplier"];
                delete (batch as unknown as Record<string, unknown>).products;
                delete (batch as unknown as Record<string, unknown>).suppliers;
                return batch;
            });

            return { data: batches, error: null };
        } catch {
            return { data: null, error: "Failed to fetch expired batches" };
        }
    },

    // ========================================================================
    // STOCK ALERTS
    // ========================================================================

    /**
     * Get stock alerts with filters
     */
    getAlerts: async (
        storeId: string,
        filters?: AlertFilters,
        limit = 100
    ): Promise<ServiceResponse<EnrichedStockAlert[]>> => {
        try {
            // ── Step 1: Fetch alerts (no inventory join — stock_alerts has no FK to inventory) ──
            let query = getClient()
                .from("stock_alerts")
                .select(
                    `*, products:product_id (id, name, product_code), product_batches:batch_id (id, batch_number, expiry_date)`
                )
                .eq("store_id", storeId);

            if (filters) {
                if (filters.alert_type) query = query.eq("alert_type", filters.alert_type);
                if (filters.severity) query = query.eq("severity", filters.severity);
                if (filters.is_resolved !== undefined) query = query.eq("is_resolved", filters.is_resolved);
                if (filters.product_id) query = query.eq("product_id", filters.product_id);
            }

            const { data, error } = await query
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) return { data: null, error: error.message };

            const rawAlerts = ((data ?? []) as unknown[]).map((row) => {
                const r = row as Record<string, unknown>;
                const alert = { ...r } as unknown as EnrichedStockAlert;
                alert.product = r.products as EnrichedStockAlert["product"];
                alert.batch = r.product_batches as EnrichedStockAlert["batch"];
                delete (alert as unknown as Record<string, unknown>).products;
                delete (alert as unknown as Record<string, unknown>).product_batches;
                return alert;
            });

            // ── Step 2: Fetch live inventory quantities for each product in the result ──
            // inventory.product_id refs products.id (no direct FK from stock_alerts → inventory)
            const productIds = [...new Set(
                rawAlerts.map((a) => a.product_id).filter((id): id is string => !!id)
            )];

            const liveStockMap = new Map<string, { quantity_on_hand: number; reorder_point: number }>();

            if (productIds.length > 0) {
                const { data: invData } = await getClient()
                    .from("inventory")
                    .select("product_id, quantity_on_hand, reorder_point")
                    .eq("store_id", storeId)
                    .in("product_id", productIds)
                    .is("variant_id", null); // base product row (no variant)

                for (const row of (invData ?? []) as Array<{ product_id: string; quantity_on_hand: number; reorder_point: number }>) {
                    liveStockMap.set(row.product_id, {
                        quantity_on_hand: row.quantity_on_hand,
                        reorder_point: row.reorder_point,
                    });
                }
            }

            // ── Step 3: Merge live data into alerts ──
            const alerts = rawAlerts.map((alert) => {
                const live = alert.product_id ? liveStockMap.get(alert.product_id) : undefined;
                alert.live_quantity = live?.quantity_on_hand ?? null;
                alert.live_reorder_point = live?.reorder_point ?? null;
                return alert;
            });

            return { data: alerts, error: null };
        } catch {
            return { data: null, error: "Failed to fetch stock alerts" };
        }
    },

    /**
     * Get unresolved alert count
     */
    getUnresolvedAlertCount: async (
        storeId: string
    ): Promise<ServiceResponse<number>> => {
        try {
            const { count, error } = await getClient()
                .from("stock_alerts")
                .select("*", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("is_resolved", false);

            if (error) return { data: null, error: error.message };
            return { data: count ?? 0, error: null };
        } catch {
            return { data: null, error: "Failed to fetch alert count" };
        }
    },

    /**
     * Resolve a stock alert
     */
    resolveAlert: async (
        storeId: string,
        alertId: string,
        request: ResolveStockAlertRequest
    ): Promise<ServiceResponse<StockAlert>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data: alert, error } = await getClient()
                .from("stock_alerts")
                .update({
                    is_resolved: true,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user.id,
                    resolution_notes: request.resolution_notes,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", alertId)
                .eq("store_id", storeId)
                .eq("is_resolved", false)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: alert as unknown as StockAlert, error: null };
        } catch {
            return { data: null, error: "Failed to resolve alert" };
        }
    },

    /**
     * Bulk resolve stock alerts
     */
    bulkResolveAlerts: async (
        storeId: string,
        alertIds: string[],
        notes: string
    ): Promise<ServiceResponse<number>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data, error } = await getClient()
                .from("stock_alerts")
                .update({
                    is_resolved: true,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user.id,
                    resolution_notes: notes,
                    updated_at: new Date().toISOString(),
                } as never)
                .in("id", alertIds)
                .eq("store_id", storeId)
                .eq("is_resolved", false)
                .select();

            if (error) return { data: null, error: error.message };
            return { data: (data as unknown[])?.length ?? 0, error: null };
        } catch {
            return { data: null, error: "Failed to bulk resolve alerts" };
        }
    },

    // ========================================================================
    // PRICE HISTORY
    // ========================================================================

    /**
     * Get price history for a product
     */
    getPriceHistory: async (
        storeId: string,
        productId: string,
        variantId?: string,
        limit = 50
    ): Promise<ServiceResponse<PriceHistory[]>> => {
        try {
            let query = getClient()
                .from("price_history")
                .select("*")
                .eq("store_id", storeId)
                .eq("product_id", productId);

            if (variantId) {
                query = query.eq("variant_id", variantId);
            }

            query = query
                .order("effective_from", { ascending: false })
                .limit(limit);

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as PriceHistory[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch price history" };
        }
    },

    /**
     * Record a price change
     */
    recordPriceChange: async (
        storeId: string,
        productId: string,
        priceType: string,
        oldPrice: number | null,
        newPrice: number,
        reason?: string,
        variantId?: string
    ): Promise<ServiceResponse<PriceHistory>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data: record, error } = await getClient()
                .from("price_history")
                .insert({
                    store_id: storeId,
                    product_id: productId,
                    variant_id: variantId ?? null,
                    price_type: priceType,
                    old_price: oldPrice,
                    new_price: newPrice,
                    reason: reason ?? null,
                    effective_from: new Date().toISOString(),
                    changed_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: record as unknown as PriceHistory, error: null };
        } catch {
            return { data: null, error: "Failed to record price change" };
        }
    },

    // ========================================================================
    // DASHBOARD / STATISTICS
    // ========================================================================

    /**
     * Get inventory dashboard stats
     * Uses multiple lightweight queries for comprehensive stats
     */
    getDashboardStats: async (
        storeId: string
    ): Promise<ServiceResponse<InventoryDashboardStats>> => {
        try {
            // Parallel queries for dashboard data
            const [
                inventoryResult,
                alertsResult,
                todayTxnResult,
                batchResult,
            ] = await Promise.all([
                // Get all active inventory with product details
                getClient()
                    .from("inventory")
                    .select("quantity_on_hand, reorder_point, maximum_stock, total_value, is_active")
                    .eq("store_id", storeId)
                    .eq("is_active", true),

                // Get unresolved alerts count
                getClient()
                    .from("stock_alerts")
                    .select("*", { count: "exact", head: true })
                    .eq("store_id", storeId)
                    .eq("is_resolved", false),

                // Get today's transaction count
                getClient()
                    .from("inventory_transactions")
                    .select("*", { count: "exact", head: true })
                    .eq("store_id", storeId)
                    .gte("transaction_date", new Date().toISOString().split("T")[0]),

                // Get active batches for expiry tracking
                getClient()
                    .from("product_batches")
                    .select("expiry_date, current_quantity")
                    .eq("store_id", storeId)
                    .eq("is_active", true)
                    .gt("current_quantity", 0),
            ]);

            const stats: InventoryDashboardStats = {
                total_products: 0,
                total_stock_value: 0,
                low_stock_count: 0,
                out_of_stock_count: 0,
                overstock_count: 0,
                expiring_soon_count: 0,
                expired_count: 0,
                unresolved_alerts_count: alertsResult.count ?? 0,
                total_transactions_today: todayTxnResult.count ?? 0,
                total_adjustments_this_month: 0,
                top_moving_products: [],
                stock_value_by_category: [],
            };

            // Process inventory data
            if (inventoryResult.data) {
                for (const row of inventoryResult.data as unknown[]) {
                    const r = row as Record<string, unknown>;
                    const qty = r.quantity_on_hand as number;
                    const reorder = r.reorder_point as number;
                    const maxStock = r.maximum_stock as number | null;
                    const value = r.total_value as number | null;

                    stats.total_products++;
                    stats.total_stock_value += value ?? 0;

                    if (qty <= 0) {
                        stats.out_of_stock_count++;
                    } else if (reorder > 0 && qty <= reorder) {
                        stats.low_stock_count++;
                    } else if (maxStock != null && qty > maxStock) {
                        stats.overstock_count++;
                    }
                }
            }

            // Process batch data for expiry
            if (batchResult.data) {
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                for (const row of batchResult.data as unknown[]) {
                    const r = row as Record<string, unknown>;
                    const expiryDate = new Date(r.expiry_date as string);

                    if (expiryDate < now) {
                        stats.expired_count++;
                    } else if (expiryDate <= thirtyDaysFromNow) {
                        stats.expiring_soon_count++;
                    }
                }
            }

            return { data: stats, error: null };
        } catch {
            return { data: null, error: "Failed to fetch dashboard stats" };
        }
    },

    /**
     * Get inventory valuation summary
     */
    getValuationSummary: async (
        storeId: string
    ): Promise<ServiceResponse<InventoryValuationSummary>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory")
                .select(
                    `
                    quantity_on_hand, average_cost, total_value,
                    products:product_id (id, name)
                `
                )
                .eq("store_id", storeId)
                .eq("is_active", true)
                .gt("quantity_on_hand", 0);

            if (error) return { data: null, error: error.message };

            const records = (data ?? []) as unknown[];
            let totalItems = 0;
            let totalQuantity = 0;
            let totalValue = 0;
            let highestValue: { product_id: string; product_name: string; total_value: number } | null = null;

            for (const row of records) {
                const r = row as Record<string, unknown>;
                const qty = r.quantity_on_hand as number;
                const value = r.total_value as number | null;
                const product = r.products as Record<string, unknown> | null;

                totalItems++;
                totalQuantity += qty;
                totalValue += value ?? 0;

                if (value != null && (highestValue == null || value > highestValue.total_value)) {
                    highestValue = {
                        product_id: (product?.id as string) ?? "",
                        product_name: (product?.name as string) ?? "Unknown",
                        total_value: value,
                    };
                }
            }

            return {
                data: {
                    total_items: totalItems,
                    total_quantity: totalQuantity,
                    total_value: totalValue,
                    average_cost_per_unit: totalQuantity > 0 ? totalValue / totalQuantity : 0,
                    highest_value_product: highestValue,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch valuation summary" };
        }
    },
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Map UI sort field to actual database column
 */
function mapInventorySortField(field: string): string {
    const mapping: Record<string, string> = {
        product_name: "product_id", // Will sort by product_id; real name sort needs RPC
        product_code: "product_id",
        quantity_on_hand: "quantity_on_hand",
        quantity_available: "quantity_available",
        average_cost: "average_cost",
        total_value: "total_value",
        reorder_point: "reorder_point",
        last_updated_at: "last_updated_at",
        created_at: "created_at",
    };
    return mapping[field] ?? "last_updated_at";
}
