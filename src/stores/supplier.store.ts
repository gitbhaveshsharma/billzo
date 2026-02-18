import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { supplierService } from "@/services/supplier.service";
import type {
    Supplier,
    SupplierContact,
    SupplierProduct,
    EnrichedSupplier,
    CreateSupplierRequest,
    UpdateSupplierRequest,
    CreateSupplierContactRequest,
    UpdateSupplierContactRequest,
    SupplierFilters,
    SupplierPagination,
    SupplierStats,
    BlacklistSupplierRequest,
} from "@/types/supplier.types";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface SupplierState {
    // Data
    suppliers: Supplier[];
    currentSupplier: EnrichedSupplier | null;
    stats: SupplierStats | null;
    supplierProducts: SupplierProduct[];

    // Pagination & Filters
    filters: SupplierFilters;
    pagination: SupplierPagination;
    totalSuppliers: number;
    totalPages: number;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedSupplierIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number;
    contactsCache: Map<string, { data: SupplierContact[]; fetchedAt: number }>;
    productsCache: Map<string, { data: SupplierProduct[]; fetchedAt: number }>;

    // Actions - Fetching
    fetchSuppliers: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchSupplierById: (storeId: string, supplierId: string) => Promise<void>;
    fetchStats: (storeId: string) => Promise<void>;

    // Actions - Supplier CRUD
    createSupplier: (storeId: string, data: CreateSupplierRequest) => Promise<Supplier | null>;
    updateSupplier: (storeId: string, supplierId: string, data: UpdateSupplierRequest) => Promise<boolean>;
    deleteSupplier: (storeId: string, supplierId: string) => Promise<boolean>;
    activateSupplier: (storeId: string, supplierId: string) => Promise<boolean>;
    deactivateSupplier: (storeId: string, supplierId: string) => Promise<boolean>;
    togglePreferred: (storeId: string, supplierId: string, isPreferred: boolean) => Promise<boolean>;
    blacklistSupplier: (storeId: string, supplierId: string, request: BlacklistSupplierRequest) => Promise<boolean>;
    unblacklistSupplier: (storeId: string, supplierId: string) => Promise<boolean>;

    // Actions - Contact CRUD
    fetchContacts: (supplierId: string, forceRefresh?: boolean) => Promise<SupplierContact[]>;
    addContact: (supplierId: string, data: CreateSupplierContactRequest) => Promise<SupplierContact | null>;
    updateContact: (supplierId: string, contactId: string, data: UpdateSupplierContactRequest) => Promise<boolean>;
    deleteContact: (supplierId: string, contactId: string) => Promise<boolean>;
    setPrimaryContact: (supplierId: string, contactId: string) => Promise<boolean>;

    // Actions - Supplier Products
    fetchSupplierProducts: (storeId: string, supplierId: string, forceRefresh?: boolean) => Promise<SupplierProduct[]>;

    // Actions - UI State
    setFilters: (filters: Partial<SupplierFilters>) => void;
    setPagination: (pagination: Partial<SupplierPagination>) => void;
    setSelectedSupplierIds: (ids: string[]) => void;
    toggleSupplierSelection: (supplierId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // Actions - Cache
    invalidateCache: () => void;
    clearContactsCache: (supplierId?: string) => void;
    clearProductsCache: (supplierId?: string) => void;

    // Actions - Reset
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
    suppliers: [] as Supplier[],
    currentSupplier: null as EnrichedSupplier | null,
    stats: null as SupplierStats | null,
    supplierProducts: [] as SupplierProduct[],
    filters: {} as SupplierFilters,
    pagination: {
        page: 1,
        limit: 10,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
    } as SupplierPagination,
    totalSuppliers: 0,
    totalPages: 0,
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null as string | null,
    selectedSupplierIds: [] as string[],
    lastFetch: null as number | null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    contactsCache: new Map() as Map<string, { data: SupplierContact[]; fetchedAt: number }>,
    productsCache: new Map() as Map<string, { data: SupplierProduct[]; fetchedAt: number }>,
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useSupplierStore = create<SupplierState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // FETCHING ACTIONS
            // ================================================================

            fetchSuppliers: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache validity
                if (!forceRefresh && state.lastFetch) {
                    const elapsed = Date.now() - state.lastFetch;
                    if (elapsed < state.cacheTimeout) return;
                }

                set({
                    isLoading: !state.suppliers.length,
                    isRefreshing: !!state.suppliers.length,
                });

                try {
                    const result = await supplierService.getList(
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
                        // Only create a new pagination object if values actually changed
                        // to avoid triggering unnecessary re-renders in consumers
                        const paginationChanged =
                            newPage !== currentPagination.page || newLimit !== currentPagination.limit;

                        set({
                            suppliers: result.data.suppliers,
                            totalSuppliers: result.data.total,
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
                        error: err instanceof Error ? err.message : "Failed to fetch suppliers",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchSupplierById: async (storeId: string, supplierId: string) => {
                set({ isLoading: true });

                try {
                    const result = await supplierService.getById(storeId, supplierId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentSupplier: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch supplier",
                        isLoading: false,
                    });
                }
            },

            fetchStats: async (storeId: string) => {
                try {
                    const result = await supplierService.getStats(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    if (result.data) {
                        set({ stats: result.data, error: null });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch supplier statistics",
                    });
                }
            },

            // ================================================================
            // SUPPLIER CRUD ACTIONS
            // ================================================================

            createSupplier: async (storeId: string, data: CreateSupplierRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await supplierService.create(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistically add to list
                        set((state) => ({
                            suppliers: [result.data!, ...state.suppliers],
                            totalSuppliers: state.totalSuppliers + 1,
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
                        error: err instanceof Error ? err.message : "Failed to create supplier",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateSupplier: async (
                storeId: string,
                supplierId: string,
                data: UpdateSupplierRequest
            ) => {
                set({ isSaving: true, error: null });

                // Store previous state for rollback
                const previousSuppliers = get().suppliers;
                const previousCurrent = get().currentSupplier;

                // Optimistic update
                set((state) => ({
                    suppliers: state.suppliers.map((s) =>
                        s.id === supplierId ? { ...s, ...data } : s
                    ),
                    currentSupplier:
                        state.currentSupplier?.id === supplierId
                            ? { ...state.currentSupplier, ...data }
                            : state.currentSupplier,
                }));

                try {
                    const result = await supplierService.update(storeId, supplierId, data);

                    if (result.error) {
                        // Revert optimistic update
                        set({
                            suppliers: previousSuppliers,
                            currentSupplier: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        // Update with actual server data
                        set((state) => ({
                            suppliers: state.suppliers.map((s) =>
                                s.id === supplierId ? result.data! : s
                            ),
                            currentSupplier:
                                state.currentSupplier?.id === supplierId
                                    ? { ...state.currentSupplier, ...result.data! }
                                    : state.currentSupplier,
                            error: null,
                            isSaving: false,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    // Revert optimistic update
                    set({
                        suppliers: previousSuppliers,
                        currentSupplier: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update supplier",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteSupplier: async (storeId: string, supplierId: string) => {
                set({ isSaving: true, error: null });

                // Store for rollback
                const previousSuppliers = get().suppliers;
                const previousTotal = get().totalSuppliers;

                // Optimistic removal
                set((state) => ({
                    suppliers: state.suppliers.filter((s) => s.id !== supplierId),
                    totalSuppliers: state.totalSuppliers - 1,
                    currentSupplier:
                        state.currentSupplier?.id === supplierId
                            ? null
                            : state.currentSupplier,
                }));

                try {
                    const result = await supplierService.delete(storeId, supplierId);

                    if (result.error) {
                        // Revert
                        set({
                            suppliers: previousSuppliers,
                            totalSuppliers: previousTotal,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    get().clearContactsCache(supplierId);
                    get().clearProductsCache(supplierId);
                    return true;
                } catch (err) {
                    set({
                        suppliers: previousSuppliers,
                        totalSuppliers: previousTotal,
                        error: err instanceof Error ? err.message : "Failed to delete supplier",
                        isSaving: false,
                    });
                    return false;
                }
            },

            activateSupplier: async (storeId: string, supplierId: string) => {
                return get().updateSupplier(storeId, supplierId, { is_active: true });
            },

            deactivateSupplier: async (storeId: string, supplierId: string) => {
                return get().updateSupplier(storeId, supplierId, { is_active: false });
            },

            togglePreferred: async (
                storeId: string,
                supplierId: string,
                isPreferred: boolean
            ) => {
                return get().updateSupplier(storeId, supplierId, { is_preferred: isPreferred });
            },

            blacklistSupplier: async (
                storeId: string,
                supplierId: string,
                request: BlacklistSupplierRequest
            ) => {
                set({ isSaving: true, error: null });

                const previousSuppliers = get().suppliers;
                const previousCurrent = get().currentSupplier;

                // Optimistic update
                set((state) => ({
                    suppliers: state.suppliers.map((s) =>
                        s.id === supplierId
                            ? { ...s, blacklisted: true, is_active: false, blacklist_reason: request.reason }
                            : s
                    ),
                    currentSupplier:
                        state.currentSupplier?.id === supplierId
                            ? {
                                ...state.currentSupplier,
                                blacklisted: true,
                                is_active: false,
                                blacklist_reason: request.reason,
                            }
                            : state.currentSupplier,
                }));

                try {
                    const result = await supplierService.blacklist(storeId, supplierId, request);

                    if (result.error) {
                        set({
                            suppliers: previousSuppliers,
                            currentSupplier: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            suppliers: state.suppliers.map((s) =>
                                s.id === supplierId ? result.data! : s
                            ),
                            currentSupplier:
                                state.currentSupplier?.id === supplierId
                                    ? { ...state.currentSupplier, ...result.data! }
                                    : state.currentSupplier,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        suppliers: previousSuppliers,
                        currentSupplier: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to blacklist supplier",
                        isSaving: false,
                    });
                    return false;
                }
            },

            unblacklistSupplier: async (storeId: string, supplierId: string) => {
                set({ isSaving: true, error: null });

                const previousSuppliers = get().suppliers;
                const previousCurrent = get().currentSupplier;

                // Optimistic update
                set((state) => ({
                    suppliers: state.suppliers.map((s) =>
                        s.id === supplierId
                            ? { ...s, blacklisted: false, blacklist_reason: null, is_active: true }
                            : s
                    ),
                    currentSupplier:
                        state.currentSupplier?.id === supplierId
                            ? {
                                ...state.currentSupplier,
                                blacklisted: false,
                                blacklist_reason: null,
                                is_active: true,
                            }
                            : state.currentSupplier,
                }));

                try {
                    const result = await supplierService.unblacklist(storeId, supplierId);

                    if (result.error) {
                        set({
                            suppliers: previousSuppliers,
                            currentSupplier: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            suppliers: state.suppliers.map((s) =>
                                s.id === supplierId ? result.data! : s
                            ),
                            currentSupplier:
                                state.currentSupplier?.id === supplierId
                                    ? { ...state.currentSupplier, ...result.data! }
                                    : state.currentSupplier,
                            error: null,
                            isSaving: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    set({
                        suppliers: previousSuppliers,
                        currentSupplier: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to remove from blacklist",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // CONTACT CRUD ACTIONS
            // ================================================================

            fetchContacts: async (supplierId: string, forceRefresh = false) => {
                const state = get();
                const cached = state.contactsCache.get(supplierId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await supplierService.getContacts(supplierId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const contacts = result.data ?? [];

                    // Update cache
                    const newCache = new Map(state.contactsCache);
                    newCache.set(supplierId, { data: contacts, fetchedAt: Date.now() });
                    set({ contactsCache: newCache });

                    // Also update currentSupplier if it matches
                    if (state.currentSupplier?.id === supplierId) {
                        set((s) => ({
                            currentSupplier: s.currentSupplier
                                ? { ...s.currentSupplier, contacts }
                                : null,
                        }));
                    }

                    return contacts;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch contacts",
                    });
                    return [];
                }
            },

            addContact: async (supplierId: string, data: CreateSupplierContactRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await supplierService.addContact(supplierId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Update contacts cache
                        const state = get();
                        const cached = state.contactsCache.get(supplierId);
                        if (cached) {
                            let updatedContacts = [...cached.data];

                            // If new contact is primary, unset others
                            if (result.data.is_primary) {
                                updatedContacts = updatedContacts.map((c) => ({
                                    ...c,
                                    is_primary: false,
                                }));
                            }

                            updatedContacts.unshift(result.data);
                            const newCache = new Map(state.contactsCache);
                            newCache.set(supplierId, {
                                data: updatedContacts,
                                fetchedAt: Date.now(),
                            });
                            set({ contactsCache: newCache });
                        }

                        // Update currentSupplier contacts
                        if (state.currentSupplier?.id === supplierId) {
                            set((s) => ({
                                currentSupplier: s.currentSupplier
                                    ? {
                                        ...s.currentSupplier,
                                        contacts: [
                                            result.data!,
                                            ...(data.is_primary
                                                ? s.currentSupplier.contacts.map((c) => ({
                                                    ...c,
                                                    is_primary: false,
                                                }))
                                                : s.currentSupplier.contacts),
                                        ],
                                    }
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
                        error: err instanceof Error ? err.message : "Failed to add contact",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateContact: async (
                supplierId: string,
                contactId: string,
                data: UpdateSupplierContactRequest
            ) => {
                set({ isSaving: true, error: null });

                const state = get();
                const previousCache = state.contactsCache.get(supplierId);

                // Optimistic update in cache
                if (previousCache) {
                    let updatedContacts = previousCache.data.map((c) =>
                        c.id === contactId ? { ...c, ...data } : c
                    );

                    // If setting as primary, unset others
                    if (data.is_primary) {
                        updatedContacts = updatedContacts.map((c) => ({
                            ...c,
                            is_primary: c.id === contactId,
                        }));
                    }

                    const newCache = new Map(state.contactsCache);
                    newCache.set(supplierId, {
                        data: updatedContacts,
                        fetchedAt: previousCache.fetchedAt,
                    });
                    set({ contactsCache: newCache });
                }

                try {
                    const result = await supplierService.updateContact(
                        supplierId,
                        contactId,
                        data
                    );

                    if (result.error) {
                        // Revert optimistic update
                        if (previousCache) {
                            const revertCache = new Map(get().contactsCache);
                            revertCache.set(supplierId, previousCache);
                            set({ contactsCache: revertCache });
                        }
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh contacts to get server truth
                    await get().fetchContacts(supplierId, true);
                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    if (previousCache) {
                        const revertCache = new Map(get().contactsCache);
                        revertCache.set(supplierId, previousCache);
                        set({ contactsCache: revertCache });
                    }
                    set({
                        error: err instanceof Error ? err.message : "Failed to update contact",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteContact: async (supplierId: string, contactId: string) => {
                set({ isSaving: true, error: null });

                const state = get();
                const previousCache = state.contactsCache.get(supplierId);

                // Optimistic removal
                if (previousCache) {
                    const updatedContacts = previousCache.data.filter(
                        (c) => c.id !== contactId
                    );
                    const newCache = new Map(state.contactsCache);
                    newCache.set(supplierId, {
                        data: updatedContacts,
                        fetchedAt: previousCache.fetchedAt,
                    });
                    set({ contactsCache: newCache });
                }

                // Optimistic update on currentSupplier
                if (state.currentSupplier?.id === supplierId) {
                    set((s) => ({
                        currentSupplier: s.currentSupplier
                            ? {
                                ...s.currentSupplier,
                                contacts: s.currentSupplier.contacts.filter(
                                    (c) => c.id !== contactId
                                ),
                            }
                            : null,
                    }));
                }

                try {
                    const result = await supplierService.deleteContact(supplierId, contactId);

                    if (result.error) {
                        // Revert
                        if (previousCache) {
                            const revertCache = new Map(get().contactsCache);
                            revertCache.set(supplierId, previousCache);
                            set({ contactsCache: revertCache });
                        }
                        // Re-fetch currentSupplier contacts on error
                        await get().fetchContacts(supplierId, true);
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    if (previousCache) {
                        const revertCache = new Map(get().contactsCache);
                        revertCache.set(supplierId, previousCache);
                        set({ contactsCache: revertCache });
                    }
                    await get().fetchContacts(supplierId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to delete contact",
                        isSaving: false,
                    });
                    return false;
                }
            },

            setPrimaryContact: async (supplierId: string, contactId: string) => {
                set({ isSaving: true, error: null });

                const state = get();
                const previousCache = state.contactsCache.get(supplierId);

                // Optimistic update
                if (previousCache) {
                    const updatedContacts = previousCache.data.map((c) => ({
                        ...c,
                        is_primary: c.id === contactId,
                    }));
                    const newCache = new Map(state.contactsCache);
                    newCache.set(supplierId, {
                        data: updatedContacts,
                        fetchedAt: previousCache.fetchedAt,
                    });
                    set({ contactsCache: newCache });
                }

                try {
                    const result = await supplierService.setPrimaryContact(
                        supplierId,
                        contactId
                    );

                    if (result.error) {
                        if (previousCache) {
                            const revertCache = new Map(get().contactsCache);
                            revertCache.set(supplierId, previousCache);
                            set({ contactsCache: revertCache });
                        }
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    await get().fetchContacts(supplierId, true);
                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    if (previousCache) {
                        const revertCache = new Map(get().contactsCache);
                        revertCache.set(supplierId, previousCache);
                        set({ contactsCache: revertCache });
                    }
                    set({
                        error: err instanceof Error ? err.message : "Failed to set primary contact",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // SUPPLIER PRODUCTS ACTIONS
            // ================================================================

            fetchSupplierProducts: async (
                storeId: string,
                supplierId: string,
                forceRefresh = false
            ) => {
                const state = get();
                const cached = state.productsCache.get(supplierId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) {
                        set({ supplierProducts: cached.data });
                        return cached.data;
                    }
                }

                try {
                    const result = await supplierService.getSupplierProducts(
                        storeId,
                        supplierId
                    );

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const products = result.data ?? [];

                    // Update cache
                    const newCache = new Map(state.productsCache);
                    newCache.set(supplierId, { data: products, fetchedAt: Date.now() });
                    set({
                        productsCache: newCache,
                        supplierProducts: products,
                    });

                    return products;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch supplier products",
                    });
                    return [];
                }
            },

            // ================================================================
            // UI STATE ACTIONS
            // ================================================================

            setFilters: (filters: Partial<SupplierFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 }, // Reset to first page
                    lastFetch: null, // Invalidate cache when filters change
                }));
            },

            setPagination: (pagination: Partial<SupplierPagination>) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                    lastFetch: null, // Invalidate cache when pagination changes
                }));
            },

            setSelectedSupplierIds: (ids: string[]) => {
                set({ selectedSupplierIds: ids });
            },

            toggleSupplierSelection: (supplierId: string) => {
                set((state) => ({
                    selectedSupplierIds: state.selectedSupplierIds.includes(supplierId)
                        ? state.selectedSupplierIds.filter((id) => id !== supplierId)
                        : [...state.selectedSupplierIds, supplierId],
                }));
            },

            clearSelection: () => {
                set({ selectedSupplierIds: [] });
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

            clearContactsCache: (supplierId?: string) => {
                set((state) => {
                    const newCache = new Map(state.contactsCache);
                    if (supplierId) {
                        newCache.delete(supplierId);
                    } else {
                        newCache.clear();
                    }
                    return { contactsCache: newCache };
                });
            },

            clearProductsCache: (supplierId?: string) => {
                set((state) => {
                    const newCache = new Map(state.productsCache);
                    if (supplierId) {
                        newCache.delete(supplierId);
                    } else {
                        newCache.clear();
                    }
                    return { productsCache: newCache };
                });
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                set({
                    ...initialState,
                    contactsCache: new Map(),
                    productsCache: new Map(),
                });
            },
        }),
        { name: "SupplierStore" }
    )
);
