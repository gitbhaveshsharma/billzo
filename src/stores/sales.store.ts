import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { salesService } from "@/services/sales.service";
import type {
    Sale,
    SaleItem,
    SalePayment,
    SaleReturn,
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
    ReturnFilters,
    ReturnPagination,
    SaleSummaryView,
    ProductSalesReport,
    SalesDashboardStats,
    CartItem,
    HoldBill,
    InvoiceSequence,
} from "@/types/sales.types";
import type { DiscountType } from "@/types/sales.types";
import {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    applyCartItemDiscount,
    calculateCartTotals,
    createHoldBill,
    getEmptySalesDashboardStats,
    type SaleCalculation,
} from "@/utils/sales.utils";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface SalesState {
    // Sale list data
    sales: Sale[];
    currentSale: EnrichedSale | null;
    todaySummaries: SaleSummaryView[];
    productSalesReport: ProductSalesReport[];
    dashboardStats: SalesDashboardStats;
    creditSales: Sale[];
    holdBills: Sale[];

    // Return data
    returns: SaleReturn[];
    currentReturn: EnrichedSaleReturn | null;
    totalReturns: number;
    totalReturnPages: number;

    // Invoice sequences
    invoiceSequences: InvoiceSequence[];

    // Cart (POS billing flow)
    cart: CartItem[];
    cartCustomerId: string | null;
    cartCustomerName: string | null;
    cartCustomerPhone: string | null;
    cartCustomerGstin: string | null;
    cartIsInterstate: boolean;
    cartGstType: "B2C" | "B2B" | "export";
    cartBillDiscountPercentage: number;
    cartBillDiscountAmount: number;
    cartNotes: string | null;
    cartShiftId: string | null;
    cartTotals: SaleCalculation;
    localHoldBills: HoldBill[];

    // Pagination & Filters
    filters: SaleFilters;
    pagination: SalePagination;
    totalSales: number;
    totalPages: number;
    returnFilters: ReturnFilters;
    returnPagination: ReturnPagination;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedSaleIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number;
    itemsCache: Map<string, { data: SaleItem[]; fetchedAt: number }>;
    paymentsCache: Map<string, { data: SalePayment[]; fetchedAt: number }>;

    // ================================================================
    // ACTIONS — FETCHING
    // ================================================================
    fetchSales: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchSaleById: (storeId: string, saleId: string) => Promise<void>;
    fetchTodaySales: (storeId: string) => Promise<void>;
    fetchHoldBills: (storeId: string) => Promise<void>;
    fetchCreditSales: (storeId: string) => Promise<void>;
    fetchDashboardStats: (storeId: string) => Promise<void>;
    fetchProductSalesReport: (storeId: string, dateFrom?: string, dateTo?: string) => Promise<void>;
    fetchInvoiceSequences: (storeId: string) => Promise<void>;

    // ACTIONS — SALE CRUD
    createSale: (storeId: string, data: CreateSaleRequest) => Promise<Sale | null>;
    updateSale: (storeId: string, saleId: string, data: UpdateSaleRequest) => Promise<boolean>;
    deleteSale: (storeId: string, saleId: string) => Promise<boolean>;

    // ACTIONS — STATUS TRANSITIONS
    completeSale: (saleId: string) => Promise<CompleteSaleResult | null>;
    holdSale: (storeId: string, saleId: string, notes?: string) => Promise<boolean>;
    recallSale: (storeId: string, saleId: string) => Promise<boolean>;
    cancelSale: (storeId: string, saleId: string, data: CancelSaleRequest) => Promise<boolean>;
    markReceiptPrinted: (storeId: string, saleId: string, data: MarkReceiptPrintedRequest) => Promise<boolean>;

    /**
     * Single-RPC POS commit: create sale + items + payments + complete in one DB roundtrip.
     * Returns sale_id + invoice_number on success, or null on failure.
     */
    commitSale: (
        storeId: string,
        data: CreateSaleRequest,
        payments: CreateSalePaymentRequest[],
        isInterstate: boolean
    ) => Promise<(CompleteSaleResult & { sale_id: string }) | null>;

    // ACTIONS — ITEMS
    fetchItems: (storeId: string, saleId: string, forceRefresh?: boolean) => Promise<SaleItem[]>;
    addItem: (storeId: string, saleId: string, item: CreateSaleItemRequest, isInterstate: boolean) => Promise<SaleItem | null>;
    updateItem: (storeId: string, itemId: string, updates: Partial<CreateSaleItemRequest>, currentItem: SaleItem, isInterstate: boolean) => Promise<boolean>;
    voidItem: (storeId: string, itemId: string) => Promise<boolean>;
    removeItem: (storeId: string, itemId: string) => Promise<boolean>;

    // ACTIONS — PAYMENTS
    fetchPayments: (storeId: string, saleId: string, forceRefresh?: boolean) => Promise<SalePayment[]>;
    addPayment: (storeId: string, saleId: string, data: CreateSalePaymentRequest) => Promise<SalePayment | null>;
    reversePayment: (storeId: string, paymentId: string) => Promise<boolean>;

    // ACTIONS — RETURNS
    fetchReturns: (storeId: string) => Promise<void>;
    fetchReturnById: (storeId: string, returnId: string) => Promise<void>;
    createReturn: (storeId: string, data: CreateSaleReturnRequest) => Promise<SaleReturn | null>;
    approveReturn: (storeId: string, returnId: string, data: ApproveReturnRequest) => Promise<boolean>;
    completeReturn: (storeId: string, returnId: string, refundReference?: string) => Promise<boolean>;

    // ACTIONS — CART (POS billing)
    addToCart: (item: Omit<CartItem, "cart_key">) => void;
    removeFromCart: (cartKey: string) => void;
    updateCartQuantity: (cartKey: string, quantity: number) => void;
    applyCartItemDiscount: (cartKey: string, discountType: DiscountType, discountPercentage: number, discountAmount: number) => void;
    setCartCustomer: (customerId: string | null, customerName: string | null, customerPhone: string | null, customerGstin?: string | null) => void;
    setCartBillDiscount: (percentage: number, amount: number) => void;
    setCartInterstate: (isInterstate: boolean) => void;
    setCartGstType: (gstType: "B2C" | "B2B" | "export") => void;
    setCartShiftId: (shiftId: string | null) => void;
    setCartNotes: (notes: string | null) => void;
    clearCart: () => void;
    holdCurrentBill: (cashierId: string) => void;
    recallLocalHoldBill: (billId: string) => void;
    removeLocalHoldBill: (billId: string) => void;

    // ACTIONS — FILTERS & PAGINATION
    setFilters: (filters: Partial<SaleFilters>) => void;
    setPagination: (pagination: Partial<SalePagination>) => void;
    setReturnFilters: (filters: Partial<ReturnFilters>) => void;
    setReturnPagination: (pagination: Partial<ReturnPagination>) => void;
    setSelectedSaleIds: (ids: string[]) => void;
    toggleSaleSelection: (saleId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // ACTIONS — CACHE
    invalidateCache: () => void;
    clearItemsCache: (saleId?: string) => void;
    clearPaymentsCache: (saleId?: string) => void;

    // ACTIONS — RESET
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const EMPTY_CART_TOTALS: SaleCalculation = {
    subtotal: 0,
    item_discount_total: 0,
    bill_discount_amount: 0,
    discount_total: 0,
    taxable_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    cess_amount: 0,
    tax_amount: 0,
    gross_total: 0,
    round_off: 0,
    total_amount: 0,
};

const initialState = {
    sales: [] as Sale[],
    currentSale: null as EnrichedSale | null,
    todaySummaries: [] as SaleSummaryView[],
    productSalesReport: [] as ProductSalesReport[],
    dashboardStats: getEmptySalesDashboardStats(),
    creditSales: [] as Sale[],
    holdBills: [] as Sale[],

    returns: [] as SaleReturn[],
    currentReturn: null as EnrichedSaleReturn | null,
    totalReturns: 0,
    totalReturnPages: 0,

    invoiceSequences: [] as InvoiceSequence[],

    cart: [] as CartItem[],
    cartCustomerId: null as string | null,
    cartCustomerName: null as string | null,
    cartCustomerPhone: null as string | null,
    cartCustomerGstin: null as string | null,
    cartIsInterstate: false,
    cartGstType: "B2C" as const,
    cartBillDiscountPercentage: 0,
    cartBillDiscountAmount: 0,
    cartNotes: null as string | null,
    cartShiftId: null as string | null,
    cartTotals: { ...EMPTY_CART_TOTALS },
    localHoldBills: [] as HoldBill[],

    filters: {} as SaleFilters,
    pagination: {
        page: 1,
        limit: 20,
        sort_by: "sale_time" as const,
        sort_order: "desc" as const,
    } as SalePagination,
    totalSales: 0,
    totalPages: 0,
    returnFilters: {} as ReturnFilters,
    returnPagination: {
        page: 1,
        limit: 20,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
    } as ReturnPagination,

    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null as string | null,
    selectedSaleIds: [] as string[],
    lastFetch: null as number | null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    itemsCache: new Map() as Map<string, { data: SaleItem[]; fetchedAt: number }>,
    paymentsCache: new Map() as Map<string, { data: SalePayment[]; fetchedAt: number }>,
};

// ============================================================================
// HELPER — recalculate cart totals
// ============================================================================

const recalcCartTotals = (state: {
    cart: CartItem[];
    cartBillDiscountPercentage: number;
    cartBillDiscountAmount: number;
    cartIsInterstate: boolean;
}): SaleCalculation =>
    state.cart.length > 0
        ? calculateCartTotals(
              state.cart,
              state.cartBillDiscountPercentage,
              state.cartBillDiscountAmount,
              state.cartIsInterstate
          )
        : { ...EMPTY_CART_TOTALS };

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useSalesStore = create<SalesState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // FETCHING
            // ================================================================

            fetchSales: async (storeId, forceRefresh = false) => {
                const state = get();

                if (!forceRefresh && state.lastFetch) {
                    const elapsed = Date.now() - state.lastFetch;
                    if (elapsed < state.cacheTimeout) return;
                }

                set({
                    isLoading: !state.sales.length,
                    isRefreshing: !!state.sales.length,
                });

                try {
                    const result = await salesService.getList(
                        storeId,
                        state.filters,
                        state.pagination
                    );

                    if (result.error) {
                        set({ error: result.error, isLoading: false, isRefreshing: false });
                        return;
                    }

                    if (result.data) {
                        set({
                            sales: result.data.sales,
                            totalSales: result.data.total,
                            totalPages: result.data.total_pages,
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch sales",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchSaleById: async (storeId, saleId) => {
                set({ isLoading: true });

                try {
                    const result = await salesService.getById(storeId, saleId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentSale: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch sale",
                        isLoading: false,
                    });
                }
            },

            fetchTodaySales: async (storeId) => {
                try {
                    const result = await salesService.getTodaySales(storeId);
                    if (result.data) {
                        set({ todaySummaries: result.data });
                    }
                } catch {
                    // Silent fail for today's sales
                }
            },

            fetchHoldBills: async (storeId) => {
                try {
                    const result = await salesService.getHoldBills(storeId);
                    if (result.data) {
                        set({ holdBills: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            fetchCreditSales: async (storeId) => {
                try {
                    const result = await salesService.getCreditSales(storeId);
                    if (result.data) {
                        set({ creditSales: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            fetchDashboardStats: async (storeId) => {
                try {
                    const [summaryResult, holdResult] = await Promise.all([
                        salesService.getTodaySales(storeId),
                        salesService.getHoldBills(storeId),
                    ]);

                    const summaries = summaryResult.data ?? [];
                    const holds = holdResult.data ?? [];

                    // Build basic stats from summaries
                    const completedSales = summaries.filter(
                        (s) =>
                            s.status === "COMPLETED" ||
                            s.status === "CREDIT" ||
                            s.status === "PARTIAL_PAID"
                    );

                    const stats: SalesDashboardStats = {
                        today_sales_count: completedSales.length,
                        today_sales_amount: completedSales.reduce(
                            (sum, s) => sum + s.total_amount,
                            0
                        ),
                        today_returns_count: summaries.filter(
                            (s) =>
                                s.status === "PARTIAL_RETURN" ||
                                s.status === "FULLY_RETURNED"
                        ).length,
                        today_returns_amount: 0,
                        today_discount_total: completedSales.reduce(
                            (sum, s) => sum + s.discount_total,
                            0
                        ),
                        today_tax_total: completedSales.reduce(
                            (sum, s) => sum + s.tax_amount,
                            0
                        ),
                        today_cash: 0,
                        today_card: 0,
                        today_upi: 0,
                        today_other: 0,
                        today_credit_sales: summaries.filter(
                            (s) => s.is_credit_sale
                        ).length,
                        today_credit_amount: summaries
                            .filter((s) => s.is_credit_sale)
                            .reduce((sum, s) => sum + s.total_amount, 0),
                        total_outstanding: summaries.reduce(
                            (sum, s) => sum + s.due_amount,
                            0
                        ),
                        average_bill_value:
                            completedSales.length > 0
                                ? completedSales.reduce(
                                      (sum, s) => sum + s.total_amount,
                                      0
                                  ) / completedSales.length
                                : 0,
                        average_items_per_bill:
                            completedSales.length > 0
                                ? completedSales.reduce(
                                      (sum, s) => sum + (s.total_quantity ?? 0),
                                      0
                                  ) / completedSales.length
                                : 0,
                        hold_bills_count: holds.length,
                        top_products: [],
                    };

                    set({ dashboardStats: stats, todaySummaries: summaries, holdBills: holds });
                } catch {
                    // Silent fail
                }
            },

            fetchProductSalesReport: async (storeId, dateFrom, dateTo) => {
                try {
                    const result = await salesService.getProductSalesReport(
                        storeId,
                        dateFrom,
                        dateTo
                    );
                    if (result.data) {
                        set({ productSalesReport: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            fetchInvoiceSequences: async (storeId) => {
                try {
                    const result = await salesService.getInvoiceSequences(storeId);
                    if (result.data) {
                        set({ invoiceSequences: result.data });
                    }
                } catch {
                    // Silent fail
                }
            },

            // ================================================================
            // SALE CRUD
            // ================================================================

            createSale: async (storeId, data) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.create(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistic: prepend to list
                        set((state) => ({
                            sales: [result.data!, ...state.sales],
                            totalSales: state.totalSales + 1,
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
                        error: err instanceof Error ? err.message : "Failed to create sale",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateSale: async (storeId, saleId, data) => {
                set({ isSaving: true, error: null });
                const prevSales = get().sales;

                // Optimistic update
                set((state) => ({
                    sales: state.sales.map((s) =>
                        s.id === saleId ? { ...s, ...data } : s
                    ),
                }));

                try {
                    const result = await salesService.update(storeId, saleId, data);

                    if (result.error) {
                        set({ sales: prevSales, error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId ? result.data! : s
                            ),
                            currentSale:
                                state.currentSale?.id === saleId
                                    ? { ...state.currentSale, ...result.data! }
                                    : state.currentSale,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        sales: prevSales,
                        error: err instanceof Error ? err.message : "Failed to update sale",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteSale: async (storeId, saleId) => {
                set({ isSaving: true, error: null });
                const prevSales = get().sales;

                // Optimistic remove
                set((state) => ({
                    sales: state.sales.filter((s) => s.id !== saleId),
                    totalSales: state.totalSales - 1,
                }));

                try {
                    const result = await salesService.delete(storeId, saleId);

                    if (result.error) {
                        set({ sales: prevSales, error: result.error, isSaving: false });
                        return false;
                    }

                    set({ isSaving: false });
                    get().invalidateCache();
                    return true;
                } catch (err) {
                    set({
                        sales: prevSales,
                        error: err instanceof Error ? err.message : "Failed to delete sale",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // STATUS TRANSITIONS
            // ================================================================

            completeSale: async (saleId) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.completeSale(saleId);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update sale status in list
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId
                                    ? {
                                          ...s,
                                          status: result.data!.status ?? "COMPLETED",
                                          invoice_number:
                                              result.data!.invoice_number ?? s.invoice_number,
                                          paid_amount:
                                              result.data!.total_paid ?? s.paid_amount,
                                      }
                                    : s
                            ),
                            isSaving: false,
                        }));
                        get().invalidateCache();
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to complete sale",
                        isSaving: false,
                    });
                    return null;
                }
            },

            commitSale: async (storeId, data, payments, isInterstate) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.commitSale(
                        storeId,
                        data,
                        payments,
                        isInterstate
                    );

                    if (result.error || !result.data) {
                        set({
                            error: result.error ?? "Sale commit failed",
                            isSaving: false,
                        });
                        return null;
                    }

                    set({ isSaving: false });
                    get().invalidateCache();
                    return result.data;
                } catch (err) {
                    set({
                        error:
                            err instanceof Error
                                ? err.message
                                : "Failed to commit sale",
                        isSaving: false,
                    });
                    return null;
                }
            },

            holdSale: async (storeId, saleId, notes) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.holdSale(storeId, saleId, notes);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId ? result.data! : s
                            ),
                            holdBills: [result.data!, ...state.holdBills],
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to hold sale",
                        isSaving: false,
                    });
                    return false;
                }
            },

            recallSale: async (storeId, saleId) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.recallSale(storeId, saleId);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId ? result.data! : s
                            ),
                            holdBills: state.holdBills.filter((s) => s.id !== saleId),
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to recall sale",
                        isSaving: false,
                    });
                    return false;
                }
            },

            cancelSale: async (storeId, saleId, data) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.cancelSale(storeId, saleId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId ? result.data! : s
                            ),
                            currentSale:
                                state.currentSale?.id === saleId
                                    ? { ...state.currentSale, ...result.data! }
                                    : state.currentSale,
                            isSaving: false,
                        }));
                        get().invalidateCache();
                    }

                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to cancel sale",
                        isSaving: false,
                    });
                    return false;
                }
            },

            markReceiptPrinted: async (storeId, saleId, data) => {
                try {
                    const result = await salesService.markReceiptPrinted(
                        storeId,
                        saleId,
                        data
                    );

                    if (result.error) {
                        set({ error: result.error });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId ? result.data! : s
                            ),
                        }));
                    }

                    return true;
                } catch {
                    return false;
                }
            },

            // ================================================================
            // ITEMS
            // ================================================================

            fetchItems: async (storeId, saleId, forceRefresh = false) => {
                const cached = get().itemsCache.get(saleId);
                if (
                    !forceRefresh &&
                    cached &&
                    Date.now() - cached.fetchedAt < get().cacheTimeout
                ) {
                    return cached.data;
                }

                try {
                    const result = await salesService.getItems(storeId, saleId);
                    if (result.data) {
                        const newCache = new Map(get().itemsCache);
                        newCache.set(saleId, {
                            data: result.data,
                            fetchedAt: Date.now(),
                        });
                        set({ itemsCache: newCache });
                        return result.data;
                    }
                    return [];
                } catch {
                    return [];
                }
            },

            addItem: async (storeId, saleId, item, isInterstate) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.addItem(
                        storeId,
                        saleId,
                        item,
                        isInterstate
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update items cache
                        get().clearItemsCache(saleId);
                        set({ isSaving: false });
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

            updateItem: async (storeId, itemId, updates, currentItem, isInterstate) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.updateItem(
                        storeId,
                        itemId,
                        updates,
                        currentItem,
                        isInterstate
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    get().clearItemsCache(currentItem.sale_id);
                    set({ isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update item",
                        isSaving: false,
                    });
                    return false;
                }
            },

            voidItem: async (storeId, itemId) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.voidItem(storeId, itemId);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to void item",
                        isSaving: false,
                    });
                    return false;
                }
            },

            removeItem: async (storeId, itemId) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.removeItem(storeId, itemId);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to remove item",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // PAYMENTS
            // ================================================================

            fetchPayments: async (storeId, saleId, forceRefresh = false) => {
                const cached = get().paymentsCache.get(saleId);
                if (
                    !forceRefresh &&
                    cached &&
                    Date.now() - cached.fetchedAt < get().cacheTimeout
                ) {
                    return cached.data;
                }

                try {
                    const result = await salesService.getPayments(storeId, saleId);
                    if (result.data) {
                        const newCache = new Map(get().paymentsCache);
                        newCache.set(saleId, {
                            data: result.data.payments,
                            fetchedAt: Date.now(),
                        });
                        set({ paymentsCache: newCache });
                        return result.data.payments;
                    }
                    return [];
                } catch {
                    return [];
                }
            },

            addPayment: async (storeId, saleId, data) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.addPayment(
                        storeId,
                        saleId,
                        data
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update payments cache
                        get().clearPaymentsCache(saleId);

                        // Optimistic: update sale paid_amount in list
                        set((state) => ({
                            sales: state.sales.map((s) =>
                                s.id === saleId
                                    ? {
                                          ...s,
                                          paid_amount:
                                              s.paid_amount + result.data!.amount,
                                          due_amount: Math.max(
                                              0,
                                              s.due_amount - result.data!.amount
                                          ),
                                      }
                                    : s
                            ),
                            isSaving: false,
                        }));

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

            reversePayment: async (storeId, paymentId) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.reversePayment(
                        storeId,
                        paymentId
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to reverse payment",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // RETURNS
            // ================================================================

            fetchReturns: async (storeId) => {
                set({ isLoading: true });

                try {
                    const result = await salesService.getReturnsList(
                        storeId,
                        get().returnFilters,
                        get().returnPagination
                    );

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({
                            returns: result.data.returns,
                            totalReturns: result.data.total,
                            totalReturnPages: result.data.total_pages,
                            error: null,
                            isLoading: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch returns",
                        isLoading: false,
                    });
                }
            },

            fetchReturnById: async (storeId, returnId) => {
                set({ isLoading: true });

                try {
                    const result = await salesService.getReturnById(storeId, returnId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentReturn: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch return",
                        isLoading: false,
                    });
                }
            },

            createReturn: async (storeId, data) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.createReturn(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        set((state) => ({
                            returns: [result.data!, ...state.returns],
                            totalReturns: state.totalReturns + 1,
                            isSaving: false,
                        }));
                        get().invalidateCache();
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

            approveReturn: async (storeId, returnId, data) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.approveReturn(
                        storeId,
                        returnId,
                        data
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            returns: state.returns.map((r) =>
                                r.id === returnId ? result.data! : r
                            ),
                            currentReturn:
                                state.currentReturn?.id === returnId
                                    ? { ...state.currentReturn, ...result.data! }
                                    : state.currentReturn,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to process return",
                        isSaving: false,
                    });
                    return false;
                }
            },

            completeReturn: async (storeId, returnId, refundReference) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await salesService.completeReturn(
                        storeId,
                        returnId,
                        refundReference
                    );

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            returns: state.returns.map((r) =>
                                r.id === returnId ? result.data! : r
                            ),
                            isSaving: false,
                        }));
                        get().invalidateCache();
                    }

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
            // CART (POS billing flow) — all client-side, no server calls
            // ================================================================

            addToCart: (item) => {
                set((state) => {
                    const newCart = addToCart(state.cart, item);
                    const newState = { ...state, cart: newCart };
                    return { cart: newCart, cartTotals: recalcCartTotals(newState) };
                });
            },

            removeFromCart: (cartKey) => {
                set((state) => {
                    const newCart = removeFromCart(state.cart, cartKey);
                    const newState = { ...state, cart: newCart };
                    return { cart: newCart, cartTotals: recalcCartTotals(newState) };
                });
            },

            updateCartQuantity: (cartKey, quantity) => {
                set((state) => {
                    const newCart = updateCartQuantity(
                        state.cart,
                        cartKey,
                        quantity
                    );
                    const newState = { ...state, cart: newCart };
                    return { cart: newCart, cartTotals: recalcCartTotals(newState) };
                });
            },

            applyCartItemDiscount: (
                cartKey,
                discountType,
                discountPercentage,
                discountAmount
            ) => {
                set((state) => {
                    const newCart = applyCartItemDiscount(
                        state.cart,
                        cartKey,
                        discountType,
                        discountPercentage,
                        discountAmount
                    );
                    const newState = { ...state, cart: newCart };
                    return { cart: newCart, cartTotals: recalcCartTotals(newState) };
                });
            },

            setCartCustomer: (customerId, customerName, customerPhone, customerGstin) => {
                set({
                    cartCustomerId: customerId,
                    cartCustomerName: customerName,
                    cartCustomerPhone: customerPhone,
                    cartCustomerGstin: customerGstin ?? null,
                });
            },

            setCartBillDiscount: (percentage, amount) => {
                set((state) => {
                    const newState = {
                        ...state,
                        cartBillDiscountPercentage: percentage,
                        cartBillDiscountAmount: amount,
                    };
                    return {
                        cartBillDiscountPercentage: percentage,
                        cartBillDiscountAmount: amount,
                        cartTotals: recalcCartTotals(newState),
                    };
                });
            },

            setCartInterstate: (isInterstate) => {
                set((state) => {
                    const newState = { ...state, cartIsInterstate: isInterstate };
                    return {
                        cartIsInterstate: isInterstate,
                        cartTotals: recalcCartTotals(newState),
                    };
                });
            },

            setCartGstType: (gstType) => {
                set({ cartGstType: gstType });
            },

            setCartShiftId: (shiftId) => {
                set({ cartShiftId: shiftId });
            },

            setCartNotes: (notes) => {
                set({ cartNotes: notes });
            },

            clearCart: () => {
                set({
                    cart: [],
                    cartCustomerId: null,
                    cartCustomerName: null,
                    cartCustomerPhone: null,
                    cartCustomerGstin: null,
                    cartIsInterstate: false,
                    cartGstType: "B2C",
                    cartBillDiscountPercentage: 0,
                    cartBillDiscountAmount: 0,
                    cartNotes: null,
                    cartTotals: { ...EMPTY_CART_TOTALS },
                });
            },

            holdCurrentBill: (cashierId) => {
                const state = get();
                if (state.cart.length === 0) return;

                const holdBill = createHoldBill(
                    state.cart,
                    state.cartCustomerId,
                    state.cartCustomerName,
                    state.cartCustomerPhone,
                    state.cartNotes,
                    cashierId
                );

                set((s) => ({
                    localHoldBills: [...s.localHoldBills, holdBill],
                    cart: [],
                    cartCustomerId: null,
                    cartCustomerName: null,
                    cartCustomerPhone: null,
                    cartCustomerGstin: null,
                    cartIsInterstate: false,
                    cartGstType: "B2C",
                    cartBillDiscountPercentage: 0,
                    cartBillDiscountAmount: 0,
                    cartNotes: null,
                    cartTotals: { ...EMPTY_CART_TOTALS },
                }));
            },

            recallLocalHoldBill: (billId) => {
                const state = get();
                const bill = state.localHoldBills.find((b) => b.id === billId);
                if (!bill) return;

                // If there's active cart, hold it first? No —
                // user should clear or hold before recalling

                set({
                    cart: [...bill.items],
                    cartCustomerId: bill.customer_id,
                    cartCustomerName: bill.customer_name,
                    cartCustomerPhone: bill.customer_phone,
                    cartNotes: bill.notes,
                    localHoldBills: state.localHoldBills.filter(
                        (b) => b.id !== billId
                    ),
                    cartTotals: recalcCartTotals({
                        cart: bill.items,
                        cartBillDiscountPercentage: state.cartBillDiscountPercentage,
                        cartBillDiscountAmount: state.cartBillDiscountAmount,
                        cartIsInterstate: state.cartIsInterstate,
                    }),
                });
            },

            removeLocalHoldBill: (billId) => {
                set((state) => ({
                    localHoldBills: state.localHoldBills.filter(
                        (b) => b.id !== billId
                    ),
                }));
            },

            // ================================================================
            // FILTERS & PAGINATION
            // ================================================================

            setFilters: (filters) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 },
                    lastFetch: null,
                }));
            },

            setPagination: (pagination) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                    lastFetch: null,
                }));
            },

            setReturnFilters: (filters) => {
                set((state) => ({
                    returnFilters: { ...state.returnFilters, ...filters },
                    returnPagination: { ...state.returnPagination, page: 1 },
                }));
            },

            setReturnPagination: (pagination) => {
                set((state) => ({
                    returnPagination: {
                        ...state.returnPagination,
                        ...pagination,
                    },
                }));
            },

            setSelectedSaleIds: (ids) => {
                set({ selectedSaleIds: ids });
            },

            toggleSaleSelection: (saleId) => {
                set((state) => ({
                    selectedSaleIds: state.selectedSaleIds.includes(saleId)
                        ? state.selectedSaleIds.filter((id) => id !== saleId)
                        : [...state.selectedSaleIds, saleId],
                }));
            },

            clearSelection: () => {
                set({ selectedSaleIds: [] });
            },

            setError: (error) => {
                set({ error });
            },

            // ================================================================
            // CACHE
            // ================================================================

            invalidateCache: () => {
                set({ lastFetch: null });
            },

            clearItemsCache: (saleId) => {
                if (saleId) {
                    const newCache = new Map(get().itemsCache);
                    newCache.delete(saleId);
                    set({ itemsCache: newCache });
                } else {
                    set({ itemsCache: new Map() });
                }
            },

            clearPaymentsCache: (saleId) => {
                if (saleId) {
                    const newCache = new Map(get().paymentsCache);
                    newCache.delete(saleId);
                    set({ paymentsCache: newCache });
                } else {
                    set({ paymentsCache: new Map() });
                }
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                set({ ...initialState, itemsCache: new Map(), paymentsCache: new Map() });
            },
        }),
        { name: "sales-store" }
    )
);
