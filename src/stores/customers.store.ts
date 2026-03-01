import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { customerService } from "@/services/customers.service";
import type {
    Customer,
    CustomerLedgerEntry,
    CreditNote,
    CustomerCreditSummary,
    CreateCustomerRequest,
    UpdateCustomerRequest,
    CreateLedgerEntryRequest,
    RecordPaymentRequest,
    AdjustLoyaltyPointsRequest,
    BlacklistCustomerRequest,
    CustomerFilters,
    CustomerPagination,
    CustomerDashboardStats,
    CustomerType,
} from "@/types/customers.types";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface CustomerState {
    // Data
    customers: Customer[];
    currentCustomer: Customer | null;
    dashboardStats: CustomerDashboardStats | null;
    creditSummaries: CustomerCreditSummary[];

    // Ledger & Credit Notes (per customer)
    ledgerEntries: CustomerLedgerEntry[];
    ledgerTotal: number;
    creditNotes: CreditNote[];

    // Pagination & Filters
    filters: CustomerFilters;
    pagination: CustomerPagination;
    totalCustomers: number;
    totalPages: number;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    isSearching: boolean;
    error: string | null;
    selectedCustomerIds: string[];
    searchResults: Customer[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number;
    customerCache: Map<string, { data: Customer; fetchedAt: number }>;
    ledgerCache: Map<string, { data: CustomerLedgerEntry[]; total: number; fetchedAt: number }>;
    creditNotesCache: Map<string, { data: CreditNote[]; fetchedAt: number }>;

    // Actions — Fetching
    fetchCustomers: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchCustomerById: (storeId: string, customerId: string) => Promise<void>;
    fetchDashboardStats: (storeId: string) => Promise<void>;
    fetchCustomersWithOutstanding: (storeId: string) => Promise<void>;

    // Actions — POS Quick Lookup
    lookupByPhone: (storeId: string, phone: string) => Promise<Customer | null>;
    lookupByCode: (storeId: string, code: string) => Promise<Customer | null>;
    quickSearch: (storeId: string, query: string) => Promise<void>;
    checkPhoneUnique: (storeId: string, phone: string, excludeId?: string) => Promise<boolean>;

    // Actions — CRUD
    createCustomer: (storeId: string, data: CreateCustomerRequest) => Promise<Customer | null>;
    updateCustomer: (storeId: string, customerId: string, data: UpdateCustomerRequest) => Promise<boolean>;
    deleteCustomer: (storeId: string, customerId: string) => Promise<boolean>;
    deactivateCustomer: (storeId: string, customerId: string) => Promise<boolean>;
    reactivateCustomer: (storeId: string, customerId: string) => Promise<boolean>;

    // Actions — Blacklist
    toggleBlacklist: (storeId: string, customerId: string, data: BlacklistCustomerRequest) => Promise<boolean>;

    // Actions — Ledger
    fetchLedger: (storeId: string, customerId: string, page?: number, forceRefresh?: boolean) => Promise<void>;
    createLedgerEntry: (storeId: string, data: CreateLedgerEntryRequest) => Promise<CustomerLedgerEntry | null>;
    recordPayment: (storeId: string, data: RecordPaymentRequest) => Promise<boolean>;

    // Actions — Credit Notes
    fetchCreditNotes: (storeId: string, customerId: string, forceRefresh?: boolean) => Promise<void>;
    fetchCreditSummary: (storeId: string, customerId: string) => Promise<CustomerCreditSummary | null>;

    // Actions — Loyalty
    adjustLoyaltyPoints: (storeId: string, customerId: string, data: AdjustLoyaltyPointsRequest) => Promise<boolean>;

    // Actions — Tags
    addTags: (storeId: string, customerId: string, tags: string[]) => Promise<boolean>;
    removeTags: (storeId: string, customerId: string, tags: string[]) => Promise<boolean>;

    // Actions — Bulk
    bulkUpdateType: (storeId: string, customerIds: string[], type: CustomerType) => Promise<boolean>;
    bulkDeactivate: (storeId: string, customerIds: string[]) => Promise<boolean>;
    bulkAddTags: (storeId: string, customerIds: string[], tags: string[]) => Promise<boolean>;

    // Actions — UI State
    setFilters: (filters: Partial<CustomerFilters>) => void;
    setPagination: (pagination: Partial<CustomerPagination>) => void;
    setSelectedCustomerIds: (ids: string[]) => void;
    toggleCustomerSelection: (customerId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;
    clearSearchResults: () => void;

    // Actions — Cache
    cacheCustomer: (customer: Customer) => void;
    invalidateCache: () => void;
    invalidateLedgerCache: (customerId?: string) => void;
    invalidateCreditNotesCache: (customerId?: string) => void;

    // Actions — Reset
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const initialState = {
    // Data
    customers: [] as Customer[],
    currentCustomer: null as Customer | null,
    dashboardStats: null as CustomerDashboardStats | null,
    creditSummaries: [] as CustomerCreditSummary[],

    // Ledger & Credit Notes
    ledgerEntries: [] as CustomerLedgerEntry[],
    ledgerTotal: 0,
    creditNotes: [] as CreditNote[],

    // Pagination & Filters
    filters: {} as CustomerFilters,
    pagination: {
        page: 1,
        limit: 20,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
    } as CustomerPagination,
    totalCustomers: 0,
    totalPages: 0,

    // UI State
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    isSearching: false,
    error: null as string | null,
    selectedCustomerIds: [] as string[],
    searchResults: [] as Customer[],

    // Cache
    lastFetch: null as number | null,
    cacheTimeout: CACHE_TIMEOUT_MS,
    customerCache: new Map() as Map<string, { data: Customer; fetchedAt: number }>,
    ledgerCache: new Map() as Map<string, { data: CustomerLedgerEntry[]; total: number; fetchedAt: number }>,
    creditNotesCache: new Map() as Map<string, { data: CreditNote[]; fetchedAt: number }>,
};

// ============================================================================
// HELPER: Check if cache entry is still valid
// ============================================================================

function isCacheValid(fetchedAt: number, timeout: number): boolean {
    return Date.now() - fetchedAt < timeout;
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useCustomerStore = create<CustomerState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // FETCHING ACTIONS
            // ================================================================

            fetchCustomers: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache
                if (!forceRefresh && state.lastFetch) {
                    if (isCacheValid(state.lastFetch, state.cacheTimeout)) return;
                }

                set({
                    isLoading: !state.customers.length,
                    isRefreshing: !!state.customers.length,
                });

                try {
                    const result = await customerService.getList(
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
                            customers: result.data.customers,
                            totalCustomers: result.data.total,
                            totalPages: result.data.total_pages,
                            pagination: {
                                ...get().pagination,
                                page: result.data.page,
                                limit: result.data.limit,
                            },
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch customers",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchCustomerById: async (storeId: string, customerId: string) => {
                // Check customer cache first
                const cached = get().customerCache.get(customerId);
                if (cached && isCacheValid(cached.fetchedAt, get().cacheTimeout)) {
                    set({ currentCustomer: cached.data, error: null });
                    return;
                }

                set({ isLoading: true });

                try {
                    const result = await customerService.getById(storeId, customerId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        const newCache = new Map(get().customerCache);
                        newCache.set(customerId, { data: result.data, fetchedAt: Date.now() });

                        set({
                            currentCustomer: result.data,
                            customerCache: newCache,
                            error: null,
                            isLoading: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch customer",
                        isLoading: false,
                    });
                }
            },

            fetchDashboardStats: async (storeId: string) => {
                try {
                    const result = await customerService.getDashboardStats(storeId);

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

            fetchCustomersWithOutstanding: async (storeId: string) => {
                try {
                    const result = await customerService.getCustomersWithOutstanding(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ creditSummaries: result.data, error: null });
                    }
                } catch {
                    // Silent fail for credit summaries
                }
            },

            // ================================================================
            // POS QUICK LOOKUP
            // ================================================================

            lookupByPhone: async (storeId: string, phone: string) => {
                set({ isSearching: true });

                try {
                    const result = await customerService.getByPhone(storeId, phone);

                    set({ isSearching: false });

                    if (result.error) {
                        set({ error: result.error });
                        return null;
                    }

                    if (result.data) {
                        set({ currentCustomer: result.data, error: null });
                        return result.data;
                    }

                    return null;
                } catch {
                    set({ isSearching: false });
                    return null;
                }
            },

            lookupByCode: async (storeId: string, code: string) => {
                set({ isSearching: true });

                try {
                    const result = await customerService.getByCode(storeId, code);

                    set({ isSearching: false });

                    if (result.error) {
                        set({ error: result.error });
                        return null;
                    }

                    if (result.data) {
                        set({ currentCustomer: result.data, error: null });
                        return result.data;
                    }

                    return null;
                } catch {
                    set({ isSearching: false });
                    return null;
                }
            },

            quickSearch: async (storeId: string, query: string) => {
                if (!query.trim()) {
                    set({ searchResults: [], isSearching: false });
                    return;
                }

                set({ isSearching: true });

                try {
                    const result = await customerService.quickSearch(storeId, query);

                    if (result.data) {
                        set({ searchResults: result.data, isSearching: false, error: null });
                    } else {
                        set({ searchResults: [], isSearching: false });
                    }
                } catch {
                    set({ searchResults: [], isSearching: false });
                }
            },

            checkPhoneUnique: async (storeId: string, phone: string, excludeId?: string) => {
                try {
                    const result = await customerService.isPhoneUnique(storeId, phone, excludeId);
                    return result.data ?? false;
                } catch {
                    return false;
                }
            },

            // ================================================================
            // CRUD ACTIONS
            // ================================================================

            createCustomer: async (storeId: string, data: CreateCustomerRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await customerService.create(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistic: add to list immediately
                        set((state) => ({
                            customers: [result.data!, ...state.customers],
                            totalCustomers: state.totalCustomers + 1,
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
                        error: err instanceof Error ? err.message : "Failed to create customer",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateCustomer: async (storeId: string, customerId: string, data: UpdateCustomerRequest) => {
                set({ isSaving: true, error: null });

                // Store previous state for rollback
                const previousCustomers = get().customers;
                const previousCurrent = get().currentCustomer;

                // Optimistic update: apply changes immediately
                set((state) => ({
                    customers: state.customers.map((c) =>
                        c.id === customerId ? { ...c, ...data } : c
                    ),
                    currentCustomer:
                        state.currentCustomer?.id === customerId
                            ? { ...state.currentCustomer, ...data }
                            : state.currentCustomer,
                }));

                try {
                    const result = await customerService.update(storeId, customerId, data);

                    if (result.error) {
                        // Rollback on error
                        set({
                            customers: previousCustomers,
                            currentCustomer: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        // Replace with server response for accuracy
                        set((state) => ({
                            customers: state.customers.map((c) =>
                                c.id === customerId ? result.data! : c
                            ),
                            currentCustomer:
                                state.currentCustomer?.id === customerId
                                    ? result.data!
                                    : state.currentCustomer,
                            error: null,
                            isSaving: false,
                        }));

                        // Update customer cache
                        const newCache = new Map(get().customerCache);
                        newCache.set(customerId, { data: result.data, fetchedAt: Date.now() });
                        set({ customerCache: newCache });

                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    // Rollback on error
                    set({
                        customers: previousCustomers,
                        currentCustomer: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update customer",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteCustomer: async (storeId: string, customerId: string) => {
                set({ isSaving: true, error: null });

                // Optimistic: remove from list
                const previousCustomers = get().customers;
                set((state) => ({
                    customers: state.customers.filter((c) => c.id !== customerId),
                    totalCustomers: state.totalCustomers - 1,
                }));

                try {
                    const result = await customerService.delete(storeId, customerId);

                    if (result.error) {
                        // Rollback
                        set({
                            customers: previousCustomers,
                            totalCustomers: previousCustomers.length,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    // Clear from caches
                    const newCustCache = new Map(get().customerCache);
                    newCustCache.delete(customerId);
                    const newLedgerCache = new Map(get().ledgerCache);
                    newLedgerCache.delete(customerId);
                    const newCnCache = new Map(get().creditNotesCache);
                    newCnCache.delete(customerId);

                    set({
                        customerCache: newCustCache,
                        ledgerCache: newLedgerCache,
                        creditNotesCache: newCnCache,
                        currentCustomer:
                            get().currentCustomer?.id === customerId ? null : get().currentCustomer,
                        error: null,
                        isSaving: false,
                    });

                    return true;
                } catch (err) {
                    set({
                        customers: previousCustomers,
                        totalCustomers: previousCustomers.length,
                        error: err instanceof Error ? err.message : "Failed to delete customer",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deactivateCustomer: async (storeId: string, customerId: string) => {
                return get().updateCustomer(storeId, customerId, { is_active: false });
            },

            reactivateCustomer: async (storeId: string, customerId: string) => {
                return get().updateCustomer(storeId, customerId, { is_active: true });
            },

            // ================================================================
            // BLACKLIST
            // ================================================================

            toggleBlacklist: async (storeId: string, customerId: string, data: BlacklistCustomerRequest) => {
                set({ isSaving: true, error: null });

                const previousCustomers = get().customers;
                const previousCurrent = get().currentCustomer;

                // Optimistic update
                set((state) => ({
                    customers: state.customers.map((c) =>
                        c.id === customerId
                            ? {
                                  ...c,
                                  is_blacklisted: data.is_blacklisted,
                                  blacklist_reason: data.is_blacklisted ? (data.blacklist_reason ?? null) : null,
                                  is_active: data.is_blacklisted ? false : c.is_active,
                              }
                            : c
                    ),
                    currentCustomer:
                        state.currentCustomer?.id === customerId
                            ? {
                                  ...state.currentCustomer,
                                  is_blacklisted: data.is_blacklisted,
                                  blacklist_reason: data.is_blacklisted ? (data.blacklist_reason ?? null) : null,
                                  is_active: data.is_blacklisted ? false : state.currentCustomer.is_active,
                              }
                            : state.currentCustomer,
                }));

                try {
                    const result = await customerService.toggleBlacklist(storeId, customerId, data);

                    if (result.error) {
                        set({
                            customers: previousCustomers,
                            currentCustomer: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            customers: state.customers.map((c) =>
                                c.id === customerId ? result.data! : c
                            ),
                            currentCustomer:
                                state.currentCustomer?.id === customerId
                                    ? result.data!
                                    : state.currentCustomer,
                            isSaving: false,
                            error: null,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        customers: previousCustomers,
                        currentCustomer: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update blacklist",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // LEDGER
            // ================================================================

            fetchLedger: async (storeId: string, customerId: string, page = 1, forceRefresh = false) => {
                // Check cache
                if (!forceRefresh) {
                    const cached = get().ledgerCache.get(customerId);
                    if (cached && isCacheValid(cached.fetchedAt, get().cacheTimeout)) {
                        set({
                            ledgerEntries: cached.data,
                            ledgerTotal: cached.total,
                            error: null,
                        });
                        return;
                    }
                }

                set({ isLoading: true });

                try {
                    const result = await customerService.getLedger(storeId, customerId, page);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        const newCache = new Map(get().ledgerCache);
                        newCache.set(customerId, {
                            data: result.data.entries,
                            total: result.data.total,
                            fetchedAt: Date.now(),
                        });

                        set({
                            ledgerEntries: result.data.entries,
                            ledgerTotal: result.data.total,
                            ledgerCache: newCache,
                            error: null,
                            isLoading: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch ledger",
                        isLoading: false,
                    });
                }
            },

            createLedgerEntry: async (storeId: string, data: CreateLedgerEntryRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await customerService.createLedgerEntry(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistic: prepend to ledger entries
                        set((state) => ({
                            ledgerEntries: [result.data!, ...state.ledgerEntries],
                            ledgerTotal: state.ledgerTotal + 1,
                            isSaving: false,
                            error: null,
                        }));

                        get().invalidateLedgerCache(data.customer_id);
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create ledger entry",
                        isSaving: false,
                    });
                    return null;
                }
            },

            recordPayment: async (storeId: string, data: RecordPaymentRequest) => {
                set({ isSaving: true, error: null });

                // Optimistic: reduce outstanding balance locally
                const previousCustomers = get().customers;
                const previousCurrent = get().currentCustomer;

                set((state) => ({
                    customers: state.customers.map((c) =>
                        c.id === data.customer_id
                            ? { ...c, outstanding_balance: Math.max(0, c.outstanding_balance - data.amount) }
                            : c
                    ),
                    currentCustomer:
                        state.currentCustomer?.id === data.customer_id
                            ? {
                                  ...state.currentCustomer,
                                  outstanding_balance: Math.max(0, state.currentCustomer.outstanding_balance - data.amount),
                              }
                            : state.currentCustomer,
                }));

                try {
                    const result = await customerService.recordPayment(storeId, data);

                    if (result.error) {
                        // Rollback
                        set({
                            customers: previousCustomers,
                            currentCustomer: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    // Invalidate caches to get fresh data
                    get().invalidateLedgerCache(data.customer_id);
                    const newCustCache = new Map(get().customerCache);
                    newCustCache.delete(data.customer_id);
                    set({ customerCache: newCustCache, isSaving: false, error: null });

                    return true;
                } catch (err) {
                    set({
                        customers: previousCustomers,
                        currentCustomer: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to record payment",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // CREDIT NOTES
            // ================================================================

            fetchCreditNotes: async (storeId: string, customerId: string, forceRefresh = false) => {
                if (!forceRefresh) {
                    const cached = get().creditNotesCache.get(customerId);
                    if (cached && isCacheValid(cached.fetchedAt, get().cacheTimeout)) {
                        set({ creditNotes: cached.data, error: null });
                        return;
                    }
                }

                set({ isLoading: true });

                try {
                    const result = await customerService.getCreditNotes(storeId, customerId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        const newCache = new Map(get().creditNotesCache);
                        newCache.set(customerId, { data: result.data, fetchedAt: Date.now() });

                        set({
                            creditNotes: result.data,
                            creditNotesCache: newCache,
                            error: null,
                            isLoading: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch credit notes",
                        isLoading: false,
                    });
                }
            },

            fetchCreditSummary: async (storeId: string, customerId: string) => {
                try {
                    const result = await customerService.getCreditSummary(storeId, customerId);

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
            // LOYALTY POINTS
            // ================================================================

            adjustLoyaltyPoints: async (storeId: string, customerId: string, data: AdjustLoyaltyPointsRequest) => {
                set({ isSaving: true, error: null });

                // Store previous state for rollback
                const previousCustomers = get().customers;
                const previousCurrent = get().currentCustomer;

                // Optimistic update
                set((state) => ({
                    customers: state.customers.map((c) =>
                        c.id === customerId
                            ? {
                                  ...c,
                                  loyalty_points: c.loyalty_points + data.points,
                                  total_points_earned:
                                      data.points > 0 ? c.total_points_earned + data.points : c.total_points_earned,
                                  total_points_redeemed:
                                      data.points < 0
                                          ? c.total_points_redeemed + Math.abs(data.points)
                                          : c.total_points_redeemed,
                              }
                            : c
                    ),
                    currentCustomer:
                        state.currentCustomer?.id === customerId
                            ? {
                                  ...state.currentCustomer,
                                  loyalty_points: state.currentCustomer.loyalty_points + data.points,
                                  total_points_earned:
                                      data.points > 0
                                          ? state.currentCustomer.total_points_earned + data.points
                                          : state.currentCustomer.total_points_earned,
                                  total_points_redeemed:
                                      data.points < 0
                                          ? state.currentCustomer.total_points_redeemed + Math.abs(data.points)
                                          : state.currentCustomer.total_points_redeemed,
                              }
                            : state.currentCustomer,
                }));

                try {
                    const result = await customerService.adjustLoyaltyPoints(storeId, customerId, data);

                    if (result.error) {
                        set({
                            customers: previousCustomers,
                            currentCustomer: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        // Replace with server response
                        set((state) => ({
                            customers: state.customers.map((c) =>
                                c.id === customerId ? result.data! : c
                            ),
                            currentCustomer:
                                state.currentCustomer?.id === customerId
                                    ? result.data!
                                    : state.currentCustomer,
                            isSaving: false,
                            error: null,
                        }));

                        const newCache = new Map(get().customerCache);
                        newCache.set(customerId, { data: result.data, fetchedAt: Date.now() });
                        set({ customerCache: newCache });

                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        customers: previousCustomers,
                        currentCustomer: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to adjust loyalty points",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // TAGS
            // ================================================================

            addTags: async (storeId: string, customerId: string, tags: string[]) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await customerService.addTags(storeId, customerId, tags);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            customers: state.customers.map((c) =>
                                c.id === customerId ? result.data! : c
                            ),
                            currentCustomer:
                                state.currentCustomer?.id === customerId
                                    ? result.data!
                                    : state.currentCustomer,
                            isSaving: false,
                            error: null,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to add tags",
                        isSaving: false,
                    });
                    return false;
                }
            },

            removeTags: async (storeId: string, customerId: string, tags: string[]) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await customerService.removeTags(storeId, customerId, tags);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            customers: state.customers.map((c) =>
                                c.id === customerId ? result.data! : c
                            ),
                            currentCustomer:
                                state.currentCustomer?.id === customerId
                                    ? result.data!
                                    : state.currentCustomer,
                            isSaving: false,
                            error: null,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to remove tags",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // BULK OPERATIONS
            // ================================================================

            bulkUpdateType: async (storeId: string, customerIds: string[], type: CustomerType) => {
                set({ isSaving: true, error: null });

                // Optimistic
                const previousCustomers = get().customers;
                set((state) => ({
                    customers: state.customers.map((c) =>
                        customerIds.includes(c.id) ? { ...c, customer_type: type } : c
                    ),
                }));

                try {
                    const result = await customerService.bulkUpdateType(storeId, customerIds, type);

                    if (result.error) {
                        set({ customers: previousCustomers, error: result.error, isSaving: false });
                        return false;
                    }

                    set({ selectedCustomerIds: [], isSaving: false, error: null });
                    get().invalidateCache();
                    return true;
                } catch (err) {
                    set({
                        customers: previousCustomers,
                        error: err instanceof Error ? err.message : "Failed to bulk update type",
                        isSaving: false,
                    });
                    return false;
                }
            },

            bulkDeactivate: async (storeId: string, customerIds: string[]) => {
                set({ isSaving: true, error: null });

                const previousCustomers = get().customers;
                set((state) => ({
                    customers: state.customers.map((c) =>
                        customerIds.includes(c.id) ? { ...c, is_active: false } : c
                    ),
                }));

                try {
                    const result = await customerService.bulkDeactivate(storeId, customerIds);

                    if (result.error) {
                        set({ customers: previousCustomers, error: result.error, isSaving: false });
                        return false;
                    }

                    set({ selectedCustomerIds: [], isSaving: false, error: null });
                    get().invalidateCache();
                    return true;
                } catch (err) {
                    set({
                        customers: previousCustomers,
                        error: err instanceof Error ? err.message : "Failed to bulk deactivate",
                        isSaving: false,
                    });
                    return false;
                }
            },

            bulkAddTags: async (storeId: string, customerIds: string[], tags: string[]) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await customerService.bulkAddTags(storeId, customerIds, tags);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ selectedCustomerIds: [], isSaving: false, error: null });
                    get().invalidateCache();
                    // Force refresh to get new tags
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to bulk add tags",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // UI STATE
            // ================================================================

            setFilters: (filters: Partial<CustomerFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 }, // Reset to page 1 on filter change
                    lastFetch: null, // Force refresh
                }));
            },

            setPagination: (pagination: Partial<CustomerPagination>) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                    lastFetch: null, // Force refresh
                }));
            },

            setSelectedCustomerIds: (ids: string[]) => {
                set({ selectedCustomerIds: ids });
            },

            toggleCustomerSelection: (customerId: string) => {
                set((state) => {
                    const exists = state.selectedCustomerIds.includes(customerId);
                    return {
                        selectedCustomerIds: exists
                            ? state.selectedCustomerIds.filter((id) => id !== customerId)
                            : [...state.selectedCustomerIds, customerId],
                    };
                });
            },

            clearSelection: () => {
                set({ selectedCustomerIds: [] });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            clearSearchResults: () => {
                set({ searchResults: [], isSearching: false });
            },

            // ================================================================
            // CACHE MANAGEMENT
            // ================================================================

            cacheCustomer: (customer: Customer) => {
                const newCache = new Map(get().customerCache);
                newCache.set(customer.id, { data: customer, fetchedAt: Date.now() });
                set({ customerCache: newCache });
            },

            invalidateCache: () => {
                set({
                    lastFetch: null,
                    customerCache: new Map(),
                });
            },

            invalidateLedgerCache: (customerId?: string) => {
                if (customerId) {
                    const newCache = new Map(get().ledgerCache);
                    newCache.delete(customerId);
                    set({ ledgerCache: newCache });
                } else {
                    set({ ledgerCache: new Map() });
                }
            },

            invalidateCreditNotesCache: (customerId?: string) => {
                if (customerId) {
                    const newCache = new Map(get().creditNotesCache);
                    newCache.delete(customerId);
                    set({ creditNotesCache: newCache });
                } else {
                    set({ creditNotesCache: new Map() });
                }
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                set({ ...initialState });
            },
        }),
        { name: "customer-store" }
    )
);
