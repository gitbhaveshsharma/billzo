// ============================================================================
// POS CACHE — IndexedDB persistence layer using `idb`
// Survives page refreshes. Only reloads on explicit user action.
// ============================================================================

import { openDB, type IDBPDatabase } from "idb";
import type { SellableItem, PosCacheMeta } from "@/types/pos.types";
import { POS_CACHE_VERSION } from "@/types/pos.types";

const DB_NAME = "pos-catalog";
const DB_VERSION = 1;
const ITEMS_STORE = "items";
const META_STORE = "meta";
const META_KEY = "cache-meta";

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
        const tx = db.transaction([ITEMS_STORE, META_STORE], "readwrite");
        await tx.objectStore(ITEMS_STORE).clear();
        await tx.objectStore(META_STORE).clear();
        await tx.done;
    } catch {
        console.warn("[POS Cache] Failed to clear cache");
    }
}
