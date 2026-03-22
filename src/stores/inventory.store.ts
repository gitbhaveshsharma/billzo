import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { inventoryService } from "@/services/inventory.service";
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
    InventoryDashboardStats,
    InventoryValuationSummary,
} from "@/types/inventory.types";

type TransactionListCacheEntry = {
    data: EnrichedInventoryTransaction[];
    total: number;
    totalPages: number;
    fetchedAt: number;
};

const inFlightTransactionListRequests = new Map<string, Promise<ReturnType<typeof inventoryService.getTransactions> extends Promise<infer T> ? T : never>>();

function getTransactionListCacheKey(
    storeId: string,
    filters: TransactionFilters,
    pagination: TransactionPagination
) {
    return `${storeId}::${JSON.stringify(filters)}::${JSON.stringify(pagination)}`;
}

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface InventoryState {
    // Data - Inventory Records
    items: EnrichedInventoryRecord[];
    currentItem: EnrichedInventoryRecord | null;
    lowStockItems: EnrichedInventoryRecord[];
    outOfStockItems: EnrichedInventoryRecord[];

    // Data - Transactions
    transactions: EnrichedInventoryTransaction[];

    // Data - Batches
    batches: EnrichedProductBatch[];
    expiringBatches: EnrichedProductBatch[];
    expiredBatches: EnrichedProductBatch[];

    // Data - Alerts
    alerts: EnrichedStockAlert[];
    unresolvedAlertCount: number;

    // Data - Price History
    priceHistory: PriceHistory[];

    // Data - Dashboard
    dashboardStats: InventoryDashboardStats | null;
    valuationSummary: InventoryValuationSummary | null;

    // Pagination & Filters - Inventory
    inventoryFilters: InventoryFilters;
    inventoryPagination: InventoryPagination;
    totalItems: number;
    totalPages: number;

    // Pagination & Filters - Transactions
    transactionFilters: TransactionFilters;
    transactionPagination: TransactionPagination;
    totalTransactions: number;
    totalTransactionPages: number;

    // Pagination & Filters - Batches
    batchFilters: BatchFilters;
    totalBatches: number;
    totalBatchPages: number;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedItemIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number;
    transactionCache: Map<string, { data: EnrichedInventoryTransaction[]; fetchedAt: number }>;
    transactionListCache: Map<string, TransactionListCacheEntry>;
    batchCache: Map<string, { data: EnrichedProductBatch[]; fetchedAt: number }>;
    priceHistoryCache: Map<string, { data: PriceHistory[]; fetchedAt: number }>;

    // Actions - Fetching Inventory
    fetchInventory: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchInventoryById: (storeId: string, inventoryId: string) => Promise<void>;
    fetchInventoryByProduct: (storeId: string, productId: string, variantId?: string) => Promise<void>;
    fetchLowStock: (storeId: string) => Promise<void>;
    fetchOutOfStock: (storeId: string) => Promise<void>;

    // Actions - Inventory CRUD
    updateInventoryRecord: (storeId: string, inventoryId: string, data: UpdateInventoryRecordRequest) => Promise<boolean>;

    // Actions - Stock Operations
    createStockAdjustment: (storeId: string, data: CreateStockAdjustmentRequest) => Promise<InventoryTransaction | null>;
    createStockTransfer: (storeId: string, data: CreateStockTransferRequest) => Promise<InventoryTransaction[] | null>;
    performStockCount: (storeId: string, data: StockCountRequest) => Promise<boolean>;

    // Actions - Transactions
    fetchTransactions: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchProductTransactions: (storeId: string, productId: string, forceRefresh?: boolean) => Promise<InventoryTransaction[]>;

    // Actions - Batches
    fetchBatches: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchBatchById: (storeId: string, batchId: string) => Promise<EnrichedProductBatch | null>;
    createBatch: (storeId: string, data: CreateProductBatchRequest) => Promise<ProductBatch | null>;
    updateBatch: (storeId: string, batchId: string, data: UpdateProductBatchRequest) => Promise<boolean>;
    deleteBatch: (storeId: string, batchId: string) => Promise<boolean>;
    fetchExpiringBatches: (storeId: string, withinDays?: number) => Promise<void>;
    fetchExpiredBatches: (storeId: string) => Promise<void>;

    // Actions - Alerts
    fetchAlerts: (storeId: string, filters?: AlertFilters) => Promise<void>;
    fetchUnresolvedAlertCount: (storeId: string) => Promise<void>;
    resolveAlert: (storeId: string, alertId: string, data: ResolveStockAlertRequest) => Promise<boolean>;
    bulkResolveAlerts: (storeId: string, alertIds: string[], notes: string) => Promise<boolean>;

    // Actions - Price History
    fetchPriceHistory: (storeId: string, productId: string, variantId?: string) => Promise<PriceHistory[]>;
    recordPriceChange: (storeId: string, productId: string, priceType: string, oldPrice: number | null, newPrice: number, reason?: string, variantId?: string) => Promise<boolean>;

    // Actions - Dashboard
    fetchDashboardStats: (storeId: string) => Promise<void>;
    fetchValuationSummary: (storeId: string) => Promise<void>;

    // Actions - Filters & Pagination
    setInventoryFilters: (filters: Partial<InventoryFilters>) => void;
    setInventoryPagination: (pagination: Partial<InventoryPagination>) => void;
    setTransactionFilters: (filters: Partial<TransactionFilters>) => void;
    setTransactionPagination: (pagination: Partial<TransactionPagination>) => void;
    setBatchFilters: (filters: Partial<BatchFilters>) => void;

    // Actions - UI State
    setSelectedItemIds: (ids: string[]) => void;
    toggleItemSelection: (itemId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // Actions - Cache
    invalidateCache: () => void;
    clearTransactionCache: (productId?: string) => void;
    clearTransactionListCache: () => void;
    clearBatchCache: (productId?: string) => void;
    clearPriceHistoryCache: (productId?: string) => void;

    // Actions - Reset
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
    // Data
    items: [] as EnrichedInventoryRecord[],
    currentItem: null as EnrichedInventoryRecord | null,
    lowStockItems: [] as EnrichedInventoryRecord[],
    outOfStockItems: [] as EnrichedInventoryRecord[],
    transactions: [] as EnrichedInventoryTransaction[],
    batches: [] as EnrichedProductBatch[],
    expiringBatches: [] as EnrichedProductBatch[],
    expiredBatches: [] as EnrichedProductBatch[],
    alerts: [] as EnrichedStockAlert[],
    unresolvedAlertCount: 0,
    priceHistory: [] as PriceHistory[],
    dashboardStats: null as InventoryDashboardStats | null,
    valuationSummary: null as InventoryValuationSummary | null,

    // Pagination & Filters - Inventory
    inventoryFilters: {} as InventoryFilters,
    inventoryPagination: {
        page: 1,
        limit: 20,
        sort_by: "last_updated_at" as const,
        sort_order: "desc" as const,
    } as InventoryPagination,
    totalItems: 0,
    totalPages: 0,

    // Pagination & Filters - Transactions
    transactionFilters: {} as TransactionFilters,
    transactionPagination: {
        page: 1,
        limit: 20,
        sort_by: "transaction_date" as const,
        sort_order: "desc" as const,
    } as TransactionPagination,
    totalTransactions: 0,
    totalTransactionPages: 0,

    // Pagination & Filters - Batches
    batchFilters: {} as BatchFilters,
    totalBatches: 0,
    totalBatchPages: 0,

    // UI State
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null as string | null,
    selectedItemIds: [] as string[],

    // Cache
    lastFetch: null as number | null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    transactionCache: new Map() as Map<string, { data: EnrichedInventoryTransaction[]; fetchedAt: number }>,
    transactionListCache: new Map() as Map<string, TransactionListCacheEntry>,
    batchCache: new Map() as Map<string, { data: EnrichedProductBatch[]; fetchedAt: number }>,
    priceHistoryCache: new Map() as Map<string, { data: PriceHistory[]; fetchedAt: number }>,
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useInventoryStore = create<InventoryState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // INVENTORY FETCHING
            // ================================================================

            fetchInventory: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache
                if (!forceRefresh && state.lastFetch) {
                    const elapsed = Date.now() - state.lastFetch;
                    if (elapsed < state.cacheTimeout) return;
                }

                set({
                    isLoading: !state.items.length,
                    isRefreshing: !!state.items.length,
                });

                try {
                    const result = await inventoryService.getList(
                        storeId,
                        state.inventoryFilters,
                        state.inventoryPagination
                    );

                    if (result.error) {
                        set({ error: result.error, isLoading: false, isRefreshing: false });
                        return;
                    }

                    if (result.data) {
                        set({
                            items: result.data.items,
                            totalItems: result.data.total,
                            totalPages: result.data.total_pages,
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch inventory",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchInventoryById: async (storeId: string, inventoryId: string) => {
                set({ isLoading: true });

                try {
                    const result = await inventoryService.getById(storeId, inventoryId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentItem: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch inventory item",
                        isLoading: false,
                    });
                }
            },

            fetchInventoryByProduct: async (storeId: string, productId: string, variantId?: string) => {
                set({ isLoading: true });

                try {
                    const result = await inventoryService.getByProduct(storeId, productId, variantId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentItem: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch inventory by product",
                        isLoading: false,
                    });
                }
            },

            fetchLowStock: async (storeId: string) => {
                try {
                    const result = await inventoryService.getLowStock(storeId);
                    if (result.data) {
                        set({ lowStockItems: result.data });
                    }
                } catch {
                    // Silent fail for sidebar data
                }
            },

            fetchOutOfStock: async (storeId: string) => {
                try {
                    const result = await inventoryService.getOutOfStock(storeId);
                    if (result.data) {
                        set({ outOfStockItems: result.data });
                    }
                } catch {
                    // Silent fail for sidebar data
                }
            },

            // ================================================================
            // INVENTORY CRUD
            // ================================================================

            updateInventoryRecord: async (
                storeId: string,
                inventoryId: string,
                data: UpdateInventoryRecordRequest
            ) => {
                set({ isSaving: true, error: null });

                const previousItems = get().items;
                const previousCurrent = get().currentItem;

                // Optimistic update
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === inventoryId ? { ...item, ...data } : item
                    ),
                    currentItem:
                        state.currentItem?.id === inventoryId
                            ? { ...state.currentItem, ...data }
                            : state.currentItem,
                }));

                try {
                    const result = await inventoryService.update(storeId, inventoryId, data);

                    if (result.error) {
                        // Revert optimistic update
                        set({
                            items: previousItems,
                            currentItem: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            items: state.items.map((item) =>
                                item.id === inventoryId
                                    ? { ...item, ...result.data! }
                                    : item
                            ),
                            currentItem:
                                state.currentItem?.id === inventoryId
                                    ? { ...state.currentItem, ...result.data! }
                                    : state.currentItem,
                            error: null,
                            isSaving: false,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        items: previousItems,
                        currentItem: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update inventory record",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // STOCK OPERATIONS
            // ================================================================

            createStockAdjustment: async (storeId: string, data: CreateStockAdjustmentRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await inventoryService.createStockAdjustment(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Invalidate caches to reflect new stock levels
                        get().invalidateCache();
                        get().clearTransactionCache(data.product_id);
                        get().clearTransactionListCache();

                        // Re-fetch inventory to get updated quantities
                        await get().fetchInventory(storeId, true);

                        set({ error: null, isSaving: false });
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create stock adjustment",
                        isSaving: false,
                    });
                    return null;
                }
            },

            createStockTransfer: async (storeId: string, data: CreateStockTransferRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await inventoryService.createStockTransfer(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        get().invalidateCache();
                        get().clearTransactionCache(data.product_id);
                        get().clearTransactionListCache();

                        await get().fetchInventory(storeId, true);

                        set({ error: null, isSaving: false });
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create stock transfer",
                        isSaving: false,
                    });
                    return null;
                }
            },

            performStockCount: async (storeId: string, data: StockCountRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await inventoryService.performStockCount(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh inventory after stock count
                    get().invalidateCache();
                    get().clearTransactionListCache();
                    await get().fetchInventory(storeId, true);

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to perform stock count",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // TRANSACTION ACTIONS
            // ================================================================

            fetchTransactions: async (storeId: string, forceRefresh = false) => {
                const state = get();
                const cacheKey = getTransactionListCacheKey(
                    storeId,
                    state.transactionFilters,
                    state.transactionPagination
                );
                const cached = state.transactionListCache.get(cacheKey);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) {
                        set({
                            transactions: cached.data,
                            totalTransactions: cached.total,
                            totalTransactionPages: cached.totalPages,
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                        return;
                    }
                }

                set({
                    isLoading: !state.transactions.length,
                    isRefreshing: !!state.transactions.length,
                });

                try {
                    let request = inFlightTransactionListRequests.get(cacheKey);
                    if (!request || forceRefresh) {
                        request = inventoryService.getTransactions(
                            storeId,
                            state.transactionFilters,
                            state.transactionPagination
                        );
                        inFlightTransactionListRequests.set(cacheKey, request);
                    }

                    const result = await request;
                    inFlightTransactionListRequests.delete(cacheKey);

                    if (result.error) {
                        set({ error: result.error, isLoading: false, isRefreshing: false });
                        return;
                    }

                    if (result.data) {
                        set((current) => {
                            const nextListCache = new Map(current.transactionListCache);
                            nextListCache.set(cacheKey, {
                                data: result.data!.transactions,
                                total: result.data!.total,
                                totalPages: result.data!.total_pages,
                                fetchedAt: Date.now(),
                            });

                            const latestKey = getTransactionListCacheKey(
                                storeId,
                                current.transactionFilters,
                                current.transactionPagination
                            );

                            if (latestKey !== cacheKey) {
                                return {
                                    transactionListCache: nextListCache,
                                    isLoading: false,
                                    isRefreshing: false,
                                };
                            }

                            return {
                                transactionListCache: nextListCache,
                                transactions: result.data!.transactions,
                                totalTransactions: result.data!.total,
                                totalTransactionPages: result.data!.total_pages,
                                error: null,
                                isLoading: false,
                                isRefreshing: false,
                            };
                        });
                    }
                } catch (err) {
                    inFlightTransactionListRequests.delete(cacheKey);
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch transactions",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchProductTransactions: async (
                storeId: string,
                productId: string,
                forceRefresh = false
            ) => {
                const state = get();
                const cacheKey = productId;
                const cached = state.transactionCache.get(cacheKey);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data as unknown as InventoryTransaction[];
                }

                try {
                    const result = await inventoryService.getProductTransactions(storeId, productId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const transactions = result.data ?? [];
                    const newCache = new Map(state.transactionCache);
                    // Store as EnrichedInventoryTransaction for cache consistency
                    newCache.set(cacheKey, {
                        data: transactions as unknown as EnrichedInventoryTransaction[],
                        fetchedAt: Date.now(),
                    });
                    set({ transactionCache: newCache });

                    return transactions;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch product transactions",
                    });
                    return [];
                }
            },

            // ================================================================
            // BATCH ACTIONS
            // ================================================================

            fetchBatches: async (storeId: string, forceRefresh = false) => {
                const state = get();

                set({
                    isLoading: !state.batches.length,
                    isRefreshing: !!state.batches.length,
                });

                try {
                    const result = await inventoryService.getBatches(storeId, state.batchFilters);

                    if (result.error) {
                        set({ error: result.error, isLoading: false, isRefreshing: false });
                        return;
                    }

                    if (result.data) {
                        set({
                            batches: result.data.batches,
                            totalBatches: result.data.total,
                            totalBatchPages: result.data.total_pages,
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch batches",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchBatchById: async (storeId: string, batchId: string) => {
                try {
                    const result = await inventoryService.getBatchById(storeId, batchId);
                    if (result.error) {
                        set({ error: result.error });
                        return null;
                    }
                    return result.data;
                } catch {
                    return null;
                }
            },

            createBatch: async (storeId: string, data: CreateProductBatchRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await inventoryService.createBatch(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistically add to list (without enriched data - will be refreshed)
                        get().clearBatchCache(data.product_id);
                        await get().fetchBatches(storeId, true);

                        set({ error: null, isSaving: false });
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create batch",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateBatch: async (storeId: string, batchId: string, data: UpdateProductBatchRequest) => {
                set({ isSaving: true, error: null });

                const previousBatches = get().batches;

                // Optimistic update
                set((state) => ({
                    batches: state.batches.map((b) =>
                        b.id === batchId ? { ...b, ...data } : b
                    ),
                }));

                try {
                    const result = await inventoryService.updateBatch(storeId, batchId, data);

                    if (result.error) {
                        set({
                            batches: previousBatches,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            batches: state.batches.map((b) =>
                                b.id === batchId ? { ...b, ...result.data! } : b
                            ),
                            error: null,
                            isSaving: false,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        batches: previousBatches,
                        error: err instanceof Error ? err.message : "Failed to update batch",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteBatch: async (storeId: string, batchId: string) => {
                set({ isSaving: true, error: null });

                const previousBatches = get().batches;
                const previousTotal = get().totalBatches;

                // Optimistic removal
                set((state) => ({
                    batches: state.batches.filter((b) => b.id !== batchId),
                    totalBatches: state.totalBatches - 1,
                }));

                try {
                    const result = await inventoryService.deleteBatch(storeId, batchId);

                    if (result.error) {
                        set({
                            batches: previousBatches,
                            totalBatches: previousTotal,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        batches: previousBatches,
                        totalBatches: previousTotal,
                        error: err instanceof Error ? err.message : "Failed to delete batch",
                        isSaving: false,
                    });
                    return false;
                }
            },

            fetchExpiringBatches: async (storeId: string, withinDays = 30) => {
                try {
                    const result = await inventoryService.getExpiringBatches(storeId, withinDays);
                    if (result.data) {
                        set({ expiringBatches: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            fetchExpiredBatches: async (storeId: string) => {
                try {
                    const result = await inventoryService.getExpiredBatches(storeId);
                    if (result.data) {
                        set({ expiredBatches: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            // ================================================================
            // ALERT ACTIONS
            // ================================================================

            fetchAlerts: async (storeId: string, filters?: AlertFilters) => {
                try {
                    const result = await inventoryService.getAlerts(storeId, filters);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ alerts: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch alerts",
                    });
                }
            },

            fetchUnresolvedAlertCount: async (storeId: string) => {
                try {
                    const result = await inventoryService.getUnresolvedAlertCount(storeId);
                    if (result.data != null) {
                        set({ unresolvedAlertCount: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            resolveAlert: async (storeId: string, alertId: string, data: ResolveStockAlertRequest) => {
                set({ isSaving: true, error: null });

                const previousAlerts = get().alerts;
                const previousCount = get().unresolvedAlertCount;

                // Optimistic update
                set((state) => ({
                    alerts: state.alerts.map((a) =>
                        a.id === alertId
                            ? { ...a, is_resolved: true, resolution_notes: data.resolution_notes }
                            : a
                    ),
                    unresolvedAlertCount: Math.max(0, state.unresolvedAlertCount - 1),
                }));

                try {
                    const result = await inventoryService.resolveAlert(storeId, alertId, data);

                    if (result.error) {
                        set({
                            alerts: previousAlerts,
                            unresolvedAlertCount: previousCount,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        alerts: previousAlerts,
                        unresolvedAlertCount: previousCount,
                        error: err instanceof Error ? err.message : "Failed to resolve alert",
                        isSaving: false,
                    });
                    return false;
                }
            },

            bulkResolveAlerts: async (storeId: string, alertIds: string[], notes: string) => {
                set({ isSaving: true, error: null });

                const previousAlerts = get().alerts;
                const previousCount = get().unresolvedAlertCount;

                // Optimistic update
                set((state) => ({
                    alerts: state.alerts.map((a) =>
                        alertIds.includes(a.id)
                            ? { ...a, is_resolved: true, resolution_notes: notes }
                            : a
                    ),
                    unresolvedAlertCount: Math.max(0, state.unresolvedAlertCount - alertIds.length),
                }));

                try {
                    const result = await inventoryService.bulkResolveAlerts(storeId, alertIds, notes);

                    if (result.error) {
                        set({
                            alerts: previousAlerts,
                            unresolvedAlertCount: previousCount,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        alerts: previousAlerts,
                        unresolvedAlertCount: previousCount,
                        error: err instanceof Error ? err.message : "Failed to bulk resolve alerts",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // PRICE HISTORY ACTIONS
            // ================================================================

            fetchPriceHistory: async (
                storeId: string,
                productId: string,
                variantId?: string
            ) => {
                const cacheKey = variantId ? `${productId}:${variantId}` : productId;
                const state = get();
                const cached = state.priceHistoryCache.get(cacheKey);

                if (cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await inventoryService.getPriceHistory(
                        storeId,
                        productId,
                        variantId
                    );

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const history = result.data ?? [];
                    const newCache = new Map(state.priceHistoryCache);
                    newCache.set(cacheKey, { data: history, fetchedAt: Date.now() });
                    set({ priceHistoryCache: newCache, priceHistory: history });

                    return history;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch price history",
                    });
                    return [];
                }
            },

            recordPriceChange: async (
                storeId: string,
                productId: string,
                priceType: string,
                oldPrice: number | null,
                newPrice: number,
                reason?: string,
                variantId?: string
            ) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await inventoryService.recordPriceChange(
                        storeId,
                        productId,
                        priceType,
                        oldPrice,
                        newPrice,
                        reason,
                        variantId
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Clear cache and re-fetch
                    const cacheKey = variantId ? `${productId}:${variantId}` : productId;
                    get().clearPriceHistoryCache(cacheKey);

                    if (result.data) {
                        // Optimistically prepend to price history
                        set((state) => ({
                            priceHistory: [result.data!, ...state.priceHistory],
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to record price change",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // DASHBOARD ACTIONS
            // ================================================================

            fetchDashboardStats: async (storeId: string) => {
                try {
                    const result = await inventoryService.getDashboardStats(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ dashboardStats: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch dashboard stats",
                    });
                }
            },

            fetchValuationSummary: async (storeId: string) => {
                try {
                    const result = await inventoryService.getValuationSummary(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ valuationSummary: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch valuation summary",
                    });
                }
            },

            // ================================================================
            // FILTER & PAGINATION ACTIONS
            // ================================================================

            setInventoryFilters: (filters: Partial<InventoryFilters>) => {
                set((state) => ({
                    inventoryFilters: { ...state.inventoryFilters, ...filters },
                    inventoryPagination: { ...state.inventoryPagination, page: 1 },
                    lastFetch: null,
                }));
            },

            setInventoryPagination: (pagination: Partial<InventoryPagination>) => {
                set((state) => ({
                    inventoryPagination: { ...state.inventoryPagination, ...pagination },
                    lastFetch: null,
                }));
            },

            setTransactionFilters: (filters: Partial<TransactionFilters>) => {
                set((state) => ({
                    transactionFilters: { ...state.transactionFilters, ...filters },
                    transactionPagination: { ...state.transactionPagination, page: 1 },
                }));
            },

            setTransactionPagination: (pagination: Partial<TransactionPagination>) => {
                set((state) => ({
                    transactionPagination: { ...state.transactionPagination, ...pagination },
                }));
            },

            setBatchFilters: (filters: Partial<BatchFilters>) => {
                set((state) => ({
                    batchFilters: { ...state.batchFilters, ...filters },
                }));
            },

            // ================================================================
            // UI STATE ACTIONS
            // ================================================================

            setSelectedItemIds: (ids: string[]) => {
                set({ selectedItemIds: ids });
            },

            toggleItemSelection: (itemId: string) => {
                set((state) => ({
                    selectedItemIds: state.selectedItemIds.includes(itemId)
                        ? state.selectedItemIds.filter((id) => id !== itemId)
                        : [...state.selectedItemIds, itemId],
                }));
            },

            clearSelection: () => {
                set({ selectedItemIds: [] });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            // ================================================================
            // CACHE ACTIONS
            // ================================================================

            invalidateCache: () => {
                set({ lastFetch: null });
            },

            clearTransactionCache: (productId?: string) => {
                set((state) => {
                    const newCache = new Map(state.transactionCache);
                    if (productId) {
                        newCache.delete(productId);
                    } else {
                        newCache.clear();
                    }
                    return { transactionCache: newCache };
                });
            },

            clearTransactionListCache: () => {
                inFlightTransactionListRequests.clear();
                set({ transactionListCache: new Map() });
            },

            clearBatchCache: (productId?: string) => {
                set((state) => {
                    const newCache = new Map(state.batchCache);
                    if (productId) {
                        newCache.delete(productId);
                    } else {
                        newCache.clear();
                    }
                    return { batchCache: newCache };
                });
            },

            clearPriceHistoryCache: (productId?: string) => {
                set((state) => {
                    const newCache = new Map(state.priceHistoryCache);
                    if (productId) {
                        newCache.delete(productId);
                    } else {
                        newCache.clear();
                    }
                    return { priceHistoryCache: newCache };
                });
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                inFlightTransactionListRequests.clear();
                set({
                    ...initialState,
                    transactionCache: new Map(),
                    transactionListCache: new Map(),
                    batchCache: new Map(),
                    priceHistoryCache: new Map(),
                });
            },
        }),
        { name: "InventoryStore" }
    )
);
