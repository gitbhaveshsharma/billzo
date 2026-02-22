import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { purchaseService } from "@/services/purchase.service";
import type {
    PurchaseOrder,
    PurchaseOrderItem,
    PurchasePayment,
    PurchaseReturn,
    EnrichedPurchaseOrder,
    CreatePurchaseOrderRequest,
    UpdatePurchaseOrderRequest,
    CreatePurchaseOrderItemRequest,
    ReceiveItemRequest,
    CreatePurchasePaymentRequest,
    CreatePurchaseReturnRequest,
    PurchaseOrderFilters,
    PurchaseOrderPagination,
    PurchaseDashboardStats,
    SupplierPurchaseSummary,
    CancelPurchaseOrderRequest,
} from "@/types/purchase.types";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface PurchaseState {
    // Data
    orders: PurchaseOrder[];
    currentOrder: EnrichedPurchaseOrder | null;
    dashboardStats: PurchaseDashboardStats | null;
    recentOrders: PurchaseOrder[];
    overdueOrders: PurchaseOrder[];

    // Pagination & Filters
    filters: PurchaseOrderFilters;
    pagination: PurchaseOrderPagination;
    totalOrders: number;
    totalPages: number;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedOrderIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number;
    itemsCache: Map<string, { data: PurchaseOrderItem[]; fetchedAt: number }>;
    paymentsCache: Map<string, { data: PurchasePayment[]; fetchedAt: number }>;

    // Actions - Fetching
    fetchOrders: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchOrderById: (storeId: string, poId: string) => Promise<void>;
    fetchDashboardStats: (storeId: string) => Promise<void>;
    fetchRecentOrders: (storeId: string) => Promise<void>;
    fetchOverdueOrders: (storeId: string) => Promise<void>;
    fetchSupplierSummary: (storeId: string, supplierId: string) => Promise<SupplierPurchaseSummary | null>;

    // Actions - PO CRUD
    createOrder: (storeId: string, data: CreatePurchaseOrderRequest) => Promise<PurchaseOrder | null>;
    updateOrder: (storeId: string, poId: string, data: UpdatePurchaseOrderRequest) => Promise<boolean>;
    deleteOrder: (storeId: string, poId: string) => Promise<boolean>;
    confirmOrder: (storeId: string, poId: string) => Promise<boolean>;
    cancelOrder: (storeId: string, poId: string, request: CancelPurchaseOrderRequest) => Promise<boolean>;

    // Actions - Items
    fetchItems: (poId: string, forceRefresh?: boolean) => Promise<PurchaseOrderItem[]>;
    addItem: (storeId: string, poId: string, item: CreatePurchaseOrderItemRequest, isInterState: boolean) => Promise<PurchaseOrderItem | null>;
    removeItem: (storeId: string, itemId: string, poId: string) => Promise<boolean>;
    receiveItems: (storeId: string, poId: string, items: ReceiveItemRequest[]) => Promise<boolean>;

    // Actions - Payments
    fetchPayments: (poId: string, forceRefresh?: boolean) => Promise<PurchasePayment[]>;
    addPayment: (storeId: string, poId: string, data: CreatePurchasePaymentRequest) => Promise<PurchasePayment | null>;
    cancelPayment: (storeId: string, paymentId: string, poId: string) => Promise<boolean>;

    // Actions - Returns
    createReturn: (storeId: string, data: CreatePurchaseReturnRequest) => Promise<PurchaseReturn | null>;
    completeReturn: (storeId: string, returnId: string) => Promise<boolean>;

    // Actions - UI State
    setFilters: (filters: Partial<PurchaseOrderFilters>) => void;
    setPagination: (pagination: Partial<PurchaseOrderPagination>) => void;
    setSelectedOrderIds: (ids: string[]) => void;
    toggleOrderSelection: (orderId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // Actions - Cache
    invalidateCache: () => void;
    clearItemsCache: (poId?: string) => void;
    clearPaymentsCache: (poId?: string) => void;

    // Actions - Reset
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
    orders: [] as PurchaseOrder[],
    currentOrder: null as EnrichedPurchaseOrder | null,
    dashboardStats: null as PurchaseDashboardStats | null,
    recentOrders: [] as PurchaseOrder[],
    overdueOrders: [] as PurchaseOrder[],
    filters: {} as PurchaseOrderFilters,
    pagination: {
        page: 1,
        limit: 10,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
    } as PurchaseOrderPagination,
    totalOrders: 0,
    totalPages: 0,
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null as string | null,
    selectedOrderIds: [] as string[],
    lastFetch: null as number | null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    itemsCache: new Map() as Map<string, { data: PurchaseOrderItem[]; fetchedAt: number }>,
    paymentsCache: new Map() as Map<string, { data: PurchasePayment[]; fetchedAt: number }>,
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const usePurchaseStore = create<PurchaseState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // FETCHING ACTIONS
            // ================================================================

            fetchOrders: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache
                if (!forceRefresh && state.lastFetch) {
                    const elapsed = Date.now() - state.lastFetch;
                    if (elapsed < state.cacheTimeout) return;
                }

                set({
                    isLoading: !state.orders.length,
                    isRefreshing: !!state.orders.length,
                });

                try {
                    const result = await purchaseService.getList(
                        storeId,
                        state.filters,
                        state.pagination
                    );

                    if (result.error) {
                        set({ error: result.error, isLoading: false, isRefreshing: false });
                        return;
                    }

                    if (result.data) {
                        const newPage = result.data.page;
                        const newLimit = result.data.limit;
                        const currentPagination = get().pagination;
                        const paginationChanged =
                            newPage !== currentPagination.page || newLimit !== currentPagination.limit;

                        set({
                            orders: result.data.orders,
                            totalOrders: result.data.total,
                            totalPages: result.data.total_pages,
                            ...(paginationChanged
                                ? { pagination: { ...currentPagination, page: newPage, limit: newLimit } }
                                : {}),
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch purchase orders",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchOrderById: async (storeId: string, poId: string) => {
                set({ isLoading: true });

                try {
                    const result = await purchaseService.getById(storeId, poId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentOrder: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch purchase order",
                        isLoading: false,
                    });
                }
            },

            fetchDashboardStats: async (storeId: string) => {
                try {
                    const result = await purchaseService.getDashboardStats(storeId);

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

            fetchRecentOrders: async (storeId: string) => {
                try {
                    const result = await purchaseService.getRecent(storeId);
                    if (result.data) {
                        set({ recentOrders: result.data });
                    }
                } catch {
                    // Silent fail for recent orders
                }
            },

            fetchOverdueOrders: async (storeId: string) => {
                try {
                    const result = await purchaseService.getOverdue(storeId);
                    if (result.data) {
                        set({ overdueOrders: result.data });
                    }
                } catch {
                    // Silent fail for overdue orders
                }
            },

            fetchSupplierSummary: async (storeId: string, supplierId: string) => {
                try {
                    const result = await purchaseService.getSupplierPurchaseSummary(storeId, supplierId);
                    if (result.error) {
                        set({ error: result.error });
                        return null;
                    }
                    return result.data;
                } catch {
                    return null;
                }
            },

            // ================================================================
            // PO CRUD ACTIONS
            // ================================================================

            createOrder: async (storeId: string, data: CreatePurchaseOrderRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.create(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistically add to list
                        set((state) => ({
                            orders: [result.data!, ...state.orders],
                            totalOrders: state.totalOrders + 1,
                            error: null,
                            isSaving: false,
                        }));

                        get().invalidateCache();
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create purchase order",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateOrder: async (storeId: string, poId: string, data: UpdatePurchaseOrderRequest) => {
                set({ isSaving: true, error: null });

                const previousOrders = get().orders;
                const previousCurrent = get().currentOrder;

                // Exclude items from optimistic update — items are PurchaseOrderItem[]
                // in the store but CreatePurchaseOrderItemRequest[] in the request
                const { items: _items, ...headerData } = data;

                // Optimistic update (header fields only)
                set((state) => ({
                    orders: state.orders.map((o) =>
                        o.id === poId ? { ...o, ...headerData } : o
                    ),
                    currentOrder:
                        state.currentOrder?.id === poId
                            ? { ...state.currentOrder, ...headerData }
                            : state.currentOrder,
                }));

                try {
                    const result = await purchaseService.update(storeId, poId, data);

                    if (result.error) {
                        set({
                            orders: previousOrders,
                            currentOrder: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            orders: state.orders.map((o) =>
                                o.id === poId ? result.data! : o
                            ),
                            currentOrder:
                                state.currentOrder?.id === poId
                                    ? { ...state.currentOrder, ...result.data! }
                                    : state.currentOrder,
                            error: null,
                            isSaving: false,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        orders: previousOrders,
                        currentOrder: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update purchase order",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteOrder: async (storeId: string, poId: string) => {
                set({ isSaving: true, error: null });

                const previousOrders = get().orders;
                const previousTotal = get().totalOrders;

                // Optimistic removal
                set((state) => ({
                    orders: state.orders.filter((o) => o.id !== poId),
                    totalOrders: state.totalOrders - 1,
                    currentOrder:
                        state.currentOrder?.id === poId ? null : state.currentOrder,
                }));

                try {
                    const result = await purchaseService.delete(storeId, poId);

                    if (result.error) {
                        set({
                            orders: previousOrders,
                            totalOrders: previousTotal,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    get().clearItemsCache(poId);
                    get().clearPaymentsCache(poId);
                    return true;
                } catch (err) {
                    set({
                        orders: previousOrders,
                        totalOrders: previousTotal,
                        error: err instanceof Error ? err.message : "Failed to delete purchase order",
                        isSaving: false,
                    });
                    return false;
                }
            },

            confirmOrder: async (storeId: string, poId: string) => {
                set({ isSaving: true, error: null });

                const previousOrders = get().orders;
                const previousCurrent = get().currentOrder;

                // Optimistic update
                set((state) => ({
                    orders: state.orders.map((o) =>
                        o.id === poId ? { ...o, status: "confirmed" as const } : o
                    ),
                    currentOrder:
                        state.currentOrder?.id === poId
                            ? { ...state.currentOrder, status: "confirmed" as const }
                            : state.currentOrder,
                }));

                try {
                    const result = await purchaseService.confirm(storeId, poId);

                    if (result.error) {
                        set({
                            orders: previousOrders,
                            currentOrder: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            orders: state.orders.map((o) =>
                                o.id === poId ? result.data! : o
                            ),
                            currentOrder:
                                state.currentOrder?.id === poId
                                    ? { ...state.currentOrder, ...result.data! }
                                    : state.currentOrder,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        orders: previousOrders,
                        currentOrder: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to confirm order",
                        isSaving: false,
                    });
                    return false;
                }
            },

            cancelOrder: async (storeId: string, poId: string, request: CancelPurchaseOrderRequest) => {
                set({ isSaving: true, error: null });

                const previousOrders = get().orders;
                const previousCurrent = get().currentOrder;

                // Optimistic update
                set((state) => ({
                    orders: state.orders.map((o) =>
                        o.id === poId
                            ? { ...o, status: "cancelled" as const, cancellation_reason: request.cancellation_reason }
                            : o
                    ),
                    currentOrder:
                        state.currentOrder?.id === poId
                            ? {
                                ...state.currentOrder,
                                status: "cancelled" as const,
                                cancellation_reason: request.cancellation_reason,
                            }
                            : state.currentOrder,
                }));

                try {
                    const result = await purchaseService.cancel(storeId, poId, request);

                    if (result.error) {
                        set({
                            orders: previousOrders,
                            currentOrder: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            orders: state.orders.map((o) =>
                                o.id === poId ? result.data! : o
                            ),
                            currentOrder:
                                state.currentOrder?.id === poId
                                    ? { ...state.currentOrder, ...result.data! }
                                    : state.currentOrder,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        orders: previousOrders,
                        currentOrder: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to cancel order",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // ITEM ACTIONS
            // ================================================================

            fetchItems: async (poId: string, forceRefresh = false) => {
                const state = get();
                const cached = state.itemsCache.get(poId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await purchaseService.getItems(poId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const items = result.data ?? [];
                    const newCache = new Map(state.itemsCache);
                    newCache.set(poId, { data: items, fetchedAt: Date.now() });
                    set({ itemsCache: newCache });

                    // Update currentOrder items if matching
                    if (state.currentOrder?.id === poId) {
                        set((s) => ({
                            currentOrder: s.currentOrder
                                ? { ...s.currentOrder, items }
                                : null,
                        }));
                    }

                    return items;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch items",
                    });
                    return [];
                }
            },

            addItem: async (
                storeId: string,
                poId: string,
                item: CreatePurchaseOrderItemRequest,
                isInterState: boolean
            ) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.addItem(storeId, poId, item, isInterState);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update items cache
                        const state = get();
                        const cached = state.itemsCache.get(poId);
                        if (cached) {
                            const updatedItems = [...cached.data, result.data];
                            const newCache = new Map(state.itemsCache);
                            newCache.set(poId, { data: updatedItems, fetchedAt: Date.now() });
                            set({ itemsCache: newCache });
                        }

                        // Update currentOrder items
                        if (state.currentOrder?.id === poId) {
                            set((s) => ({
                                currentOrder: s.currentOrder
                                    ? { ...s.currentOrder, items: [...s.currentOrder.items, result.data!] }
                                    : null,
                            }));
                        }

                        set({ error: null, isSaving: false });
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to add item",
                        isSaving: false,
                    });
                    return null;
                }
            },

            removeItem: async (storeId: string, itemId: string, poId: string) => {
                set({ isSaving: true, error: null });

                const state = get();
                const previousCache = state.itemsCache.get(poId);

                // Optimistic removal
                if (previousCache) {
                    const updatedItems = previousCache.data.filter((i) => i.id !== itemId);
                    const newCache = new Map(state.itemsCache);
                    newCache.set(poId, { data: updatedItems, fetchedAt: previousCache.fetchedAt });
                    set({ itemsCache: newCache });
                }

                if (state.currentOrder?.id === poId) {
                    set((s) => ({
                        currentOrder: s.currentOrder
                            ? {
                                ...s.currentOrder,
                                items: s.currentOrder.items.filter((i) => i.id !== itemId),
                            }
                            : null,
                    }));
                }

                try {
                    const result = await purchaseService.removeItem(storeId, itemId);

                    if (result.error) {
                        // Revert
                        if (previousCache) {
                            const revertCache = new Map(get().itemsCache);
                            revertCache.set(poId, previousCache);
                            set({ itemsCache: revertCache });
                        }
                        // Re-fetch to restore currentOrder
                        await get().fetchItems(poId, true);
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    if (previousCache) {
                        const revertCache = new Map(get().itemsCache);
                        revertCache.set(poId, previousCache);
                        set({ itemsCache: revertCache });
                    }
                    await get().fetchItems(poId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to remove item",
                        isSaving: false,
                    });
                    return false;
                }
            },

            receiveItems: async (
                storeId: string,
                poId: string,
                items: ReceiveItemRequest[]
            ) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.receiveItems(storeId, poId, items);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh the order and items to get updated state
                    await get().fetchOrderById(storeId, poId);
                    get().clearItemsCache(poId);
                    get().invalidateCache();

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to receive items",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // PAYMENT ACTIONS
            // ================================================================

            fetchPayments: async (poId: string, forceRefresh = false) => {
                const state = get();
                const cached = state.paymentsCache.get(poId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await purchaseService.getPayments(poId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const payments = result.data ?? [];
                    const newCache = new Map(state.paymentsCache);
                    newCache.set(poId, { data: payments, fetchedAt: Date.now() });
                    set({ paymentsCache: newCache });

                    if (state.currentOrder?.id === poId) {
                        set((s) => ({
                            currentOrder: s.currentOrder
                                ? { ...s.currentOrder, payments }
                                : null,
                        }));
                    }

                    return payments;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch payments",
                    });
                    return [];
                }
            },

            addPayment: async (
                storeId: string,
                poId: string,
                data: CreatePurchasePaymentRequest
            ) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.addPayment(storeId, poId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update payments cache
                        const state = get();
                        const cached = state.paymentsCache.get(poId);
                        if (cached) {
                            const updatedPayments = [result.data, ...cached.data];
                            const newCache = new Map(state.paymentsCache);
                            newCache.set(poId, { data: updatedPayments, fetchedAt: Date.now() });
                            set({ paymentsCache: newCache });
                        }

                        // Refresh the order to get updated payment status
                        await get().fetchOrderById(storeId, poId);
                        get().invalidateCache();

                        set({ error: null, isSaving: false });
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to add payment",
                        isSaving: false,
                    });
                    return null;
                }
            },

            cancelPayment: async (storeId: string, paymentId: string, poId: string) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.cancelPayment(storeId, paymentId);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh to get updated payment status on PO
                    await get().fetchOrderById(storeId, poId);
                    get().clearPaymentsCache(poId);
                    get().invalidateCache();

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to cancel payment",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // RETURN ACTIONS
            // ================================================================

            createReturn: async (storeId: string, data: CreatePurchaseReturnRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.createReturn(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Refresh the PO to include new return
                        await get().fetchOrderById(storeId, data.purchase_order_id);
                        get().invalidateCache();

                        set({ error: null, isSaving: false });
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create return",
                        isSaving: false,
                    });
                    return null;
                }
            },

            completeReturn: async (storeId: string, returnId: string) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await purchaseService.completeReturn(storeId, returnId);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh the current order
                    const currentOrder = get().currentOrder;
                    if (currentOrder) {
                        await get().fetchOrderById(storeId, currentOrder.id);
                    }
                    get().invalidateCache();

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to complete return",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // UI STATE ACTIONS
            // ================================================================

            setFilters: (filters: Partial<PurchaseOrderFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 },
                    lastFetch: null,
                }));
            },

            setPagination: (pagination: Partial<PurchaseOrderPagination>) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                    lastFetch: null,
                }));
            },

            setSelectedOrderIds: (ids: string[]) => {
                set({ selectedOrderIds: ids });
            },

            toggleOrderSelection: (orderId: string) => {
                set((state) => ({
                    selectedOrderIds: state.selectedOrderIds.includes(orderId)
                        ? state.selectedOrderIds.filter((id) => id !== orderId)
                        : [...state.selectedOrderIds, orderId],
                }));
            },

            clearSelection: () => {
                set({ selectedOrderIds: [] });
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

            clearItemsCache: (poId?: string) => {
                set((state) => {
                    const newCache = new Map(state.itemsCache);
                    if (poId) {
                        newCache.delete(poId);
                    } else {
                        newCache.clear();
                    }
                    return { itemsCache: newCache };
                });
            },

            clearPaymentsCache: (poId?: string) => {
                set((state) => {
                    const newCache = new Map(state.paymentsCache);
                    if (poId) {
                        newCache.delete(poId);
                    } else {
                        newCache.clear();
                    }
                    return { paymentsCache: newCache };
                });
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                set({
                    ...initialState,
                    itemsCache: new Map(),
                    paymentsCache: new Map(),
                });
            },
        }),
        { name: "PurchaseStore" }
    )
);
