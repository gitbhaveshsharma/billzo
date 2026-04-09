import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
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
    ProductListResponse,
    InventoryFilters,
    InventoryTransactionFilters,
    StockAlertFilters,
    CategoryFilters,
    ProductDashboardStats,
    InventorySummary,
} from "@/types/product.types";

const getClient = () => createClient();

const normalizePrice = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const hasPriceChanged = (oldPrice: unknown, newPrice: unknown): boolean => {
    return normalizePrice(oldPrice) !== normalizePrice(newPrice);
};

// ============================================================================
// PRODUCT SERVICE
// All CRUD operations for products, variants, barcodes, categories, units,
// inventory, batches, supplier products, price history, and stock alerts
// ============================================================================

export const productService = {
    // ========================================================================
    // STORAGE — PRODUCT IMAGES
    // ========================================================================

    /**
     * Upload a product image to the `product-images` bucket.
     * Path: {storeId}/{productId}/{timestamp}-{filename}
     * Returns the public CDN URL on success.
     */
    uploadProductImage: async (
        storeId: string,
        productId: string,
        file: File
    ): Promise<ServiceResponse<string>> => {
        try {
            const ext = file.name.split(".").pop() ?? "jpg";
            const path = `${storeId}/${productId}/${Date.now()}.${ext}`;

            const { error: uploadError } = await getClient()
                .storage
                .from("product-images")
                .upload(path, file, { upsert: true, contentType: file.type });

            if (uploadError) return { data: null, error: uploadError.message };

            const { data } = getClient()
                .storage
                .from("product-images")
                .getPublicUrl(path);

            return { data: data.publicUrl, error: null };
        } catch {
            return { data: null, error: "Failed to upload image" };
        }
    },

    /**
     * Delete a product image from storage by its public URL.
     */
    deleteProductImage: async (publicUrl: string): Promise<ServiceResponse<null>> => {
        try {
            // Extract the path after "/product-images/"
            const marker = "/product-images/";
            const idx = publicUrl.indexOf(marker);
            if (idx === -1) return { data: null, error: "Invalid image URL" };
            const path = publicUrl.slice(idx + marker.length);

            const { error } = await getClient()
                .storage
                .from("product-images")
                .remove([path]);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete image" };
        }
    },

    // ========================================================================
    // PRODUCT CRUD
    // ========================================================================

    /**
     * Create a new product
     */
    createProduct: async (
        storeId: string,
        data: CreateProductRequest
    ): Promise<ServiceResponse<Product>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data: product, error } = await getClient()
                .from("products")
                .insert({
                    ...data,
                    store_id: storeId,
                    created_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: product as unknown as Product, error: null };
        } catch {
            return { data: null, error: "Failed to create product" };
        }
    },

    /**
     * Get a product by ID with all related data
     */
    getProductById: async (
        storeId: string,
        productId: string
    ): Promise<ServiceResponse<EnrichedProduct>> => {
        try {
            const { data: product, error } = await getClient()
                .from("products")
                .select(`
                    *,
                    product_variants (*),
                    product_barcodes (*),
                    inventory (*),
                    product_batches (*),
                    supplier_products (*),
                    categories:category_id (id, name, path),
                    units_of_measure:unit_id (id, name, code, symbol)
                `)
                .eq("id", productId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!product) return { data: null, error: "Product not found" };

            const raw = product as Record<string, unknown>;

            const enriched: EnrichedProduct = {
                ...(raw as unknown as Product),
                variants: (raw.product_variants ?? []) as unknown as ProductVariant[],
                barcodes: (raw.product_barcodes ?? []) as unknown as ProductBarcode[],
                inventory: Array.isArray(raw.inventory)
                    ? (raw.inventory[0] as unknown as Inventory) ?? null
                    : (raw.inventory as unknown as Inventory) ?? null,
                batches: (raw.product_batches ?? []) as unknown as ProductBatch[],
                supplier_products: (raw.supplier_products ?? []) as unknown as SupplierProduct[],
                category: raw.categories as unknown as EnrichedProduct["category"],
                unit: raw.units_of_measure as unknown as EnrichedProduct["unit"],
            };

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch product" };
        }
    },

    /**
     * Get paginated list of products with filters
     */
    getProductList: async (
        storeId: string,
        filters?: ProductFilters,
        pagination?: ProductPagination
    ): Promise<ServiceResponse<ProductListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sort_by ?? "created_at";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("products")
                .select(
                    "*, inventory(quantity_on_hand, reorder_point, quantity_available, quantity_committed, variant_id)",
                    { count: "exact" }
                )
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.category_id) {
                    query = query.eq("category_id", filters.category_id);
                }
                if (filters.brand) {
                    query = query.eq("brand", filters.brand);
                }
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.is_batch_tracked !== undefined) {
                    query = query.eq("is_batch_tracked", filters.is_batch_tracked);
                }
                if (filters.is_taxable !== undefined) {
                    query = query.eq("is_taxable", filters.is_taxable);
                }
                if (filters.gst_percentage != null) {
                    query = query.eq("gst_percentage", filters.gst_percentage);
                }
                if (filters.min_price != null) {
                    query = query.gte("selling_price", filters.min_price);
                }
                if (filters.max_price != null) {
                    query = query.lte("selling_price", filters.max_price);
                }
                if (filters.has_barcode === true) {
                    query = query.not("barcode", "is", null);
                } else if (filters.has_barcode === false) {
                    query = query.is("barcode", null);
                }
                if (filters.search) {
                    query = query.or(
                        `name.ilike.%${filters.search}%,` +
                        `product_code.ilike.%${filters.search}%,` +
                        `barcode.ilike.%${filters.search}%,` +
                        `brand.ilike.%${filters.search}%,` +
                        `hsn_code.ilike.%${filters.search}%`
                    );
                }
            }

            // Sorting and pagination
            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;
            const totalPages = Math.ceil(total / limit);

            return {
                data: {
                    products: (data ?? []) as unknown as Product[],
                    total,
                    page,
                    limit,
                    total_pages: totalPages,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch products" };
        }
    },

    /**
     * Update a product
     */
    updateProduct: async (
        storeId: string,
        productId: string,
        data: UpdateProductRequest
    ): Promise<ServiceResponse<Product>> => {
        try {
            const { data: existingProduct, error: existingProductError } = await getClient()
                .from("products")
                .select("mrp, selling_price")
                .eq("id", productId)
                .eq("store_id", storeId)
                .maybeSingle();

            if (existingProductError) {
                return { data: null, error: existingProductError.message };
            }

            const updatedAt = new Date().toISOString();

            // Use Prefer: return=representation so the updated row is returned from
            // the same write connection — no read-replica staleness.
            // If RLS silently blocks the UPDATE (USING clause fails), Supabase returns
            // 204 with no row, causing `updated` to be null with no error object.
            // We detect that case and surface a real error instead of silently
            // falling back to a GET of the stale row.
            const { data: updated, error: updateError } = await getClient()
                .from("products")
                .update({
                    ...data,
                    updated_at: updatedAt,
                } as never)
                .eq("id", productId)
                .eq("store_id", storeId)
                .select("*")
                .maybeSingle();

            if (updateError) return { data: null, error: updateError.message };

            if (!updated) {
                // 204 with no row returned → RLS USING clause silently blocked the
                // UPDATE (0 rows affected).  The user can read the row but lacks
                // write permission.  Surface this as a real error.
                return {
                    data: null,
                    error: "Update failed: your role does not have permission to modify this product. Run the latest migration (12_fix_role_permissions_and_has_permission.sql) to grant store_admin write access.",
                };
            }

            // Merge server-returned row with the local payload so that any
            // fields the UPDATE set are guaranteed to reflect the new value.
            const merged = {
                ...(updated as unknown as Product),
                ...data,
                updated_at: updatedAt,
            } as Product;

            const historyWrites: Array<Promise<ServiceResponse<PriceHistory>>> = [];
            const previous = (existingProduct ?? {}) as {
                mrp?: number | null;
                selling_price?: number | null;
            };

            if (
                data.selling_price !== undefined &&
                hasPriceChanged(previous.selling_price, data.selling_price)
            ) {
                historyWrites.push(
                    productService.recordPriceChange(
                        storeId,
                        productId,
                        "SELLING",
                        normalizePrice(previous.selling_price),
                        data.selling_price,
                        "Product selling price updated"
                    )
                );
            }

            if (data.mrp !== undefined && hasPriceChanged(previous.mrp, data.mrp)) {
                historyWrites.push(
                    productService.recordPriceChange(
                        storeId,
                        productId,
                        "MRP",
                        normalizePrice(previous.mrp),
                        data.mrp,
                        "Product MRP updated"
                    )
                );
            }

            if (historyWrites.length > 0) {
                await Promise.all(historyWrites);
            }

            return { data: merged, error: null };
        } catch {
            return { data: null, error: "Failed to update product" };
        }
    },

    /**
     * Delete a product
     */
    deleteProduct: async (
        storeId: string,
        productId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("products")
                .delete()
                .eq("id", productId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete product" };
        }
    },

    /**
     * Toggle product active status
     */
    toggleProductActive: async (
        storeId: string,
        productId: string,
        isActive: boolean
    ): Promise<ServiceResponse<Product>> => {
        return productService.updateProduct(storeId, productId, { is_active: isActive });
    },

    // ========================================================================
    // BARCODE LOOKUP (POS)
    // ========================================================================

    /**
     * Lookup product by barcode (checks products, product_barcodes, product_variants)
     */
    lookupByBarcode: async (
        storeId: string,
        barcode: string
    ): Promise<ServiceResponse<Product>> => {
        try {
            // 1. Check products.barcode
            const { data: product } = await getClient()
                .from("products")
                .select("*")
                .eq("store_id", storeId)
                .eq("barcode", barcode)
                .eq("is_active", true)
                .maybeSingle();

            if (product) return { data: product as unknown as Product, error: null };

            // 2. Check product_barcodes table
            const { data: barcodeEntry } = await getClient()
                .from("product_barcodes")
                .select("product_id")
                .eq("store_id", storeId)
                .eq("barcode", barcode)
                .eq("is_active", true)
                .maybeSingle();

            if (barcodeEntry) {
                const { data: prod } = await getClient()
                    .from("products")
                    .select("*")
                    .eq("id", (barcodeEntry as Record<string, unknown>).product_id as string)
                    .eq("is_active", true)
                    .single();

                if (prod) return { data: prod as unknown as Product, error: null };
            }

            // 3. Check product_variants.barcode
            const { data: variant } = await getClient()
                .from("product_variants")
                .select("product_id")
                .eq("store_id", storeId)
                .eq("barcode", barcode)
                .eq("is_active", true)
                .maybeSingle();

            if (variant) {
                const { data: prod } = await getClient()
                    .from("products")
                    .select("*")
                    .eq("id", (variant as Record<string, unknown>).product_id as string)
                    .eq("is_active", true)
                    .single();

                if (prod) return { data: prod as unknown as Product, error: null };
            }

            // 4. Check alternate_barcodes array
            const { data: altProduct } = await getClient()
                .from("products")
                .select("*")
                .eq("store_id", storeId)
                .contains("alternate_barcodes", [barcode])
                .eq("is_active", true)
                .maybeSingle();

            if (altProduct) return { data: altProduct as unknown as Product, error: null };

            return { data: null, error: "Product not found for barcode" };
        } catch {
            return { data: null, error: "Failed to lookup barcode" };
        }
    },

    // ========================================================================
    // PRODUCT VARIANTS
    // ========================================================================

    getVariants: async (productId: string): Promise<ServiceResponse<ProductVariant[]>> => {
        try {
            const { data, error } = await getClient()
                .from("product_variants")
                .select("*")
                .eq("product_id", productId)
                .order("created_at", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as ProductVariant[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch variants" };
        }
    },

    createVariant: async (
        storeId: string,
        data: CreateProductVariantRequest
    ): Promise<ServiceResponse<ProductVariant>> => {
        try {
            const { data: variant, error } = await getClient()
                .from("product_variants")
                .insert({
                    ...data,
                    store_id: storeId,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: variant as unknown as ProductVariant, error: null };
        } catch {
            return { data: null, error: "Failed to create variant" };
        }
    },

    updateVariant: async (
        storeId: string,
        variantId: string,
        data: UpdateProductVariantRequest
    ): Promise<ServiceResponse<ProductVariant>> => {
        try {
            const { data: existingVariant, error: existingVariantError } = await getClient()
                .from("product_variants")
                .select("product_id, mrp, selling_price")
                .eq("id", variantId)
                .eq("store_id", storeId)
                .maybeSingle();

            if (existingVariantError) {
                return { data: null, error: existingVariantError.message };
            }

            const { data: variant, error } = await getClient()
                .from("product_variants")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", variantId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            const previous = (existingVariant ?? {}) as {
                product_id?: string;
                mrp?: number | null;
                selling_price?: number | null;
            };

            if (previous.product_id) {
                const historyWrites: Array<Promise<ServiceResponse<PriceHistory>>> = [];

                if (
                    data.selling_price !== undefined &&
                    hasPriceChanged(previous.selling_price, data.selling_price)
                ) {
                    historyWrites.push(
                        productService.recordPriceChange(
                            storeId,
                            previous.product_id,
                            "SELLING",
                            normalizePrice(previous.selling_price),
                            data.selling_price,
                            "Variant selling price updated",
                            variantId
                        )
                    );
                }

                if (data.mrp !== undefined && hasPriceChanged(previous.mrp, data.mrp)) {
                    historyWrites.push(
                        productService.recordPriceChange(
                            storeId,
                            previous.product_id,
                            "MRP",
                            normalizePrice(previous.mrp),
                            data.mrp,
                            "Variant MRP updated",
                            variantId
                        )
                    );
                }

                if (historyWrites.length > 0) {
                    await Promise.all(historyWrites);
                }
            }

            return { data: variant as unknown as ProductVariant, error: null };
        } catch {
            return { data: null, error: "Failed to update variant" };
        }
    },

    deleteVariant: async (
        storeId: string,
        variantId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("product_variants")
                .delete()
                .eq("id", variantId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete variant" };
        }
    },

    // ========================================================================
    // PRODUCT BARCODES
    // ========================================================================

    getBarcodes: async (productId: string): Promise<ServiceResponse<ProductBarcode[]>> => {
        try {
            const { data, error } = await getClient()
                .from("product_barcodes")
                .select("*")
                .eq("product_id", productId)
                .order("is_primary", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as ProductBarcode[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch barcodes" };
        }
    },

    createBarcode: async (
        storeId: string,
        data: CreateProductBarcodeRequest
    ): Promise<ServiceResponse<ProductBarcode>> => {
        try {
            const { data: barcode, error } = await getClient()
                .from("product_barcodes")
                .insert({
                    ...data,
                    store_id: storeId,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: barcode as unknown as ProductBarcode, error: null };
        } catch {
            return { data: null, error: "Failed to create barcode" };
        }
    },

    updateBarcode: async (
        storeId: string,
        barcodeId: string,
        data: UpdateProductBarcodeRequest
    ): Promise<ServiceResponse<ProductBarcode>> => {
        try {
            const { data: barcode, error } = await getClient()
                .from("product_barcodes")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", barcodeId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: barcode as unknown as ProductBarcode, error: null };
        } catch {
            return { data: null, error: "Failed to update barcode" };
        }
    },

    deleteBarcode: async (
        storeId: string,
        barcodeId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("product_barcodes")
                .delete()
                .eq("id", barcodeId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete barcode" };
        }
    },

    // ========================================================================
    // CATEGORIES
    // ========================================================================

    getCategories: async (
        storeId: string,
        filters?: CategoryFilters
    ): Promise<ServiceResponse<Category[]>> => {
        try {
            let query = getClient()
                .from("categories")
                .select("*")
                .eq("store_id", storeId);

            if (filters) {
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.level != null) {
                    query = query.eq("level", filters.level);
                }
                if (filters.parent_id !== undefined) {
                    if (filters.parent_id === null) {
                        query = query.is("parent_id", null);
                    } else {
                        query = query.eq("parent_id", filters.parent_id);
                    }
                }
                if (filters.search) {
                    query = query.or(
                        `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
                    );
                }
            }

            query = query.order("sort_order", { ascending: true }).order("name", { ascending: true });

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as Category[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch categories" };
        }
    },

    getCategoryById: async (
        storeId: string,
        categoryId: string
    ): Promise<ServiceResponse<EnrichedCategory>> => {
        try {
            const { data: category, error } = await getClient()
                .from("categories")
                .select("*")
                .eq("id", categoryId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!category) return { data: null, error: "Category not found" };

            // Get children
            const { data: children } = await getClient()
                .from("categories")
                .select("*")
                .eq("parent_id", categoryId)
                .order("sort_order", { ascending: true });

            // Get product count
            const { count } = await getClient()
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("category_id", categoryId);

            const enriched: EnrichedCategory = {
                ...(category as unknown as Category),
                children: (children ?? []) as unknown as Category[],
                product_count: count ?? 0,
            };

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch category" };
        }
    },

    createCategory: async (
        storeId: string,
        data: CreateCategoryRequest
    ): Promise<ServiceResponse<Category>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            // Determine level and path
            let level = 1;
            let path = `/${data.name}`;

            if (data.parent_id) {
                const { data: parent } = await getClient()
                    .from("categories")
                    .select("level, path, name")
                    .eq("id", data.parent_id)
                    .single();

                if (parent) {
                    const parentData = parent as Record<string, unknown>;
                    level = (parentData.level as number) + 1;
                    path = `${parentData.path}/${data.name}`;
                }
            }

            const { data: category, error } = await getClient()
                .from("categories")
                .insert({
                    ...data,
                    store_id: storeId,
                    level,
                    path,
                    created_by: user?.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };

            // If parent exists, mark it as non-leaf
            if (data.parent_id) {
                await getClient()
                    .from("categories")
                    .update({ is_leaf: false } as never)
                    .eq("id", data.parent_id);
            }

            return { data: category as unknown as Category, error: null };
        } catch {
            return { data: null, error: "Failed to create category" };
        }
    },

    updateCategory: async (
        storeId: string,
        categoryId: string,
        data: UpdateCategoryRequest
    ): Promise<ServiceResponse<Category>> => {
        try {
            const updatePayload: Record<string, unknown> = {
                ...data,
                updated_at: new Date().toISOString(),
            };

            // Recalculate path if name changed
            if (data.name) {
                const { data: current } = await getClient()
                    .from("categories")
                    .select("parent_id, path")
                    .eq("id", categoryId)
                    .single();

                if (current) {
                    const currentData = current as Record<string, unknown>;
                    if (currentData.parent_id) {
                        const { data: parent } = await getClient()
                            .from("categories")
                            .select("path")
                            .eq("id", currentData.parent_id as string)
                            .single();

                        if (parent) {
                            updatePayload.path = `${(parent as Record<string, unknown>).path}/${data.name}`;
                        }
                    } else {
                        updatePayload.path = `/${data.name}`;
                    }
                }
            }

            const { data: category, error } = await getClient()
                .from("categories")
                .update(updatePayload as never)
                .eq("id", categoryId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: category as unknown as Category, error: null };
        } catch {
            return { data: null, error: "Failed to update category" };
        }
    },

    deleteCategory: async (
        storeId: string,
        categoryId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("categories")
                .delete()
                .eq("id", categoryId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete category" };
        }
    },

    // ========================================================================
    // UNITS OF MEASURE
    // ========================================================================

    getUnits: async (storeId: string): Promise<ServiceResponse<UnitOfMeasure[]>> => {
        try {
            const { data, error } = await getClient()
                .from("units_of_measure")
                .select("*")
                .eq("store_id", storeId)
                .order("category", { ascending: true })
                .order("name", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as UnitOfMeasure[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch units" };
        }
    },

    createUnit: async (
        storeId: string,
        data: CreateUnitRequest
    ): Promise<ServiceResponse<UnitOfMeasure>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const { data: unit, error } = await getClient()
                .from("units_of_measure")
                .insert({
                    ...data,
                    store_id: storeId,
                    created_by: user?.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: unit as unknown as UnitOfMeasure, error: null };
        } catch {
            return { data: null, error: "Failed to create unit" };
        }
    },

    updateUnit: async (
        storeId: string,
        unitId: string,
        data: UpdateUnitRequest
    ): Promise<ServiceResponse<UnitOfMeasure>> => {
        try {
            const { data: unit, error } = await getClient()
                .from("units_of_measure")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", unitId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: unit as unknown as UnitOfMeasure, error: null };
        } catch {
            return { data: null, error: "Failed to update unit" };
        }
    },

    deleteUnit: async (
        storeId: string,
        unitId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("units_of_measure")
                .delete()
                .eq("id", unitId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete unit" };
        }
    },

    // ========================================================================
    // INVENTORY
    // ========================================================================

    getInventory: async (
        storeId: string,
        filters?: InventoryFilters
    ): Promise<ServiceResponse<EnrichedInventory[]>> => {
        try {
            let query = getClient()
                .from("inventory")
                .select(`
                    *,
                    products:product_id (id, name, product_code, barcode, unit_id, primary_image),
                    product_variants:variant_id (id, name, variant_code)
                `)
                .eq("store_id", storeId);

            if (filters) {
                if (filters.product_id) {
                    query = query.eq("product_id", filters.product_id);
                }
                if (filters.warehouse) {
                    query = query.eq("warehouse", filters.warehouse);
                }
                if (filters.location) {
                    query = query.eq("location", filters.location);
                }
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.low_stock_only) {
                    query = query.lte("quantity_on_hand", "reorder_point" as never);
                    query = query.gt("quantity_on_hand", 0);
                }
                if (filters.out_of_stock_only) {
                    query = query.lte("quantity_on_hand", 0);
                }
            }

            query = query.order("last_updated_at", { ascending: false });

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };

            const enriched = (data ?? []).map((row: Record<string, unknown>) => ({
                ...(row as unknown as Inventory),
                product: row.products as unknown as EnrichedInventory["product"],
                variant: row.product_variants as unknown as EnrichedInventory["variant"],
            }));

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch inventory" };
        }
    },

    getInventoryByProduct: async (
        storeId: string,
        productId: string
    ): Promise<ServiceResponse<Inventory>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory")
                .select("*")
                .eq("store_id", storeId)
                .eq("product_id", productId)
                .is("variant_id", null)
                .maybeSingle();

            if (error) return { data: null, error: error.message };
            return { data: data as unknown as Inventory | null, error: null };
        } catch {
            return { data: null, error: "Failed to fetch inventory for product" };
        }
    },

    updateInventory: async (
        storeId: string,
        inventoryId: string,
        data: UpdateInventoryRequest
    ): Promise<ServiceResponse<Inventory>> => {
        try {
            const { data: inventory, error } = await getClient()
                .from("inventory")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", inventoryId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: inventory as unknown as Inventory, error: null };
        } catch {
            return { data: null, error: "Failed to update inventory" };
        }
    },

    // ========================================================================
    // INVENTORY TRANSACTIONS (Stock Adjustments)
    // ========================================================================

    getTransactions: async (
        storeId: string,
        filters?: InventoryTransactionFilters
    ): Promise<ServiceResponse<InventoryTransaction[]>> => {
        try {
            let query = getClient()
                .from("inventory_transactions")
                .select("*")
                .eq("store_id", storeId);

            if (filters) {
                if (filters.product_id) {
                    query = query.eq("product_id", filters.product_id);
                }
                if (filters.variant_id) {
                    query = query.eq("variant_id", filters.variant_id);
                }
                if (filters.transaction_type) {
                    query = query.eq("transaction_type", filters.transaction_type);
                }
                if (filters.reference_type) {
                    query = query.eq("reference_type", filters.reference_type);
                }
                if (filters.date_from) {
                    query = query.gte("transaction_date", filters.date_from);
                }
                if (filters.date_to) {
                    query = query.lte("transaction_date", filters.date_to);
                }
            }

            query = query.order("transaction_date", { ascending: false }).limit(200);

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as InventoryTransaction[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch transactions" };
        }
    },

    /**
     * Create a stock adjustment (this triggers the inventory update via DB trigger)
     */
    createStockAdjustment: async (
        storeId: string,
        data: StockAdjustmentRequest
    ): Promise<ServiceResponse<InventoryTransaction>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            // Get current inventory for previous_quantity tracking
            const baseInvQuery = getClient()
                .from("inventory")
                .select("quantity_on_hand")
                .eq("store_id", storeId)
                .eq("product_id", data.product_id);

            const { data: currentInv } = await (
                data.variant_id
                    ? baseInvQuery.eq("variant_id", data.variant_id)
                    : baseInvQuery.is("variant_id", null)
            ).maybeSingle();

            const previousQty = (currentInv as Record<string, unknown> | null)?.quantity_on_hand as number ?? 0;

            let newQty: number;
            if (data.transaction_type === "ADJUSTMENT") {
                newQty = data.quantity; // For adjustments, quantity IS the new quantity
            } else if (["PURCHASE", "RETURN", "TRANSFER_IN"].includes(data.transaction_type)) {
                newQty = previousQty + data.quantity;
            } else {
                newQty = previousQty - data.quantity;
            }

            const totalCost = data.unit_cost ? data.quantity * data.unit_cost : null;

            const { data: transaction, error } = await getClient()
                .from("inventory_transactions")
                .insert({
                    ...data,
                    store_id: storeId,
                    transaction_date: new Date().toISOString(),
                    previous_quantity: previousQty,
                    new_quantity: newQty,
                    total_cost: totalCost,
                    performed_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: transaction as unknown as InventoryTransaction, error: null };
        } catch {
            return { data: null, error: "Failed to create stock adjustment" };
        }
    },

    // ========================================================================
    // PRODUCT BATCHES
    // ========================================================================

    getBatches: async (
        storeId: string,
        productId?: string
    ): Promise<ServiceResponse<ProductBatch[]>> => {
        try {
            let query = getClient()
                .from("product_batches")
                .select("*")
                .eq("store_id", storeId);

            if (productId) {
                query = query.eq("product_id", productId);
            }

            query = query.order("expiry_date", { ascending: true });

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as ProductBatch[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch batches" };
        }
    },

    createBatch: async (
        storeId: string,
        data: CreateProductBatchRequest
    ): Promise<ServiceResponse<ProductBatch>> => {
        try {
            const { data: batch, error } = await getClient()
                .from("product_batches")
                .insert({
                    ...data,
                    store_id: storeId,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: batch as unknown as ProductBatch, error: null };
        } catch {
            return { data: null, error: "Failed to create batch" };
        }
    },

    updateBatch: async (
        storeId: string,
        batchId: string,
        data: UpdateProductBatchRequest
    ): Promise<ServiceResponse<ProductBatch>> => {
        try {
            const { data: batch, error } = await getClient()
                .from("product_batches")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", batchId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: batch as unknown as ProductBatch, error: null };
        } catch {
            return { data: null, error: "Failed to update batch" };
        }
    },

    deleteBatch: async (
        storeId: string,
        batchId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("product_batches")
                .delete()
                .eq("id", batchId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete batch" };
        }
    },

    /**
     * Get expiring batches (within given days)
     */
    getExpiringBatches: async (
        storeId: string,
        withinDays = 30
    ): Promise<ServiceResponse<ProductBatch[]>> => {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + withinDays);

            const { data, error } = await getClient()
                .from("product_batches")
                .select("*")
                .eq("store_id", storeId)
                .eq("is_active", true)
                .gt("current_quantity", 0)
                .lte("expiry_date", futureDate.toISOString().split("T")[0])
                .order("expiry_date", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as ProductBatch[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch expiring batches" };
        }
    },

    // ========================================================================
    // SUPPLIER PRODUCTS
    // ========================================================================

    getSupplierProducts: async (
        storeId: string,
        productId?: string,
        supplierId?: string
    ): Promise<ServiceResponse<SupplierProduct[]>> => {
        try {
            let query = getClient()
                .from("supplier_products")
                .select("*")
                .eq("store_id", storeId);

            if (productId) {
                query = query.eq("product_id", productId);
            }
            if (supplierId) {
                query = query.eq("supplier_id", supplierId);
            }

            query = query.order("is_preferred", { ascending: false });

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as SupplierProduct[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch supplier products" };
        }
    },

    createSupplierProduct: async (
        storeId: string,
        data: CreateSupplierProductRequest
    ): Promise<ServiceResponse<SupplierProduct>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const { data: sp, error } = await getClient()
                .from("supplier_products")
                .insert({
                    ...data,
                    store_id: storeId,
                    created_by: user?.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sp as unknown as SupplierProduct, error: null };
        } catch {
            return { data: null, error: "Failed to create supplier product" };
        }
    },

    updateSupplierProduct: async (
        storeId: string,
        spId: string,
        data: UpdateSupplierProductRequest
    ): Promise<ServiceResponse<SupplierProduct>> => {
        try {
            const { data: sp, error } = await getClient()
                .from("supplier_products")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", spId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sp as unknown as SupplierProduct, error: null };
        } catch {
            return { data: null, error: "Failed to update supplier product" };
        }
    },

    deleteSupplierProduct: async (
        storeId: string,
        spId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("supplier_products")
                .delete()
                .eq("id", spId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete supplier product" };
        }
    },

    // ========================================================================
    // PRICE HISTORY
    // ========================================================================

    getPriceHistory: async (
        storeId: string,
        productId: string,
        variantId?: string
    ): Promise<ServiceResponse<PriceHistory[]>> => {
        try {
            let query = getClient()
                .from("price_history")
                .select("*")
                .eq("store_id", storeId)
                .eq("product_id", productId);

            if (variantId) {
                query = query.eq("variant_id", variantId);
            }

            query = query.order("effective_from", { ascending: false }).limit(100);

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as PriceHistory[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch price history" };
        }
    },

    /**
     * Record a price change (called automatically when product price updates)
     */
    recordPriceChange: async (
        storeId: string,
        productId: string,
        priceType: string,
        oldPrice: number | null,
        newPrice: number,
        reason?: string,
        variantId?: string
    ): Promise<ServiceResponse<PriceHistory>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const { data, error } = await getClient()
                .from("price_history")
                .insert({
                    store_id: storeId,
                    product_id: productId,
                    variant_id: variantId ?? null,
                    price_type: priceType,
                    old_price: oldPrice,
                    new_price: newPrice,
                    reason: reason ?? null,
                    changed_by: user?.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: data as unknown as PriceHistory, error: null };
        } catch {
            return { data: null, error: "Failed to record price change" };
        }
    },

    // ========================================================================
    // STOCK ALERTS
    // ========================================================================

    getStockAlerts: async (
        storeId: string,
        filters?: StockAlertFilters
    ): Promise<ServiceResponse<EnrichedStockAlert[]>> => {
        try {
            let query = getClient()
                .from("stock_alerts")
                .select(`
                    *,
                    products:product_id (id, name, product_code, barcode),
                    product_batches:batch_id (id, batch_number, expiry_date)
                `)
                .eq("store_id", storeId);

            if (filters) {
                if (filters.alert_type) {
                    query = query.eq("alert_type", filters.alert_type);
                }
                if (filters.severity) {
                    query = query.eq("severity", filters.severity);
                }
                if (filters.is_resolved !== undefined) {
                    query = query.eq("is_resolved", filters.is_resolved);
                }
            }

            query = query.order("created_at", { ascending: false });

            const { data, error } = await query;

            if (error) return { data: null, error: error.message };

            const enriched = (data ?? []).map((row: Record<string, unknown>) => ({
                ...(row as unknown as StockAlert),
                product: row.products as unknown as EnrichedStockAlert["product"],
                batch: row.product_batches as unknown as EnrichedStockAlert["batch"],
            }));

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch stock alerts" };
        }
    },

    resolveStockAlert: async (
        storeId: string,
        alertId: string,
        data?: ResolveStockAlertRequest
    ): Promise<ServiceResponse<StockAlert>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;

            const { data: alert, error } = await getClient()
                .from("stock_alerts")
                .update({
                    is_resolved: true,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user?.id,
                    resolution_notes: data?.resolution_notes ?? null,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", alertId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: alert as unknown as StockAlert, error: null };
        } catch {
            return { data: null, error: "Failed to resolve alert" };
        }
    },

    // ========================================================================
    // STATISTICS / DASHBOARD
    // ========================================================================

    getDashboardStats: async (
        storeId: string
    ): Promise<ServiceResponse<ProductDashboardStats>> => {
        try {
            // Fetch counts in parallel
            const [productsRes, categoriesRes, inventoryRes, alertsRes, batchesRes] =
                await Promise.all([
                    getClient()
                        .from("products")
                        .select("id, is_active, category_id, brand, gst_percentage", { count: "exact" })
                        .eq("store_id", storeId),
                    getClient()
                        .from("categories")
                        .select("id", { count: "exact", head: true })
                        .eq("store_id", storeId)
                        .eq("is_active", true),
                    getClient()
                        .from("inventory")
                        .select("quantity_on_hand, reorder_point, total_value")
                        .eq("store_id", storeId)
                        .eq("is_active", true),
                    getClient()
                        .from("stock_alerts")
                        .select("id", { count: "exact", head: true })
                        .eq("store_id", storeId)
                        .eq("is_resolved", false),
                    getClient()
                        .from("product_batches")
                        .select("expiry_date, current_quantity")
                        .eq("store_id", storeId)
                        .eq("is_active", true)
                        .gt("current_quantity", 0),
                ]);

            const products = (productsRes.data ?? []) as Array<Record<string, unknown>>;
            const inventoryData = (inventoryRes.data ?? []) as Array<Record<string, unknown>>;
            const batchData = (batchesRes.data ?? []) as Array<Record<string, unknown>>;

            const totalProducts = products.length;
            const activeProducts = products.filter((p) => p.is_active).length;
            const brands = new Set(products.map((p) => p.brand).filter(Boolean));

            let totalValue = 0;
            let lowStock = 0;
            let outOfStock = 0;

            for (const inv of inventoryData) {
                totalValue += (inv.total_value as number) ?? 0;
                const qty = (inv.quantity_on_hand as number) ?? 0;
                const reorder = (inv.reorder_point as number) ?? 0;
                if (qty <= 0) outOfStock++;
                else if (qty <= reorder) lowStock++;
            }

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const expiringSoon = batchData.filter((b) => {
                const expiry = new Date(b.expiry_date as string);
                return expiry <= thirtyDaysFromNow && expiry >= new Date();
            }).length;

            // Products by GST
            const gstMap = new Map<number, number>();
            for (const p of products) {
                const gst = (p.gst_percentage as number) ?? 0;
                gstMap.set(gst, (gstMap.get(gst) ?? 0) + 1);
            }

            const stats: ProductDashboardStats = {
                total_products: totalProducts,
                active_products: activeProducts,
                inactive_products: totalProducts - activeProducts,
                total_categories: categoriesRes.count ?? 0,
                total_brands: brands.size,
                total_inventory_value: Math.round(totalValue * 100) / 100,
                low_stock_count: lowStock,
                out_of_stock_count: outOfStock,
                expiring_soon_count: expiringSoon,
                unresolved_alerts: alertsRes.count ?? 0,
                products_by_category: [],
                products_by_gst: Array.from(gstMap.entries())
                    .map(([gst_percentage, count]) => ({ gst_percentage, count }))
                    .sort((a, b) => a.gst_percentage - b.gst_percentage),
            };

            return { data: stats, error: null };
        } catch {
            return { data: null, error: "Failed to fetch dashboard stats" };
        }
    },

    getInventorySummary: async (
        storeId: string
    ): Promise<ServiceResponse<InventorySummary>> => {
        try {
            const { data, error } = await getClient()
                .from("inventory")
                .select("quantity_on_hand, quantity_in_transit, reorder_point, maximum_stock, total_value")
                .eq("store_id", storeId)
                .eq("is_active", true);

            if (error) return { data: null, error: error.message };

            const rows = (data ?? []) as Array<Record<string, unknown>>;

            const summary: InventorySummary = {
                total_items: rows.length,
                total_value: 0,
                low_stock_items: 0,
                out_of_stock_items: 0,
                overstock_items: 0,
                in_transit_items: 0,
            };

            for (const row of rows) {
                const onHand = (row.quantity_on_hand as number) ?? 0;
                const inTransit = (row.quantity_in_transit as number) ?? 0;
                const reorderPoint = (row.reorder_point as number) ?? 0;
                const maxStock = (row.maximum_stock as number) ?? Infinity;
                const value = (row.total_value as number) ?? 0;

                summary.total_value += value;
                if (onHand <= 0) summary.out_of_stock_items++;
                else if (onHand <= reorderPoint) summary.low_stock_items++;
                if (maxStock !== Infinity && onHand > maxStock) summary.overstock_items++;
                if (inTransit > 0) summary.in_transit_items++;
            }

            summary.total_value = Math.round(summary.total_value * 100) / 100;

            return { data: summary, error: null };
        } catch {
            return { data: null, error: "Failed to fetch inventory summary" };
        }
    },

    // ========================================================================
    // UTILITY QUERIES
    // ========================================================================

    /**
     * Check if product code is unique in the store
     */
    isProductCodeUnique: async (
        storeId: string,
        productCode: string,
        excludeId?: string
    ): Promise<ServiceResponse<boolean>> => {
        try {
            let query = getClient()
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("product_code", productCode);

            if (excludeId) {
                query = query.neq("id", excludeId);
            }

            const { count, error } = await query;
            if (error) return { data: null, error: error.message };
            return { data: (count ?? 0) === 0, error: null };
        } catch {
            return { data: null, error: "Failed to check product code uniqueness" };
        }
    },

    /**
     * Check if barcode is unique in the store
     */
    isBarcodeUnique: async (
        storeId: string,
        barcode: string,
        excludeId?: string
    ): Promise<ServiceResponse<boolean>> => {
        try {
            let query = getClient()
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("barcode", barcode);

            if (excludeId) {
                query = query.neq("id", excludeId);
            }

            const { count, error } = await query;
            if (error) return { data: null, error: error.message };
            return { data: (count ?? 0) === 0, error: null };
        } catch {
            return { data: null, error: "Failed to check barcode uniqueness" };
        }
    },

    /**
     * Get unique brands for the store
     */
    getBrands: async (storeId: string): Promise<ServiceResponse<string[]>> => {
        try {
            const { data, error } = await getClient()
                .from("products")
                .select("brand")
                .eq("store_id", storeId)
                .not("brand", "is", null)
                .order("brand", { ascending: true });

            if (error) return { data: null, error: error.message };

            const brands = [
                ...new Set(
                    (data ?? [])
                        .map((row: Record<string, unknown>) => row.brand as string)
                        .filter(Boolean)
                ),
            ];

            return { data: brands, error: null };
        } catch {
            return { data: null, error: "Failed to fetch brands" };
        }
    },

    /**
     * Get low stock products
     */
    getLowStockProducts: async (
        storeId: string
    ): Promise<ServiceResponse<EnrichedInventory[]>> => {
        return productService.getInventory(storeId, { low_stock_only: true, is_active: true });
    },

    /**
     * Get out of stock products
     */
    getOutOfStockProducts: async (
        storeId: string
    ): Promise<ServiceResponse<EnrichedInventory[]>> => {
        return productService.getInventory(storeId, { out_of_stock_only: true, is_active: true });
    },
};
