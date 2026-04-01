// ============================================================================
// POS DATA SERVICE — Fetch once, merge flat, build in-memory indexes
// No per-scan DB calls. No per-search queries. Everything from memory.
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type { SellableItem, ProductOffer, PosOfferType } from "@/types/pos.types";

const getClient = () => createClient();

// ============================================================================
// FETCH RAW DATA (3 parallel queries on POS open)
// ============================================================================

interface RawProduct {
    id: string;
    product_code: string;
    name: string;
    barcode: string | null;
    alternate_barcodes: string[] | null;
    hsn_code: string | null;
    gst_percentage: number;
    cess_percentage: number;
    mrp: number;
    selling_price: number;
    purchase_price: number | null;
    is_batch_tracked: boolean;
    is_active: boolean;
    brand: string | null;
    category_id: string | null;
    unit_id: string | null;
    units_of_measure: { name: string; symbol: string } | null;
}

interface RawVariant {
    id: string;
    product_id: string;
    variant_code: string;
    name: string | null;
    barcode: string | null;
    mrp: number | null;
    selling_price: number | null;
    is_active: boolean;
    attributes: Record<string, string>;
}

interface RawInventory {
    product_id: string;
    variant_id: string | null;
    quantity_on_hand: number;
    quantity_committed: number;
    reorder_point: number;
}

interface RawBarcode {
    product_id: string;
    barcode: string;
    is_active: boolean;
}

/**
 * Raw product offer from get_active_pos_offers RPC.
 */
interface RawProductOffer {
    product_id: string;
    variant_id: string | null;
    offer_id: string;
    offer_type: string;
    offer_code: string;
    offer_name: string;
    buy_quantity: number;
    get_quantity: number;
    discount_percentage: number;
    pos_display_message: string | null;
    auto_apply: boolean;
    start_date: string;
    end_date: string | null;
}

/**
 * Fetch all active products (minimal columns only — no bloat).
 * Uses a single SELECT with a join for unit name.
 */
async function fetchProducts(
    storeId: string
): Promise<ServiceResponse<RawProduct[]>> {
    try {
        const { data, error } = await getClient()
            .from("products")
            .select(
                `id, product_code, name, barcode, alternate_barcodes,
                 hsn_code, gst_percentage, cess_percentage,
                 mrp, selling_price, purchase_price,
                 is_batch_tracked, is_active, brand, category_id, unit_id,
                 units_of_measure:unit_id (name, symbol)`
            )
            .eq("store_id", storeId)
            .eq("is_active", true);

        if (error) return { data: null, error: error.message };
        return { data: (data ?? []) as unknown as RawProduct[], error: null };
    } catch {
        return { data: null, error: "Failed to fetch products" };
    }
}

/**
 * Fetch all active variants (minimal columns).
 */
async function fetchVariants(
    storeId: string
): Promise<ServiceResponse<RawVariant[]>> {
    try {
        const { data, error } = await getClient()
            .from("product_variants")
            .select(
                "id, product_id, variant_code, name, barcode, mrp, selling_price, is_active, attributes"
            )
            .eq("store_id", storeId)
            .eq("is_active", true);

        if (error) return { data: null, error: error.message };
        return { data: (data ?? []) as unknown as RawVariant[], error: null };
    } catch {
        return { data: null, error: "Failed to fetch variants" };
    }
}

/**
 * Fetch inventory summary (stock levels only — no heavy joins).
 */
async function fetchInventory(
    storeId: string
): Promise<ServiceResponse<RawInventory[]>> {
    try {
        const { data, error } = await getClient()
            .from("inventory")
            .select(
                "product_id, variant_id, quantity_on_hand, quantity_committed, reorder_point"
            )
            .eq("store_id", storeId)
            .eq("is_active", true);

        if (error) return { data: null, error: error.message };
        return { data: (data ?? []) as unknown as RawInventory[], error: null };
    } catch {
        return { data: null, error: "Failed to fetch inventory" };
    }
}

/**
 * Fetch additional barcodes (product_barcodes table).
 */
async function fetchAdditionalBarcodes(
    storeId: string
): Promise<ServiceResponse<RawBarcode[]>> {
    try {
        const { data, error } = await getClient()
            .from("product_barcodes")
            .select("product_id, barcode, is_active")
            .eq("store_id", storeId)
            .eq("is_active", true);

        if (error) return { data: null, error: error.message };
        return { data: (data ?? []) as unknown as RawBarcode[], error: null };
    } catch {
        return { data: null, error: "Failed to fetch barcodes" };
    }
}

/**
 * Fetch active product offers via RPC.
 * Returns all currently valid offers for POS display/application.
 */
async function fetchActiveOffers(
    storeId: string
): Promise<ServiceResponse<RawProductOffer[]>> {
    try {
        const { data, error } = await getClient()
            .rpc("get_active_pos_offers", { p_store_id: storeId });

        if (error) return { data: null, error: error.message };
        return { data: (data ?? []) as RawProductOffer[], error: null };
    } catch {
        return { data: null, error: "Failed to fetch offers" };
    }
}

// ============================================================================
// MERGE INTO FLAT SELLABLE ITEMS
// ============================================================================

/**
 * Build inventory lookup maps for O(1) access.
 * Key format: "productId" or "productId:variantId"
 */
function buildInventoryMap(
    inventory: RawInventory[]
): Map<string, RawInventory> {
    const map = new Map<string, RawInventory>();
    for (const inv of inventory) {
        const key = inv.variant_id
            ? `${inv.product_id}:${inv.variant_id}`
            : inv.product_id;
        map.set(key, inv);
    }
    return map;
}

/**
 * Build additional-barcodes lookup (product_id → barcode[]).
 */
function buildBarcodesMap(barcodes: RawBarcode[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const b of barcodes) {
        const existing = map.get(b.product_id);
        if (existing) {
            existing.push(b.barcode);
        } else {
            map.set(b.product_id, [b.barcode]);
        }
    }
    return map;
}

/**
 * Build product offers lookup.
 * Key: "productId" or "productId:variantId" for variant-specific offers.
 * Variant-specific offers take priority over product-level offers.
 */
function buildOffersMap(offers: RawProductOffer[]): Map<string, ProductOffer> {
    const map = new Map<string, ProductOffer>();
    
    // First pass: add product-level offers
    for (const o of offers) {
        if (!o.variant_id) {
            map.set(o.product_id, {
                offer_id: o.offer_id,
                offer_type: o.offer_type as PosOfferType,
                offer_code: o.offer_code,
                offer_name: o.offer_name,
                buy_quantity: o.buy_quantity,
                get_quantity: o.get_quantity,
                discount_percentage: o.discount_percentage,
                pos_display_message: o.pos_display_message,
                auto_apply: o.auto_apply,
                start_date: o.start_date,
                end_date: o.end_date,
            });
        }
    }
    
    // Second pass: add/override with variant-specific offers
    for (const o of offers) {
        if (o.variant_id) {
            const key = `${o.product_id}:${o.variant_id}`;
            map.set(key, {
                offer_id: o.offer_id,
                offer_type: o.offer_type as PosOfferType,
                offer_code: o.offer_code,
                offer_name: o.offer_name,
                buy_quantity: o.buy_quantity,
                get_quantity: o.get_quantity,
                discount_percentage: o.discount_percentage,
                pos_display_message: o.pos_display_message,
                auto_apply: o.auto_apply,
                start_date: o.start_date,
                end_date: o.end_date,
            });
        }
    }
    
    return map;
}

/**
 * Merge products + variants + inventory + barcodes + offers → flat SellableItem[].
 * Each variant becomes its own row. Products without variants get one row.
 */
function mergeToSellableItems(
    products: RawProduct[],
    variants: RawVariant[],
    inventory: RawInventory[],
    additionalBarcodes: RawBarcode[],
    offers: RawProductOffer[] = []
): SellableItem[] {
    const invMap = buildInventoryMap(inventory);
    const bcMap = buildBarcodesMap(additionalBarcodes);
    const offerMap = buildOffersMap(offers);

    // Group variants by product_id for quick lookup
    const variantsByProduct = new Map<string, RawVariant[]>();
    for (const v of variants) {
        const existing = variantsByProduct.get(v.product_id);
        if (existing) {
            existing.push(v);
        } else {
            variantsByProduct.set(v.product_id, [v]);
        }
    }

    const items: SellableItem[] = [];

    for (const p of products) {
        const productVariants = variantsByProduct.get(p.id);
        const unitName =
            p.units_of_measure?.symbol ?? p.units_of_measure?.name ?? null;
        const extraBarcodes = bcMap.get(p.id) ?? [];

        if (productVariants && productVariants.length > 0) {
            // Product has variants → one SellableItem per variant
            for (const v of productVariants) {
                const invKey = `${p.id}:${v.id}`;
                const inv = invMap.get(invKey) ?? invMap.get(p.id);
                const stock = inv
                    ? inv.quantity_on_hand - inv.quantity_committed
                    : 0;
                const reorderPoint = inv?.reorder_point ?? 0;

                // Collect all scannable barcodes for this variant
                const allBarcodes: string[] = [];
                if (v.barcode) allBarcodes.push(v.barcode);
                if (p.barcode) allBarcodes.push(p.barcode);
                if (p.alternate_barcodes) {
                    allBarcodes.push(...p.alternate_barcodes);
                }
                allBarcodes.push(...extraBarcodes);

                // Get offer: variant-specific first, then product-level
                const variantOfferKey = `${p.id}:${v.id}`;
                const activeOffer = offerMap.get(variantOfferKey) ?? offerMap.get(p.id) ?? null;

                items.push({
                    id: v.id,
                    product_id: p.id,
                    variant_id: v.id,
                    name: v.name ? `${p.name} — ${v.name}` : p.name,
                    barcode: v.barcode ?? p.barcode,
                    all_barcodes: [...new Set(allBarcodes)],
                    sku: v.variant_code || p.product_code,
                    hsn_code: p.hsn_code,
                    unit_name: unitName,
                    mrp: v.mrp ?? p.mrp,
                    price: v.selling_price ?? p.selling_price,
                    cost: p.purchase_price,
                    gst_percentage: p.gst_percentage,
                    cess_percentage: p.cess_percentage,
                    has_batch: p.is_batch_tracked,
                    stock,
                    reorder_point: reorderPoint,
                    brand: p.brand,
                    category_id: p.category_id,
                    is_active: v.is_active && p.is_active,
                    active_offer: activeOffer,
                });
            }
        } else {
            // Standalone product → one SellableItem
            const inv = invMap.get(p.id);
            const stock = inv
                ? inv.quantity_on_hand - inv.quantity_committed
                : 0;
            const reorderPoint = inv?.reorder_point ?? 0;

            const allBarcodes: string[] = [];
            if (p.barcode) allBarcodes.push(p.barcode);
            if (p.alternate_barcodes) {
                allBarcodes.push(...p.alternate_barcodes);
            }
            allBarcodes.push(...extraBarcodes);

            // Get offer for product
            const activeOffer = offerMap.get(p.id) ?? null;

            items.push({
                id: p.id,
                product_id: p.id,
                variant_id: null,
                name: p.name,
                barcode: p.barcode,
                all_barcodes: [...new Set(allBarcodes)],
                sku: p.product_code,
                hsn_code: p.hsn_code,
                unit_name: unitName,
                mrp: p.mrp,
                price: p.selling_price,
                cost: p.purchase_price,
                gst_percentage: p.gst_percentage,
                cess_percentage: p.cess_percentage,
                has_batch: p.is_batch_tracked,
                stock,
                reorder_point: reorderPoint,
                brand: p.brand,
                category_id: p.category_id,
                is_active: p.is_active,
                active_offer: activeOffer,
            });
        }
    }

    return items;
}

// ============================================================================
// IN-MEMORY INDEXES — O(1) lookups
// ============================================================================

export interface PosIndexes {
    /** barcode → SellableItem (includes all barcode variants) */
    barcodeMap: Map<string, SellableItem>;
    /** item id (product or variant) → SellableItem */
    idMap: Map<string, SellableItem>;
    /** product_id → SellableItem[] (for products with multiple variants) */
    productMap: Map<string, SellableItem[]>;
}

/**
 * Build barcode + ID indexes from flat items.
 * Every barcode in `all_barcodes` gets its own map entry → O(1) scan lookup.
 */
export function buildIndexes(items: SellableItem[]): PosIndexes {
    const barcodeMap = new Map<string, SellableItem>();
    const idMap = new Map<string, SellableItem>();
    const productMap = new Map<string, SellableItem[]>();

    for (const item of items) {
        // ID index
        idMap.set(item.id, item);

        // Barcode index — every scannable barcode points to this item
        for (const bc of item.all_barcodes) {
            // First match wins (barcode should be unique, but defensive)
            if (!barcodeMap.has(bc)) {
                barcodeMap.set(bc, item);
            }
        }

        // Product grouping (for variant selection UX)
        const existing = productMap.get(item.product_id);
        if (existing) {
            existing.push(item);
        } else {
            productMap.set(item.product_id, [item]);
        }
    }

    return { barcodeMap, idMap, productMap };
}

// ============================================================================
// SEARCH (in-memory, no DB)
// ============================================================================

/**
 * Fuzzy search across name, SKU, barcode, brand.
 * Runs entirely in memory — no network call.
 */
export function searchItems(
    items: SellableItem[],
    query: string,
    limit = 10
): SellableItem[] {
    if (!query || query.length < 1) return [];

    const q = query.toLowerCase();
    const results: SellableItem[] = [];

    for (const item of items) {
        if (results.length >= limit) break;

        if (
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            (item.barcode && item.barcode.toLowerCase().includes(q)) ||
            (item.brand && item.brand.toLowerCase().includes(q))
        ) {
            results.push(item);
        }
    }

    return results;
}

// ============================================================================
// STOCK UPDATE (local, after sale)
// ============================================================================

/**
 * Deduct sold quantities from in-memory stock.
 * Called after a successful sale commit — no DB re-fetch needed.
 */
export function deductStock(
    items: SellableItem[],
    indexes: PosIndexes,
    soldItems: Array<{ id: string; quantity: number }>
): void {
    for (const sold of soldItems) {
        const item = indexes.idMap.get(sold.id);
        if (item) {
            item.stock = Math.max(0, item.stock - sold.quantity);
        }
    }
}

/**
 * Add stock back (e.g. after a return).
 */
export function restoreStock(
    indexes: PosIndexes,
    returnedItems: Array<{ id: string; quantity: number }>
): void {
    for (const returned of returnedItems) {
        const item = indexes.idMap.get(returned.id);
        if (item) {
            item.stock += returned.quantity;
        }
    }
}

// ============================================================================
// MAIN ENTRY — LOAD ALL POS DATA
// ============================================================================

/**
 * Fetch products + variants + inventory + barcodes + offers in parallel → merge → return flat list.
 * Called once on POS open, or on explicit refresh.
 */
export async function fetchAllSellableItems(
    storeId: string
): Promise<ServiceResponse<SellableItem[]>> {
    try {
        // 5 parallel fetches — single network burst
        const [productsRes, variantsRes, inventoryRes, barcodesRes, offersRes] =
            await Promise.all([
                fetchProducts(storeId),
                fetchVariants(storeId),
                fetchInventory(storeId),
                fetchAdditionalBarcodes(storeId),
                fetchActiveOffers(storeId),
            ]);

        // Fail if products fetch failed (critical)
        if (productsRes.error || !productsRes.data) {
            return {
                data: null,
                error: productsRes.error ?? "Failed to fetch products",
            };
        }

        // Non-critical: variants/inventory/barcodes/offers can be empty
        const products = productsRes.data;
        const variants = variantsRes.data ?? [];
        const inventory = inventoryRes.data ?? [];
        const barcodes = barcodesRes.data ?? [];
        const offers = offersRes.data ?? [];

        const items = mergeToSellableItems(
            products,
            variants,
            inventory,
            barcodes,
            offers
        );

        return { data: items, error: null };
    } catch {
        return { data: null, error: "Failed to load POS catalog data" };
    }
}

// ============================================================================
// BARCODE FALLBACK — DB lookup when cache misses
// ============================================================================

/**
 * Fallback barcode lookup via indexed DB columns.
 * Only called when in-memory barcodeMap returns nothing.
 * The DB columns should have indexes for instant response.
 */
export async function barcodeFallbackLookup(
    storeId: string,
    barcode: string
): Promise<ServiceResponse<SellableItem | null>> {
    try {
        // 1. products.barcode
        const { data: product } = await getClient()
            .from("products")
            .select(
                `id, product_code, name, barcode, alternate_barcodes,
                 hsn_code, gst_percentage, cess_percentage,
                 mrp, selling_price, purchase_price,
                 is_batch_tracked, is_active, brand, category_id, unit_id,
                 units_of_measure:unit_id (name, symbol)`
            )
            .eq("store_id", storeId)
            .eq("barcode", barcode)
            .eq("is_active", true)
            .maybeSingle();

        if (product) {
            const p = product as unknown as RawProduct;
            const unitName =
                p.units_of_measure?.symbol ?? p.units_of_measure?.name ?? null;
            const allBarcodes: string[] = [];
            if (p.barcode) allBarcodes.push(p.barcode);
            if (p.alternate_barcodes) allBarcodes.push(...p.alternate_barcodes);

            const item: SellableItem = {
                id: p.id,
                product_id: p.id,
                variant_id: null,
                name: p.name,
                barcode: p.barcode,
                all_barcodes: [...new Set(allBarcodes)],
                sku: p.product_code,
                hsn_code: p.hsn_code,
                unit_name: unitName,
                mrp: p.mrp,
                price: p.selling_price,
                cost: p.purchase_price,
                gst_percentage: p.gst_percentage,
                cess_percentage: p.cess_percentage,
                has_batch: p.is_batch_tracked,
                stock: 0, // Unknown — will be updated on next refresh
                reorder_point: 0,
                brand: p.brand,
                category_id: p.category_id,
                is_active: p.is_active,
                active_offer: null, // Offers loaded from cache; fallback items don't have offers
            };
            return { data: item, error: null };
        }

        // 2. product_variants.barcode
        const { data: variant } = await getClient()
            .from("product_variants")
            .select("id, product_id, variant_code, name, barcode, mrp, selling_price, is_active")
            .eq("store_id", storeId)
            .eq("barcode", barcode)
            .eq("is_active", true)
            .maybeSingle();

        if (variant) {
            const v = variant as unknown as RawVariant;
            // Fetch parent product for tax/cost info
            const { data: parentProd } = await getClient()
                .from("products")
                .select(
                    `id, product_code, name, barcode, hsn_code,
                     gst_percentage, cess_percentage, mrp, selling_price,
                     purchase_price, is_batch_tracked, is_active, brand, category_id, unit_id,
                     units_of_measure:unit_id (name, symbol)`
                )
                .eq("id", v.product_id)
                .eq("is_active", true)
                .single();

            if (parentProd) {
                const p = parentProd as unknown as RawProduct;
                const unitName =
                    p.units_of_measure?.symbol ??
                    p.units_of_measure?.name ??
                    null;

                const item: SellableItem = {
                    id: v.id,
                    product_id: p.id,
                    variant_id: v.id,
                    name: v.name ? `${p.name} — ${v.name}` : p.name,
                    barcode: v.barcode,
                    all_barcodes: v.barcode ? [v.barcode] : [],
                    sku: v.variant_code || p.product_code,
                    hsn_code: p.hsn_code,
                    unit_name: unitName,
                    mrp: v.mrp ?? p.mrp,
                    price: v.selling_price ?? p.selling_price,
                    cost: p.purchase_price,
                    gst_percentage: p.gst_percentage,
                    cess_percentage: p.cess_percentage,
                    has_batch: p.is_batch_tracked,
                    stock: 0,
                    reorder_point: 0,
                    brand: p.brand,
                    category_id: p.category_id,
                    is_active: v.is_active && p.is_active,
                    active_offer: null,
                };
                return { data: item, error: null };
            }
        }

        // 3. product_barcodes table
        const { data: barcodeEntry } = await getClient()
            .from("product_barcodes")
            .select("product_id")
            .eq("store_id", storeId)
            .eq("barcode", barcode)
            .eq("is_active", true)
            .maybeSingle();

        if (barcodeEntry) {
            const pid = (barcodeEntry as Record<string, unknown>)
                .product_id as string;
            const { data: prod } = await getClient()
                .from("products")
                .select(
                    `id, product_code, name, barcode, alternate_barcodes,
                     hsn_code, gst_percentage, cess_percentage,
                     mrp, selling_price, purchase_price,
                     is_batch_tracked, is_active, brand, category_id, unit_id,
                     units_of_measure:unit_id (name, symbol)`
                )
                .eq("id", pid)
                .eq("is_active", true)
                .single();

            if (prod) {
                const p = prod as unknown as RawProduct;
                const unitName =
                    p.units_of_measure?.symbol ??
                    p.units_of_measure?.name ??
                    null;

                const item: SellableItem = {
                    id: p.id,
                    product_id: p.id,
                    variant_id: null,
                    name: p.name,
                    barcode: p.barcode,
                    all_barcodes: p.barcode ? [p.barcode, barcode] : [barcode],
                    sku: p.product_code,
                    hsn_code: p.hsn_code,
                    unit_name: unitName,
                    mrp: p.mrp,
                    price: p.selling_price,
                    cost: p.purchase_price,
                    gst_percentage: p.gst_percentage,
                    cess_percentage: p.cess_percentage,
                    has_batch: p.is_batch_tracked,
                    stock: 0,
                    reorder_point: 0,
                    brand: p.brand,
                    category_id: p.category_id,
                    is_active: p.is_active,
                    active_offer: null,
                };
                return { data: item, error: null };
            }
        }

        return { data: null, error: null };
    } catch {
        return { data: null, error: "Barcode fallback lookup failed" };
    }
}
