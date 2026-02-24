// ============================================================================
// POS TYPES — Flat sellable-item model for in-memory POS operations
// Designed for O(1) barcode/ID lookup with zero network calls during billing
// ============================================================================

/**
 * Flat sellable unit — one row per scannable item.
 * If a product has 5 variants → 5 SellableItem rows in memory.
 * No nesting, no joins, no lazy loading.
 */
export interface SellableItem {
    /** Product ID (always present) */
    id: string;
    /** Parent product ID (same as `id` for non-variant items) */
    product_id: string;
    /** Variant ID if this represents a variant, null otherwise */
    variant_id: string | null;
    /** Display name (product name or "product name — variant name") */
    name: string;
    /** Primary barcode for scanning */
    barcode: string | null;
    /** All scannable barcodes (primary + alternates + additional) */
    all_barcodes: string[];
    /** SKU / product code / variant code */
    sku: string;
    /** HSN code for GST */
    hsn_code: string | null;
    /** Unit display name (e.g. "kg", "pcs") */
    unit_name: string | null;
    /** MRP (Maximum Retail Price) */
    mrp: number;
    /** Selling price (used as unit_price in cart) */
    price: number;
    /** Purchase / cost price for profit calculation */
    cost: number | null;
    /** GST percentage */
    gst_percentage: number;
    /** Cess percentage */
    cess_percentage: number;
    /** Whether this product uses batch tracking */
    has_batch: boolean;
    /** Current available stock (on_hand - committed) */
    stock: number;
    /** Reorder point for low-stock indication */
    reorder_point: number;
    /** Brand name for filtering */
    brand: string | null;
    /** Category ID for filtering */
    category_id: string | null;
    /** Whether the item is active */
    is_active: boolean;
}

/**
 * Metadata for the POS data cache.
 * Stored alongside the sellable items to track freshness.
 */
export interface PosCacheMeta {
    /** Store ID this cache belongs to */
    store_id: string;
    /** ISO timestamp of last successful load */
    loaded_at: string;
    /** Total sellable item count */
    item_count: number;
    /** Cache version — bump to force refresh */
    version: number;
}

/** Current POS cache version. Bump this to force all clients to re-fetch. */
export const POS_CACHE_VERSION = 1;

/**
 * Result of the hydration process (load from IndexedDB or network).
 */
export interface PosHydrationResult {
    items: SellableItem[];
    meta: PosCacheMeta;
    source: "cache" | "network";
}

/**
 * POS data loading state.
 */
export type PosDataStatus =
    | "idle"
    | "loading"
    | "ready"
    | "refreshing"
    | "error";
