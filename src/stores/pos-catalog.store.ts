// ============================================================================
// POS CATALOG STORE — In-memory sellable items with IndexedDB persistence
// Load once → scan instant → commit once → update memory
// ============================================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SellableItem, PosDataStatus, PosCacheMeta } from "@/types/pos.types";
import type { PosIndexes } from "@/services/pos-data.service";
import {
    fetchAllSellableItems,
    buildIndexes,
    searchItems,
    deductStock,
    restoreStock,
    barcodeFallbackLookup,
} from "@/services/pos-data.service";
import {
    getCacheMeta,
    loadItemsFromCache,
    persistToCache,
    clearPosCache,
} from "@/lib/pos-cache";

// ============================================================================
// STATE
// ============================================================================

interface PosCatalogState {
    /** Flat list of all sellable items */
    items: SellableItem[];
    /** In-memory indexes for O(1) lookups */
    indexes: PosIndexes;
    /** Cache metadata (last load time, item count) */
    cacheMeta: PosCacheMeta | null;
    /** Current loading status */
    status: PosDataStatus;
    /** Error message if last operation failed */
    error: string | null;
}

interface PosCatalogActions {
    /**
     * Hydrate POS data: try IndexedDB cache first, fall back to network.
     * Called once on POS page mount. Does NOT re-fetch on every page refresh.
     */
    hydrate: (storeId: string) => Promise<void>;

    /**
     * Force refresh from network. Ignores cache entirely.
     * Called when user clicks the Refresh button.
     */
    refresh: (storeId: string) => Promise<void>;

    /**
     * O(1) barcode lookup from in-memory index.
     * Falls back to DB if not found in memory.
     */
    lookupBarcode: (
        storeId: string,
        barcode: string
    ) => Promise<SellableItem | null>;

    /**
     * O(1) ID lookup from in-memory index.
     */
    lookupById: (id: string) => SellableItem | undefined;

    /**
     * In-memory text search (name, SKU, barcode, brand).
     */
    search: (query: string, limit?: number) => SellableItem[];

    /**
     * Deduct stock locally after a successful sale.
     * No DB call — just update in-memory numbers.
     */
    deductSoldStock: (
        soldItems: Array<{ id: string; quantity: number }>
    ) => void;

    /**
     * Restore stock locally after a return.
     */
    restoreReturnedStock: (
        returnedItems: Array<{ id: string; quantity: number }>
    ) => void;

    /**
     * Inject a new item into memory (e.g., from barcode fallback).
     * Also updates IndexedDB cache.
     */
    injectItem: (item: SellableItem, storeId: string) => void;

    /**
     * Full reset — clears memory and IndexedDB.
     */
    reset: () => Promise<void>;
}

type PosCatalogStore = PosCatalogState & PosCatalogActions;

const EMPTY_INDEXES: PosIndexes = {
    barcodeMap: new Map(),
    idMap: new Map(),
    productMap: new Map(),
};

// ============================================================================
// STORE
// ============================================================================

export const usePosCatalogStore = create<PosCatalogStore>()(
    devtools(
        (set, get) => ({
            // Initial state
            items: [],
            indexes: EMPTY_INDEXES,
            cacheMeta: null,
            status: "idle",
            error: null,

            // ==============================================================
            // HYDRATE — Load from IndexedDB if valid, else network fetch
            // ==============================================================
            hydrate: async (storeId: string) => {
                const state = get();

                // Already loaded for this session — skip
                if (state.status === "ready" && state.items.length > 0) {
                    return;
                }

                // Already loading — skip duplicate calls
                if (state.status === "loading") return;

                set({ status: "loading", error: null });

                try {
                    // Step 1: Try IndexedDB cache
                    const meta = await getCacheMeta(storeId);

                    if (meta) {
                        const cachedItems = await loadItemsFromCache();

                        if (
                            cachedItems.length > 0 &&
                            cachedItems.length === meta.item_count
                        ) {
                            const indexes = buildIndexes(cachedItems);
                            set({
                                items: cachedItems,
                                indexes,
                                cacheMeta: meta,
                                status: "ready",
                                error: null,
                            });
                            return;
                        }
                    }

                    // Step 2: Cache miss or stale → network fetch
                    const result = await fetchAllSellableItems(storeId);

                    if (result.error || !result.data) {
                        set({
                            status: "error",
                            error: result.error ?? "Failed to load POS data",
                        });
                        return;
                    }

                    const items = result.data;
                    const indexes = buildIndexes(items);
                    const newMeta: PosCacheMeta = {
                        store_id: storeId,
                        loaded_at: new Date().toISOString(),
                        item_count: items.length,
                        version: 1,
                    };

                    set({
                        items,
                        indexes,
                        cacheMeta: newMeta,
                        status: "ready",
                        error: null,
                    });

                    // Persist to IndexedDB in the background — don't block UI
                    persistToCache(items, storeId).catch(() => {});
                } catch {
                    set({
                        status: "error",
                        error: "Failed to hydrate POS catalog",
                    });
                }
            },

            // ==============================================================
            // REFRESH — Force network fetch, bypass cache
            // ==============================================================
            refresh: async (storeId: string) => {
                set({ status: "refreshing", error: null });

                try {
                    const result = await fetchAllSellableItems(storeId);

                    if (result.error || !result.data) {
                        set({
                            status: "error",
                            error:
                                result.error ?? "Failed to refresh POS data",
                        });
                        return;
                    }

                    const items = result.data;
                    const indexes = buildIndexes(items);
                    const newMeta: PosCacheMeta = {
                        store_id: storeId,
                        loaded_at: new Date().toISOString(),
                        item_count: items.length,
                        version: 1,
                    };

                    set({
                        items,
                        indexes,
                        cacheMeta: newMeta,
                        status: "ready",
                        error: null,
                    });

                    // Persist updated data
                    persistToCache(items, storeId).catch(() => {});
                } catch {
                    set({
                        status: "error",
                        error: "Failed to refresh POS catalog",
                    });
                }
            },

            // ==============================================================
            // BARCODE LOOKUP — O(1) memory → DB fallback
            // ==============================================================
            lookupBarcode: async (
                storeId: string,
                barcode: string
            ): Promise<SellableItem | null> => {
                const { indexes } = get();

                // O(1) in-memory lookup
                const cached = indexes.barcodeMap.get(barcode);
                if (cached) return cached;

                // Fallback: indexed DB query
                const result = await barcodeFallbackLookup(storeId, barcode);
                if (result.data) {
                    // Inject into memory so next scan is instant
                    get().injectItem(result.data, storeId);
                    return result.data;
                }

                return null;
            },

            // ==============================================================
            // ID LOOKUP — O(1) memory
            // ==============================================================
            lookupById: (id: string): SellableItem | undefined => {
                return get().indexes.idMap.get(id);
            },

            // ==============================================================
            // SEARCH — In-memory, no DB call
            // ==============================================================
            search: (query: string, limit = 10): SellableItem[] => {
                return searchItems(get().items, query, limit);
            },

            // ==============================================================
            // STOCK MUTATIONS (local only)
            // ==============================================================
            deductSoldStock: (
                soldItems: Array<{ id: string; quantity: number }>
            ) => {
                const { items, indexes } = get();
                deductStock(items, indexes, soldItems);
                // Trigger re-render with new array reference
                set({ items: [...items] });
            },

            restoreReturnedStock: (
                returnedItems: Array<{ id: string; quantity: number }>
            ) => {
                const { indexes, items } = get();
                restoreStock(indexes, returnedItems);
                set({ items: [...items] });
            },

            // ==============================================================
            // INJECT — Add a new item from fallback lookup
            // ==============================================================
            injectItem: (item: SellableItem, storeId: string) => {
                const { items, indexes } = get();

                // Skip if already exists
                if (indexes.idMap.has(item.id)) return;

                const newItems = [...items, item];
                const newIndexes = buildIndexes(newItems);

                set({ items: newItems, indexes: newIndexes });

                // Update IndexedDB in background
                persistToCache(newItems, storeId).catch(() => {});
            },

            // ==============================================================
            // RESET — Full wipe
            // ==============================================================
            reset: async () => {
                set({
                    items: [],
                    indexes: EMPTY_INDEXES,
                    cacheMeta: null,
                    status: "idle",
                    error: null,
                });
                await clearPosCache();
            },
        }),
        { name: "pos-catalog" }
    )
);
