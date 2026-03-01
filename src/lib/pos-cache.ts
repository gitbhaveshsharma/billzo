// ============================================================================
// POS CACHE — IndexedDB persistence layer using `idb`
// Survives page refreshes. Only reloads on explicit user action.
// ============================================================================

import { openDB, type IDBPDatabase } from "idb";
import type { SellableItem, PosCacheMeta } from "@/types/pos.types";
import { POS_CACHE_VERSION } from "@/types/pos.types";
import type { ReceiptLayoutConfig } from "@/hooks/use-hardware";

// ============================================================================
// CACHED STORE INFO — receipt-relevant store + org fields
// ============================================================================

export interface CachedStoreInfo {
    name: string;
    address: string;
    phone: string | null;
    gstin: string | null;
    /** Organization-level GSTIN (fallback when store has none) */
    orgGstin: string | null;
}

const DB_NAME = "pos-catalog";
const DB_VERSION = 2;
const ITEMS_STORE = "items";
const META_STORE = "meta";
const CONFIG_STORE = "config";
const META_KEY = "cache-meta";
const RECEIPT_CONFIG_KEY = "receipt-layout";
const STORE_INFO_KEY = "store-info";

// ============================================================================
// DATABASE SETUP
// ============================================================================

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Items store — keyed by SellableItem.id
                if (!db.objectStoreNames.contains(ITEMS_STORE)) {
                    db.createObjectStore(ITEMS_STORE, { keyPath: "id" });
                }
                // Meta store — single row for cache metadata
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE);
                }
                // Config store — receipt layout, printer settings, etc.
                if (!db.objectStoreNames.contains(CONFIG_STORE)) {
                    db.createObjectStore(CONFIG_STORE);
                }
            },
        });
    }
    return dbPromise;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Read cache metadata. Returns null if cache is empty or stale.
 */
export async function getCacheMeta(
    storeId: string
): Promise<PosCacheMeta | null> {
    try {
        const db = await getDb();
        const meta: PosCacheMeta | undefined = await db.get(
            META_STORE,
            META_KEY
        );
        if (!meta) return null;
        // Invalidate if store changed or version bumped
        if (meta.store_id !== storeId || meta.version !== POS_CACHE_VERSION) {
            return null;
        }
        return meta;
    } catch {
        return null;
    }
}

/**
 * Load all sellable items from IndexedDB.
 * Returns empty array if cache miss.
 */
export async function loadItemsFromCache(): Promise<SellableItem[]> {
    try {
        const db = await getDb();
        return (await db.getAll(ITEMS_STORE)) as SellableItem[];
    } catch {
        return [];
    }
}

/**
 * Persist sellable items + meta to IndexedDB in one transaction.
 * Clears existing data first (full replace, not merge).
 */
export async function persistToCache(
    items: SellableItem[],
    storeId: string
): Promise<void> {
    try {
        const db = await getDb();

        // Clear and re-populate items
        const tx = db.transaction(ITEMS_STORE, "readwrite");
        await tx.store.clear();
        for (const item of items) {
            await tx.store.put(item);
        }
        await tx.done;

        // Write meta
        const meta: PosCacheMeta = {
            store_id: storeId,
            loaded_at: new Date().toISOString(),
            item_count: items.length,
            version: POS_CACHE_VERSION,
        };
        await db.put(META_STORE, meta, META_KEY);
    } catch {
        // Silently fail — POS still works from memory
        console.warn("[POS Cache] Failed to persist to IndexedDB");
    }
}

/**
 * Clear all cached POS data.
 */
export async function clearPosCache(): Promise<void> {
    try {
        const db = await getDb();
        const tx = db.transaction([ITEMS_STORE, META_STORE, CONFIG_STORE], "readwrite");
        await tx.objectStore(ITEMS_STORE).clear();
        await tx.objectStore(META_STORE).clear();
        await tx.objectStore(CONFIG_STORE).clear();
        await tx.done;
    } catch {
        console.warn("[POS Cache] Failed to clear cache");
    }
}

// ============================================================================
// RECEIPT CONFIG CACHE
// ============================================================================

/**
 * Load receipt layout config from IndexedDB.
 * Returns null if not cached.
 */
export async function loadReceiptConfigFromCache(): Promise<ReceiptLayoutConfig | null> {
    try {
        const db = await getDb();
        const config = await db.get(CONFIG_STORE, RECEIPT_CONFIG_KEY);
        return (config as ReceiptLayoutConfig) ?? null;
    } catch {
        return null;
    }
}

/**
 * Persist receipt layout config to IndexedDB.
 */
export async function persistReceiptConfig(
    config: ReceiptLayoutConfig
): Promise<void> {
    try {
        const db = await getDb();
        await db.put(CONFIG_STORE, config, RECEIPT_CONFIG_KEY);
    } catch {
        console.warn("[POS Cache] Failed to persist receipt config");
    }
}

// ============================================================================
// STORE INFO CACHE — receipt-relevant store + org data
// ============================================================================

/**
 * Load cached store info from IndexedDB.
 * Returns null if not cached.
 */
export async function loadStoreInfoFromCache(): Promise<CachedStoreInfo | null> {
    try {
        const db = await getDb();
        const info = await db.get(CONFIG_STORE, STORE_INFO_KEY);
        return (info as CachedStoreInfo) ?? null;
    } catch {
        return null;
    }
}

/**
 * Persist store info to IndexedDB for offline receipt printing.
 */
export async function persistStoreInfo(
    info: CachedStoreInfo
): Promise<void> {
    try {
        const db = await getDb();
        await db.put(CONFIG_STORE, info, STORE_INFO_KEY);
    } catch {
        console.warn("[POS Cache] Failed to persist store info");
    }
}
