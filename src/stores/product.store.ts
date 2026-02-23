import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { productService } from "@/services/product.service";
import type {
    Product,
    ProductVariant,
    ProductBarcode,
    Category,
    UnitOfMeasure,
    Inventory,
    InventoryTransaction,
    ProductBatch,
    SupplierProduct,
    PriceHistory,
    StockAlert,
    EnrichedProduct,
    EnrichedCategory,
    EnrichedInventory,
    EnrichedStockAlert,
    CreateProductRequest,
    UpdateProductRequest,
    CreateProductVariantRequest,
    UpdateProductVariantRequest,
    CreateProductBarcodeRequest,
    UpdateProductBarcodeRequest,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    CreateUnitRequest,
    UpdateUnitRequest,
    StockAdjustmentRequest,
    UpdateInventoryRequest,
    CreateProductBatchRequest,
    UpdateProductBatchRequest,
    CreateSupplierProductRequest,
    UpdateSupplierProductRequest,
    ResolveStockAlertRequest,
    ProductFilters,
    ProductPagination,
    ProductDashboardStats,
    InventorySummary,
    InventoryFilters,
    InventoryTransactionFilters,
    StockAlertFilters,
    CategoryFilters,
} from "@/types/product.types";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface ProductState {
    // Data - Products
    products: Product[];
    currentProduct: EnrichedProduct | null;
    totalProducts: number;
    totalPages: number;

    // Data - Categories & Units
    categories: Category[];
    units: UnitOfMeasure[];

    // Data - Inventory
    inventoryItems: EnrichedInventory[];
    inventorySummary: InventorySummary | null;

    // Data - Alerts & Dashboard
    stockAlerts: EnrichedStockAlert[];
    dashboardStats: ProductDashboardStats | null;

    // Pagination & Filters
    filters: ProductFilters;
    pagination: ProductPagination;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    error: string | null;
    selectedProductIds: string[];

    // Cache
    lastFetch: number | null;
    cacheTimeout: number;
    variantsCache: Map<string, { data: ProductVariant[]; fetchedAt: number }>;
    barcodesCache: Map<string, { data: ProductBarcode[]; fetchedAt: number }>;
    batchesCache: Map<string, { data: ProductBatch[]; fetchedAt: number }>;
    transactionsCache: Map<string, { data: InventoryTransaction[]; fetchedAt: number }>;
    priceHistoryCache: Map<string, { data: PriceHistory[]; fetchedAt: number }>;
    supplierProductsCache: Map<string, { data: SupplierProduct[]; fetchedAt: number }>;

    // Actions - Fetching Products
    fetchProducts: (storeId: string, forceRefresh?: boolean) => Promise<void>;
    fetchProductById: (storeId: string, productId: string) => Promise<void>;
    fetchDashboardStats: (storeId: string) => Promise<void>;

    // Actions - Product CRUD
    createProduct: (storeId: string, data: CreateProductRequest) => Promise<Product | null>;
    updateProduct: (storeId: string, productId: string, data: UpdateProductRequest) => Promise<boolean>;
    deleteProduct: (storeId: string, productId: string) => Promise<boolean>;
    toggleProductActive: (storeId: string, productId: string, isActive: boolean) => Promise<boolean>;
    lookupByBarcode: (storeId: string, barcode: string) => Promise<Product | null>;

    // Actions - Variants
    fetchVariants: (productId: string, forceRefresh?: boolean) => Promise<ProductVariant[]>;
    createVariant: (storeId: string, data: CreateProductVariantRequest) => Promise<ProductVariant | null>;
    updateVariant: (storeId: string, variantId: string, data: UpdateProductVariantRequest, productId: string) => Promise<boolean>;
    deleteVariant: (storeId: string, variantId: string, productId: string) => Promise<boolean>;

    // Actions - Barcodes
    fetchBarcodes: (productId: string, forceRefresh?: boolean) => Promise<ProductBarcode[]>;
    createBarcode: (storeId: string, data: CreateProductBarcodeRequest) => Promise<ProductBarcode | null>;
    updateBarcode: (storeId: string, barcodeId: string, data: UpdateProductBarcodeRequest, productId: string) => Promise<boolean>;
    deleteBarcode: (storeId: string, barcodeId: string, productId: string) => Promise<boolean>;

    // Actions - Categories
    fetchCategories: (storeId: string, filters?: CategoryFilters) => Promise<void>;
    createCategory: (storeId: string, data: CreateCategoryRequest) => Promise<Category | null>;
    updateCategory: (storeId: string, categoryId: string, data: UpdateCategoryRequest) => Promise<boolean>;
    deleteCategory: (storeId: string, categoryId: string) => Promise<boolean>;

    // Actions - Units
    fetchUnits: (storeId: string) => Promise<void>;
    createUnit: (storeId: string, data: CreateUnitRequest) => Promise<UnitOfMeasure | null>;
    updateUnit: (storeId: string, unitId: string, data: UpdateUnitRequest) => Promise<boolean>;
    deleteUnit: (storeId: string, unitId: string) => Promise<boolean>;

    // Actions - Inventory
    fetchInventory: (storeId: string, filters?: InventoryFilters) => Promise<void>;
    fetchInventorySummary: (storeId: string) => Promise<void>;
    updateInventory: (storeId: string, inventoryId: string, data: UpdateInventoryRequest) => Promise<boolean>;
    createStockAdjustment: (storeId: string, data: StockAdjustmentRequest) => Promise<boolean>;

    // Actions - Transactions
    fetchTransactions: (storeId: string, filters?: InventoryTransactionFilters, cacheKey?: string, forceRefresh?: boolean) => Promise<InventoryTransaction[]>;

    // Actions - Batches
    fetchBatches: (storeId: string, productId?: string, forceRefresh?: boolean) => Promise<ProductBatch[]>;
    createBatch: (storeId: string, data: CreateProductBatchRequest) => Promise<ProductBatch | null>;
    updateBatch: (storeId: string, batchId: string, data: UpdateProductBatchRequest, productId: string) => Promise<boolean>;
    deleteBatch: (storeId: string, batchId: string, productId: string) => Promise<boolean>;

    // Actions - Supplier Products
    fetchSupplierProducts: (storeId: string, productId?: string, supplierId?: string, forceRefresh?: boolean) => Promise<SupplierProduct[]>;
    createSupplierProduct: (storeId: string, data: CreateSupplierProductRequest) => Promise<SupplierProduct | null>;
    updateSupplierProduct: (storeId: string, spId: string, data: UpdateSupplierProductRequest, cacheKey: string) => Promise<boolean>;
    deleteSupplierProduct: (storeId: string, spId: string, cacheKey: string) => Promise<boolean>;

    // Actions - Price History
    fetchPriceHistory: (storeId: string, productId: string, variantId?: string, forceRefresh?: boolean) => Promise<PriceHistory[]>;

    // Actions - Stock Alerts
    fetchStockAlerts: (storeId: string, filters?: StockAlertFilters) => Promise<void>;
    resolveStockAlert: (storeId: string, alertId: string, data?: ResolveStockAlertRequest) => Promise<boolean>;

    // Actions - UI State
    setFilters: (filters: Partial<ProductFilters>) => void;
    setPagination: (pagination: Partial<ProductPagination>) => void;
    setSelectedProductIds: (ids: string[]) => void;
    toggleProductSelection: (productId: string) => void;
    clearSelection: () => void;
    setError: (error: string | null) => void;

    // Actions - Cache
    invalidateCache: () => void;
    clearVariantsCache: (productId?: string) => void;
    clearBarcodesCache: (productId?: string) => void;
    clearBatchesCache: (key?: string) => void;
    clearTransactionsCache: (key?: string) => void;

    // Actions - Storage
    uploadProductImage: (storeId: string, productId: string, file: File) => Promise<string | null>;
    deleteProductImage: (publicUrl: string) => Promise<boolean>;

    // Actions - Reset
    reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
    products: [] as Product[],
    currentProduct: null as EnrichedProduct | null,
    totalProducts: 0,
    totalPages: 0,
    categories: [] as Category[],
    units: [] as UnitOfMeasure[],
    inventoryItems: [] as EnrichedInventory[],
    inventorySummary: null as InventorySummary | null,
    stockAlerts: [] as EnrichedStockAlert[],
    dashboardStats: null as ProductDashboardStats | null,
    filters: {} as ProductFilters,
    pagination: {
        page: 1,
        limit: 10,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
    } as ProductPagination,
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null as string | null,
    selectedProductIds: [] as string[],
    lastFetch: null as number | null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    variantsCache: new Map() as Map<string, { data: ProductVariant[]; fetchedAt: number }>,
    barcodesCache: new Map() as Map<string, { data: ProductBarcode[]; fetchedAt: number }>,
    batchesCache: new Map() as Map<string, { data: ProductBatch[]; fetchedAt: number }>,
    transactionsCache: new Map() as Map<string, { data: InventoryTransaction[]; fetchedAt: number }>,
    priceHistoryCache: new Map() as Map<string, { data: PriceHistory[]; fetchedAt: number }>,
    supplierProductsCache: new Map() as Map<string, { data: SupplierProduct[]; fetchedAt: number }>,
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useProductStore = create<ProductState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // ================================================================
            // FETCHING ACTIONS
            // ================================================================

            fetchProducts: async (storeId: string, forceRefresh = false) => {
                const state = get();

                // Check cache
                if (!forceRefresh && state.lastFetch) {
                    const elapsed = Date.now() - state.lastFetch;
                    if (elapsed < state.cacheTimeout) return;
                }

                set({
                    isLoading: !state.products.length,
                    isRefreshing: !!state.products.length,
                });

                try {
                    const result = await productService.getProductList(
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
                            products: result.data.products,
                            totalProducts: result.data.total,
                            totalPages: result.data.total_pages,
                            lastFetch: Date.now(),
                            error: null,
                            isLoading: false,
                            isRefreshing: false,
                        });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch products",
                        isLoading: false,
                        isRefreshing: false,
                    });
                }
            },

            fetchProductById: async (storeId: string, productId: string) => {
                set({ isLoading: true });

                try {
                    const result = await productService.getProductById(storeId, productId);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    if (result.data) {
                        set({ currentProduct: result.data, error: null, isLoading: false });
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch product",
                        isLoading: false,
                    });
                }
            },

            fetchDashboardStats: async (storeId: string) => {
                try {
                    const result = await productService.getDashboardStats(storeId);

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

            // ================================================================
            // PRODUCT CRUD ACTIONS
            // ================================================================

            createProduct: async (storeId: string, data: CreateProductRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createProduct(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Optimistically add to list
                        set((state) => ({
                            products: [result.data!, ...state.products],
                            totalProducts: state.totalProducts + 1,
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
                        error: err instanceof Error ? err.message : "Failed to create product",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateProduct: async (storeId: string, productId: string, data: UpdateProductRequest) => {
                set({ isSaving: true, error: null });

                const previousProducts = get().products;
                const previousCurrent = get().currentProduct;

                // Optimistic update
                set((state) => ({
                    products: state.products.map((p) =>
                        p.id === productId ? { ...p, ...data } : p
                    ),
                    currentProduct:
                        state.currentProduct?.id === productId
                            ? { ...state.currentProduct, ...data }
                            : state.currentProduct,
                }));

                try {
                    const result = await productService.updateProduct(storeId, productId, data);

                    if (result.error) {
                        set({
                            products: previousProducts,
                            currentProduct: previousCurrent,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            products: state.products.map((p) =>
                                p.id === productId ? result.data! : p
                            ),
                            currentProduct:
                                state.currentProduct?.id === productId
                                    ? { ...state.currentProduct, ...result.data! }
                                    : state.currentProduct,
                            error: null,
                            isSaving: false,
                        }));
                        return true;
                    }

                    set({ isSaving: false });
                    return false;
                } catch (err) {
                    set({
                        products: previousProducts,
                        currentProduct: previousCurrent,
                        error: err instanceof Error ? err.message : "Failed to update product",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteProduct: async (storeId: string, productId: string) => {
                set({ isSaving: true, error: null });

                const previousProducts = get().products;
                const previousTotal = get().totalProducts;

                // Optimistic removal
                set((state) => ({
                    products: state.products.filter((p) => p.id !== productId),
                    totalProducts: state.totalProducts - 1,
                    currentProduct:
                        state.currentProduct?.id === productId ? null : state.currentProduct,
                }));

                try {
                    const result = await productService.deleteProduct(storeId, productId);

                    if (result.error) {
                        set({
                            products: previousProducts,
                            totalProducts: previousTotal,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    get().clearVariantsCache(productId);
                    get().clearBarcodesCache(productId);
                    get().clearBatchesCache(productId);
                    return true;
                } catch (err) {
                    set({
                        products: previousProducts,
                        totalProducts: previousTotal,
                        error: err instanceof Error ? err.message : "Failed to delete product",
                        isSaving: false,
                    });
                    return false;
                }
            },

            toggleProductActive: async (storeId: string, productId: string, isActive: boolean) => {
                set({ isSaving: true, error: null });

                const previousProducts = get().products;

                // Optimistic toggle
                set((state) => ({
                    products: state.products.map((p) =>
                        p.id === productId ? { ...p, is_active: isActive } : p
                    ),
                }));

                try {
                    const result = await productService.toggleProductActive(storeId, productId, isActive);

                    if (result.error) {
                        set({
                            products: previousProducts,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        products: previousProducts,
                        error: err instanceof Error ? err.message : "Failed to toggle product status",
                        isSaving: false,
                    });
                    return false;
                }
            },

            lookupByBarcode: async (storeId: string, barcode: string) => {
                try {
                    const result = await productService.lookupByBarcode(storeId, barcode);
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
            // VARIANT ACTIONS
            // ================================================================

            fetchVariants: async (productId: string, forceRefresh = false) => {
                const state = get();
                const cached = state.variantsCache.get(productId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await productService.getVariants(productId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const variants = result.data ?? [];
                    const newCache = new Map(state.variantsCache);
                    newCache.set(productId, { data: variants, fetchedAt: Date.now() });
                    set({ variantsCache: newCache });

                    // Update currentProduct variants if matching
                    if (state.currentProduct?.id === productId) {
                        set((s) => ({
                            currentProduct: s.currentProduct
                                ? { ...s.currentProduct, variants }
                                : null,
                        }));
                    }

                    return variants;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to fetch variants" });
                    return [];
                }
            },

            createVariant: async (storeId: string, data: CreateProductVariantRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createVariant(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        const state = get();
                        const cached = state.variantsCache.get(data.product_id);
                        if (cached) {
                            const updated = [...cached.data, result.data];
                            const newCache = new Map(state.variantsCache);
                            newCache.set(data.product_id, { data: updated, fetchedAt: Date.now() });
                            set({ variantsCache: newCache });
                        }

                        if (state.currentProduct?.id === data.product_id) {
                            set((s) => ({
                                currentProduct: s.currentProduct
                                    ? { ...s.currentProduct, variants: [...s.currentProduct.variants, result.data!] }
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
                        error: err instanceof Error ? err.message : "Failed to create variant",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateVariant: async (storeId: string, variantId: string, data: UpdateProductVariantRequest, productId: string) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.updateVariant(storeId, variantId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        const state = get();
                        const cached = state.variantsCache.get(productId);
                        if (cached) {
                            const updated = cached.data.map((v) => (v.id === variantId ? result.data! : v));
                            const newCache = new Map(state.variantsCache);
                            newCache.set(productId, { data: updated, fetchedAt: Date.now() });
                            set({ variantsCache: newCache });
                        }

                        if (state.currentProduct?.id === productId) {
                            set((s) => ({
                                currentProduct: s.currentProduct
                                    ? {
                                        ...s.currentProduct,
                                        variants: s.currentProduct.variants.map((v) =>
                                            v.id === variantId ? result.data! : v
                                        ),
                                    }
                                    : null,
                            }));
                        }
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update variant",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteVariant: async (storeId: string, variantId: string, productId: string) => {
                set({ isSaving: true, error: null });

                const state = get();
                const previousCache = state.variantsCache.get(productId);

                // Optimistic removal
                if (previousCache) {
                    const updated = previousCache.data.filter((v) => v.id !== variantId);
                    const newCache = new Map(state.variantsCache);
                    newCache.set(productId, { data: updated, fetchedAt: previousCache.fetchedAt });
                    set({ variantsCache: newCache });
                }

                if (state.currentProduct?.id === productId) {
                    set((s) => ({
                        currentProduct: s.currentProduct
                            ? {
                                ...s.currentProduct,
                                variants: s.currentProduct.variants.filter((v) => v.id !== variantId),
                            }
                            : null,
                    }));
                }

                try {
                    const result = await productService.deleteVariant(storeId, variantId);

                    if (result.error) {
                        if (previousCache) {
                            const revert = new Map(get().variantsCache);
                            revert.set(productId, previousCache);
                            set({ variantsCache: revert });
                        }
                        await get().fetchVariants(productId, true);
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    if (previousCache) {
                        const revert = new Map(get().variantsCache);
                        revert.set(productId, previousCache);
                        set({ variantsCache: revert });
                    }
                    await get().fetchVariants(productId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to delete variant",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // BARCODE ACTIONS
            // ================================================================

            fetchBarcodes: async (productId: string, forceRefresh = false) => {
                const state = get();
                const cached = state.barcodesCache.get(productId);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await productService.getBarcodes(productId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const barcodes = result.data ?? [];
                    const newCache = new Map(state.barcodesCache);
                    newCache.set(productId, { data: barcodes, fetchedAt: Date.now() });
                    set({ barcodesCache: newCache });

                    if (state.currentProduct?.id === productId) {
                        set((s) => ({
                            currentProduct: s.currentProduct
                                ? { ...s.currentProduct, barcodes }
                                : null,
                        }));
                    }

                    return barcodes;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to fetch barcodes" });
                    return [];
                }
            },

            createBarcode: async (storeId: string, data: CreateProductBarcodeRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createBarcode(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        const state = get();
                        const cached = state.barcodesCache.get(data.product_id);
                        if (cached) {
                            const updated = [...cached.data, result.data];
                            const newCache = new Map(state.barcodesCache);
                            newCache.set(data.product_id, { data: updated, fetchedAt: Date.now() });
                            set({ barcodesCache: newCache });
                        }

                        if (state.currentProduct?.id === data.product_id) {
                            set((s) => ({
                                currentProduct: s.currentProduct
                                    ? { ...s.currentProduct, barcodes: [...s.currentProduct.barcodes, result.data!] }
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
                        error: err instanceof Error ? err.message : "Failed to create barcode",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateBarcode: async (storeId: string, barcodeId: string, data: UpdateProductBarcodeRequest, productId: string) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.updateBarcode(storeId, barcodeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        const state = get();
                        const cached = state.barcodesCache.get(productId);
                        if (cached) {
                            const updated = cached.data.map((b) => (b.id === barcodeId ? result.data! : b));
                            const newCache = new Map(state.barcodesCache);
                            newCache.set(productId, { data: updated, fetchedAt: Date.now() });
                            set({ barcodesCache: newCache });
                        }

                        if (state.currentProduct?.id === productId) {
                            set((s) => ({
                                currentProduct: s.currentProduct
                                    ? {
                                        ...s.currentProduct,
                                        barcodes: s.currentProduct.barcodes.map((b) =>
                                            b.id === barcodeId ? result.data! : b
                                        ),
                                    }
                                    : null,
                            }));
                        }
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update barcode",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteBarcode: async (storeId: string, barcodeId: string, productId: string) => {
                set({ isSaving: true, error: null });

                const state = get();
                const previousCache = state.barcodesCache.get(productId);

                // Optimistic removal
                if (previousCache) {
                    const updated = previousCache.data.filter((b) => b.id !== barcodeId);
                    const newCache = new Map(state.barcodesCache);
                    newCache.set(productId, { data: updated, fetchedAt: previousCache.fetchedAt });
                    set({ barcodesCache: newCache });
                }

                if (state.currentProduct?.id === productId) {
                    set((s) => ({
                        currentProduct: s.currentProduct
                            ? {
                                ...s.currentProduct,
                                barcodes: s.currentProduct.barcodes.filter((b) => b.id !== barcodeId),
                            }
                            : null,
                    }));
                }

                try {
                    const result = await productService.deleteBarcode(storeId, barcodeId);

                    if (result.error) {
                        if (previousCache) {
                            const revert = new Map(get().barcodesCache);
                            revert.set(productId, previousCache);
                            set({ barcodesCache: revert });
                        }
                        await get().fetchBarcodes(productId, true);
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    if (previousCache) {
                        const revert = new Map(get().barcodesCache);
                        revert.set(productId, previousCache);
                        set({ barcodesCache: revert });
                    }
                    await get().fetchBarcodes(productId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to delete barcode",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // CATEGORY ACTIONS
            // ================================================================

            fetchCategories: async (storeId: string, filters?: CategoryFilters) => {
                set({ isLoading: true });

                try {
                    const result = await productService.getCategories(storeId, filters);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    set({ categories: result.data ?? [], error: null, isLoading: false });
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch categories",
                        isLoading: false,
                    });
                }
            },

            createCategory: async (storeId: string, data: CreateCategoryRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createCategory(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        set((state) => ({
                            categories: [...state.categories, result.data!],
                            error: null,
                            isSaving: false,
                        }));
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create category",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateCategory: async (storeId: string, categoryId: string, data: UpdateCategoryRequest) => {
                set({ isSaving: true, error: null });

                const previousCategories = get().categories;

                // Optimistic update
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === categoryId ? { ...c, ...data } : c
                    ),
                }));

                try {
                    const result = await productService.updateCategory(storeId, categoryId, data);

                    if (result.error) {
                        set({
                            categories: previousCategories,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            categories: state.categories.map((c) =>
                                c.id === categoryId ? result.data! : c
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
                        categories: previousCategories,
                        error: err instanceof Error ? err.message : "Failed to update category",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteCategory: async (storeId: string, categoryId: string) => {
                set({ isSaving: true, error: null });

                const previousCategories = get().categories;

                // Optimistic removal
                set((state) => ({
                    categories: state.categories.filter((c) => c.id !== categoryId),
                }));

                try {
                    const result = await productService.deleteCategory(storeId, categoryId);

                    if (result.error) {
                        set({
                            categories: previousCategories,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        categories: previousCategories,
                        error: err instanceof Error ? err.message : "Failed to delete category",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // UNIT ACTIONS
            // ================================================================

            fetchUnits: async (storeId: string) => {
                try {
                    const result = await productService.getUnits(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    set({ units: result.data ?? [], error: null });
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch units",
                    });
                }
            },

            createUnit: async (storeId: string, data: CreateUnitRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createUnit(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        set((state) => ({
                            units: [...state.units, result.data!],
                            error: null,
                            isSaving: false,
                        }));
                        return result.data;
                    }

                    set({ isSaving: false });
                    return null;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create unit",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateUnit: async (storeId: string, unitId: string, data: UpdateUnitRequest) => {
                set({ isSaving: true, error: null });

                const previousUnits = get().units;

                set((state) => ({
                    units: state.units.map((u) =>
                        u.id === unitId ? { ...u, ...data } : u
                    ),
                }));

                try {
                    const result = await productService.updateUnit(storeId, unitId, data);

                    if (result.error) {
                        set({ units: previousUnits, error: result.error, isSaving: false });
                        return false;
                    }

                    if (result.data) {
                        set((state) => ({
                            units: state.units.map((u) =>
                                u.id === unitId ? result.data! : u
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
                        units: previousUnits,
                        error: err instanceof Error ? err.message : "Failed to update unit",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteUnit: async (storeId: string, unitId: string) => {
                set({ isSaving: true, error: null });

                const previousUnits = get().units;

                set((state) => ({
                    units: state.units.filter((u) => u.id !== unitId),
                }));

                try {
                    const result = await productService.deleteUnit(storeId, unitId);

                    if (result.error) {
                        set({ units: previousUnits, error: result.error, isSaving: false });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        units: previousUnits,
                        error: err instanceof Error ? err.message : "Failed to delete unit",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // INVENTORY ACTIONS
            // ================================================================

            fetchInventory: async (storeId: string, filters?: InventoryFilters) => {
                set({ isLoading: true });

                try {
                    const result = await productService.getInventory(storeId, filters);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    set({ inventoryItems: result.data ?? [], error: null, isLoading: false });
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch inventory",
                        isLoading: false,
                    });
                }
            },

            fetchInventorySummary: async (storeId: string) => {
                try {
                    const result = await productService.getInventorySummary(storeId);

                    if (result.error) {
                        set({ error: result.error });
                        return;
                    }

                    set({ inventorySummary: result.data, error: null });
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch inventory summary",
                    });
                }
            },

            updateInventory: async (storeId: string, inventoryId: string, data: UpdateInventoryRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.updateInventory(storeId, inventoryId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh inventory list
                    await get().fetchInventory(storeId);
                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update inventory",
                        isSaving: false,
                    });
                    return false;
                }
            },

            createStockAdjustment: async (storeId: string, data: StockAdjustmentRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createStockAdjustment(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Refresh inventory and current product
                    await get().fetchInventory(storeId);

                    const currentProduct = get().currentProduct;
                    if (currentProduct?.id === data.product_id) {
                        await get().fetchProductById(storeId, data.product_id);
                    }

                    get().invalidateCache();
                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to create stock adjustment",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // TRANSACTION ACTIONS
            // ================================================================

            fetchTransactions: async (
                storeId: string,
                filters?: InventoryTransactionFilters,
                cacheKey?: string,
                forceRefresh = false
            ) => {
                const state = get();
                const key = cacheKey ?? JSON.stringify(filters ?? {});
                const cached = state.transactionsCache.get(key);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await productService.getTransactions(storeId, filters);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const transactions = result.data ?? [];
                    const newCache = new Map(state.transactionsCache);
                    newCache.set(key, { data: transactions, fetchedAt: Date.now() });
                    set({ transactionsCache: newCache });

                    return transactions;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to fetch transactions" });
                    return [];
                }
            },

            // ================================================================
            // BATCH ACTIONS
            // ================================================================

            fetchBatches: async (storeId: string, productId?: string, forceRefresh = false) => {
                const state = get();
                const key = productId ?? "__all__";
                const cached = state.batchesCache.get(key);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await productService.getBatches(storeId, productId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const batches = result.data ?? [];
                    const newCache = new Map(state.batchesCache);
                    newCache.set(key, { data: batches, fetchedAt: Date.now() });
                    set({ batchesCache: newCache });

                    if (productId && state.currentProduct?.id === productId) {
                        set((s) => ({
                            currentProduct: s.currentProduct
                                ? { ...s.currentProduct, batches }
                                : null,
                        }));
                    }

                    return batches;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to fetch batches" });
                    return [];
                }
            },

            createBatch: async (storeId: string, data: CreateProductBatchRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createBatch(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        get().clearBatchesCache(data.product_id);
                        get().clearBatchesCache("__all__");

                        if (get().currentProduct?.id === data.product_id) {
                            set((s) => ({
                                currentProduct: s.currentProduct
                                    ? { ...s.currentProduct, batches: [...s.currentProduct.batches, result.data!] }
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
                        error: err instanceof Error ? err.message : "Failed to create batch",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateBatch: async (storeId: string, batchId: string, data: UpdateProductBatchRequest, productId: string) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.updateBatch(storeId, batchId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    get().clearBatchesCache(productId);
                    get().clearBatchesCache("__all__");

                    if (result.data && get().currentProduct?.id === productId) {
                        set((s) => ({
                            currentProduct: s.currentProduct
                                ? {
                                    ...s.currentProduct,
                                    batches: s.currentProduct.batches.map((b) =>
                                        b.id === batchId ? result.data! : b
                                    ),
                                }
                                : null,
                        }));
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update batch",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteBatch: async (storeId: string, batchId: string, productId: string) => {
                set({ isSaving: true, error: null });

                // Optimistic removal
                if (get().currentProduct?.id === productId) {
                    set((s) => ({
                        currentProduct: s.currentProduct
                            ? {
                                ...s.currentProduct,
                                batches: s.currentProduct.batches.filter((b) => b.id !== batchId),
                            }
                            : null,
                    }));
                }

                try {
                    const result = await productService.deleteBatch(storeId, batchId);

                    if (result.error) {
                        // Re-fetch to restore
                        await get().fetchBatches(storeId, productId, true);
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    get().clearBatchesCache(productId);
                    get().clearBatchesCache("__all__");
                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    await get().fetchBatches(storeId, productId, true);
                    set({
                        error: err instanceof Error ? err.message : "Failed to delete batch",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // SUPPLIER PRODUCT ACTIONS
            // ================================================================

            fetchSupplierProducts: async (storeId: string, productId?: string, supplierId?: string, forceRefresh = false) => {
                const state = get();
                const key = `${productId ?? ""}_${supplierId ?? ""}`;
                const cached = state.supplierProductsCache.get(key);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await productService.getSupplierProducts(storeId, productId, supplierId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const items = result.data ?? [];
                    const newCache = new Map(state.supplierProductsCache);
                    newCache.set(key, { data: items, fetchedAt: Date.now() });
                    set({ supplierProductsCache: newCache });

                    if (productId && state.currentProduct?.id === productId) {
                        set((s) => ({
                            currentProduct: s.currentProduct
                                ? { ...s.currentProduct, supplier_products: items }
                                : null,
                        }));
                    }

                    return items;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to fetch supplier products" });
                    return [];
                }
            },

            createSupplierProduct: async (storeId: string, data: CreateSupplierProductRequest) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.createSupplierProduct(storeId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return null;
                    }

                    if (result.data) {
                        // Invalidate related caches
                        const state = get();
                        const newCache = new Map(state.supplierProductsCache);
                        // Clear any cache that involves this product or supplier
                        for (const [key] of newCache) {
                            if (key.includes(data.product_id) || key.includes(data.supplier_id)) {
                                newCache.delete(key);
                            }
                        }
                        set({ supplierProductsCache: newCache });

                        if (state.currentProduct?.id === data.product_id) {
                            set((s) => ({
                                currentProduct: s.currentProduct
                                    ? {
                                        ...s.currentProduct,
                                        supplier_products: [...s.currentProduct.supplier_products, result.data!],
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
                        error: err instanceof Error ? err.message : "Failed to create supplier product",
                        isSaving: false,
                    });
                    return null;
                }
            },

            updateSupplierProduct: async (storeId: string, spId: string, data: UpdateSupplierProductRequest, cacheKey: string) => {
                set({ isSaving: true, error: null });

                try {
                    const result = await productService.updateSupplierProduct(storeId, spId, data);

                    if (result.error) {
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    // Invalidate cache
                    const newCache = new Map(get().supplierProductsCache);
                    newCache.delete(cacheKey);
                    set({ supplierProductsCache: newCache });

                    // Update currentProduct if needed
                    if (result.data) {
                        set((s) => ({
                            currentProduct: s.currentProduct
                                ? {
                                    ...s.currentProduct,
                                    supplier_products: s.currentProduct.supplier_products.map((sp) =>
                                        sp.id === spId ? result.data! : sp
                                    ),
                                }
                                : null,
                        }));
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to update supplier product",
                        isSaving: false,
                    });
                    return false;
                }
            },

            deleteSupplierProduct: async (storeId: string, spId: string, cacheKey: string) => {
                set({ isSaving: true, error: null });

                // Optimistic removal
                set((s) => ({
                    currentProduct: s.currentProduct
                        ? {
                            ...s.currentProduct,
                            supplier_products: s.currentProduct.supplier_products.filter((sp) => sp.id !== spId),
                        }
                        : null,
                }));

                try {
                    const result = await productService.deleteSupplierProduct(storeId, spId);

                    if (result.error) {
                        // Re-fetch current product
                        const cp = get().currentProduct;
                        if (cp) {
                            await get().fetchProductById(storeId, cp.id);
                        }
                        set({ error: result.error, isSaving: false });
                        return false;
                    }

                    const newCache = new Map(get().supplierProductsCache);
                    newCache.delete(cacheKey);
                    set({ supplierProductsCache: newCache, error: null, isSaving: false });
                    return true;
                } catch (err) {
                    const cp = get().currentProduct;
                    if (cp) {
                        await get().fetchProductById(storeId, cp.id);
                    }
                    set({
                        error: err instanceof Error ? err.message : "Failed to delete supplier product",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // PRICE HISTORY ACTIONS
            // ================================================================

            fetchPriceHistory: async (storeId: string, productId: string, variantId?: string, forceRefresh = false) => {
                const state = get();
                const key = `${productId}_${variantId ?? ""}`;
                const cached = state.priceHistoryCache.get(key);

                if (!forceRefresh && cached) {
                    const elapsed = Date.now() - cached.fetchedAt;
                    if (elapsed < state.cacheTimeout) return cached.data;
                }

                try {
                    const result = await productService.getPriceHistory(storeId, productId, variantId);

                    if (result.error) {
                        set({ error: result.error });
                        return [];
                    }

                    const history = result.data ?? [];
                    const newCache = new Map(state.priceHistoryCache);
                    newCache.set(key, { data: history, fetchedAt: Date.now() });
                    set({ priceHistoryCache: newCache });

                    return history;
                } catch (err) {
                    set({ error: err instanceof Error ? err.message : "Failed to fetch price history" });
                    return [];
                }
            },

            // ================================================================
            // STOCK ALERT ACTIONS
            // ================================================================

            fetchStockAlerts: async (storeId: string, filters?: StockAlertFilters) => {
                set({ isLoading: true });

                try {
                    const result = await productService.getStockAlerts(storeId, filters);

                    if (result.error) {
                        set({ error: result.error, isLoading: false });
                        return;
                    }

                    set({ stockAlerts: result.data ?? [], error: null, isLoading: false });
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : "Failed to fetch stock alerts",
                        isLoading: false,
                    });
                }
            },

            resolveStockAlert: async (storeId: string, alertId: string, data?: ResolveStockAlertRequest) => {
                set({ isSaving: true, error: null });

                const previousAlerts = get().stockAlerts;

                // Optimistic resolution
                set((state) => ({
                    stockAlerts: state.stockAlerts.map((a) =>
                        a.id === alertId ? { ...a, is_resolved: true } : a
                    ),
                }));

                try {
                    const result = await productService.resolveStockAlert(storeId, alertId, data);

                    if (result.error) {
                        set({
                            stockAlerts: previousAlerts,
                            error: result.error,
                            isSaving: false,
                        });
                        return false;
                    }

                    set({ error: null, isSaving: false });
                    return true;
                } catch (err) {
                    set({
                        stockAlerts: previousAlerts,
                        error: err instanceof Error ? err.message : "Failed to resolve alert",
                        isSaving: false,
                    });
                    return false;
                }
            },

            // ================================================================
            // UI STATE ACTIONS
            // ================================================================

            setFilters: (filters: Partial<ProductFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                    pagination: { ...state.pagination, page: 1 },
                    lastFetch: null,
                }));
            },

            setPagination: (pagination: Partial<ProductPagination>) => {
                set((state) => ({
                    pagination: { ...state.pagination, ...pagination },
                    lastFetch: null,
                }));
            },

            setSelectedProductIds: (ids: string[]) => {
                set({ selectedProductIds: ids });
            },

            toggleProductSelection: (productId: string) => {
                set((state) => ({
                    selectedProductIds: state.selectedProductIds.includes(productId)
                        ? state.selectedProductIds.filter((id) => id !== productId)
                        : [...state.selectedProductIds, productId],
                }));
            },

            clearSelection: () => {
                set({ selectedProductIds: [] });
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

            clearVariantsCache: (productId?: string) => {
                set((state) => {
                    const newCache = new Map(state.variantsCache);
                    if (productId) {
                        newCache.delete(productId);
                    } else {
                        newCache.clear();
                    }
                    return { variantsCache: newCache };
                });
            },

            clearBarcodesCache: (productId?: string) => {
                set((state) => {
                    const newCache = new Map(state.barcodesCache);
                    if (productId) {
                        newCache.delete(productId);
                    } else {
                        newCache.clear();
                    }
                    return { barcodesCache: newCache };
                });
            },

            clearBatchesCache: (key?: string) => {
                set((state) => {
                    const newCache = new Map(state.batchesCache);
                    if (key) {
                        newCache.delete(key);
                    } else {
                        newCache.clear();
                    }
                    return { batchesCache: newCache };
                });
            },

            clearTransactionsCache: (key?: string) => {
                set((state) => {
                    const newCache = new Map(state.transactionsCache);
                    if (key) {
                        newCache.delete(key);
                    } else {
                        newCache.clear();
                    }
                    return { transactionsCache: newCache };
                });
            },

            // ================================================================
            // STORAGE ACTIONS
            // ================================================================

            uploadProductImage: async (storeId: string, productId: string, file: File) => {
                const result = await productService.uploadProductImage(storeId, productId, file);
                if (result.error) return null;
                return result.data;
            },

            deleteProductImage: async (publicUrl: string) => {
                const result = await productService.deleteProductImage(publicUrl);
                return !result.error;
            },

            // ================================================================
            // RESET
            // ================================================================

            reset: () => {
                set({
                    ...initialState,
                    variantsCache: new Map(),
                    barcodesCache: new Map(),
                    batchesCache: new Map(),
                    transactionsCache: new Map(),
                    priceHistoryCache: new Map(),
                    supplierProductsCache: new Map(),
                });
            },
        }),
        { name: "ProductStore" }
    )
);
