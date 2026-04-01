// ============================================================================
// POS TYPES — Flat sellable-item model for in-memory POS operations
// Designed for O(1) barcode/ID lookup with zero network calls during billing
// ============================================================================

// ============================================================================
// OFFER TYPES
// ============================================================================

/** Offer types supported by the system */
export type PosOfferType =
    | "BOGO"                  // Buy 1 Get 1 Free
    | "BUY_X_GET_Y_FREE"      // Buy X Get Y Free
    | "BUY_X_GET_Y_DISCOUNT"  // Buy X Get Y at discount
    | "VOLUME_FREE";          // Volume threshold free items

/**
 * Active offer for a product at POS.
 * Denormalized from product_offers table for fast lookup.
 */
export interface ProductOffer {
    /** Offer ID */
    offer_id: string;
    /** Type of offer */
    offer_type: PosOfferType;
    /** Offer code for display */
    offer_code: string;
    /** Human-readable offer name */
    offer_name: string;
    /** Quantity required to buy to trigger offer */
    buy_quantity: number;
    /** Quantity given free/discounted */
    get_quantity: number;
    /** Discount percentage on free items (100 = fully free) */
    discount_percentage: number;
    /** Message to display at POS */
    pos_display_message: string | null;
    /** Whether to auto-apply the offer */
    auto_apply: boolean;
    /** Offer validity start date */
    start_date: string;
    /** Offer validity end date (null = no end) */
    end_date: string | null;
}

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
    /** Active offer for this product (null if no offer) */
    active_offer: ProductOffer | null;
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
export const POS_CACHE_VERSION = 2; // Bumped for offers support

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
