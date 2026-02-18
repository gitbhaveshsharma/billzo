import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse, PaginatedResponse } from "@/types/api.types";
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
    SupplierListResponse,
    SupplierStats,
    BlacklistSupplierRequest,
} from "@/types/supplier.types";

const getClient = () => createClient();

// ============================================================================
// SUPPLIER SERVICE
// All CRUD operations for suppliers, contacts, and supplier-products
// ============================================================================

export const supplierService = {
    // ========================================================================
    // SUPPLIER CRUD
    // ========================================================================

    /**
     * Create a new supplier for a store
     */
    create: async (
        storeId: string,
        data: CreateSupplierRequest
    ): Promise<ServiceResponse<Supplier>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data: supplier, error } = await getClient()
                .from("suppliers")
                .insert({
                    ...data,
                    store_id: storeId,
                    created_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: supplier as unknown as Supplier, error: null };
        } catch {
            return { data: null, error: "Failed to create supplier" };
        }
    },

    /**
     * Get a supplier by ID with contacts
     */
    getById: async (
        storeId: string,
        supplierId: string
    ): Promise<ServiceResponse<EnrichedSupplier>> => {
        try {
            const { data: supplier, error } = await getClient()
                .from("suppliers")
                .select(`
                    *,
                    supplier_contacts (*),
                    supplier_products (id)
                `)
                .eq("id", supplierId)
                .eq("store_id", storeId)
                .single();

            if (error) return { data: null, error: error.message };
            if (!supplier) return { data: null, error: "Supplier not found" };

            const enriched: EnrichedSupplier = {
                ...(supplier as unknown as Supplier),
                contacts: (supplier.supplier_contacts ?? []) as unknown as SupplierContact[],
                product_count: Array.isArray(supplier.supplier_products)
                    ? supplier.supplier_products.length
                    : 0,
            };

            return { data: enriched, error: null };
        } catch {
            return { data: null, error: "Failed to fetch supplier" };
        }
    },

    /**
     * Get paginated list of suppliers for a store with filters
     */
    getList: async (
        storeId: string,
        filters?: SupplierFilters,
        pagination?: SupplierPagination
    ): Promise<ServiceResponse<SupplierListResponse>> => {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sort_by ?? "created_at";
            const sortOrder = pagination?.sort_order ?? "desc";
            const offset = (page - 1) * limit;

            let query = getClient()
                .from("suppliers")
                .select("*", { count: "exact" })
                .eq("store_id", storeId);

            // Apply filters
            if (filters) {
                if (filters.type) {
                    query = query.eq("type", filters.type);
                }
                if (filters.is_active !== undefined) {
                    query = query.eq("is_active", filters.is_active);
                }
                if (filters.is_preferred !== undefined) {
                    query = query.eq("is_preferred", filters.is_preferred);
                }
                if (filters.blacklisted !== undefined) {
                    query = query.eq("blacklisted", filters.blacklisted);
                }
                if (filters.city) {
                    query = query.ilike("city", `%${filters.city}%`);
                }
                if (filters.state) {
                    query = query.ilike("state", `%${filters.state}%`);
                }
                if (filters.payment_terms) {
                    query = query.eq("payment_terms", filters.payment_terms);
                }
                if (filters.has_gstin === true) {
                    query = query.not("gstin", "is", null);
                } else if (filters.has_gstin === false) {
                    query = query.is("gstin", null);
                }
                if (filters.tags && filters.tags.length > 0) {
                    query = query.overlaps("tags", filters.tags);
                }
                if (filters.search) {
                    query = query.or(
                        `name.ilike.%${filters.search}%,` +
                        `supplier_code.ilike.%${filters.search}%,` +
                        `contact_person.ilike.%${filters.search}%,` +
                        `email.ilike.%${filters.search}%,` +
                        `phone.ilike.%${filters.search}%,` +
                        `city.ilike.%${filters.search}%,` +
                        `gstin.ilike.%${filters.search}%`
                    );
                }
            }

            // Apply sorting and pagination
            query = query
                .order(sortBy, { ascending: sortOrder === "asc" })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) return { data: null, error: error.message };

            const total = count ?? 0;
            const totalPages = Math.ceil(total / limit);

            return {
                data: {
                    suppliers: (data ?? []) as unknown as Supplier[],
                    total,
                    page,
                    limit,
                    total_pages: totalPages,
                },
                error: null,
            };
        } catch {
            return { data: null, error: "Failed to fetch suppliers" };
        }
    },

    /**
     * Update a supplier
     */
    update: async (
        storeId: string,
        supplierId: string,
        data: UpdateSupplierRequest
    ): Promise<ServiceResponse<Supplier>> => {
        try {
            const { data: supplier, error } = await getClient()
                .from("suppliers")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", supplierId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: supplier as unknown as Supplier, error: null };
        } catch {
            return { data: null, error: "Failed to update supplier" };
        }
    },

    /**
     * Delete a supplier (hard delete - use with caution)
     */
    delete: async (
        storeId: string,
        supplierId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("suppliers")
                .delete()
                .eq("id", supplierId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete supplier" };
        }
    },

    /**
     * Soft-delete: deactivate a supplier
     */
    deactivate: async (
        storeId: string,
        supplierId: string
    ): Promise<ServiceResponse<Supplier>> => {
        return supplierService.update(storeId, supplierId, { is_active: false });
    },

    /**
     * Reactivate a supplier
     */
    activate: async (
        storeId: string,
        supplierId: string
    ): Promise<ServiceResponse<Supplier>> => {
        return supplierService.update(storeId, supplierId, { is_active: true });
    },

    /**
     * Toggle preferred status
     */
    togglePreferred: async (
        storeId: string,
        supplierId: string,
        isPreferred: boolean
    ): Promise<ServiceResponse<Supplier>> => {
        return supplierService.update(storeId, supplierId, { is_preferred: isPreferred });
    },

    /**
     * Blacklist a supplier
     */
    blacklist: async (
        storeId: string,
        supplierId: string,
        request: BlacklistSupplierRequest
    ): Promise<ServiceResponse<Supplier>> => {
        return supplierService.update(storeId, supplierId, {
            blacklisted: true,
            blacklist_reason: request.reason,
            is_active: false,
        });
    },

    /**
     * Remove from blacklist
     */
    unblacklist: async (
        storeId: string,
        supplierId: string
    ): Promise<ServiceResponse<Supplier>> => {
        return supplierService.update(storeId, supplierId, {
            blacklisted: false,
            blacklist_reason: undefined,
            is_active: true,
        });
    },

    /**
     * Check if supplier code is unique within the store
     */
    isCodeUnique: async (
        storeId: string,
        supplierCode: string,
        excludeId?: string
    ): Promise<ServiceResponse<boolean>> => {
        try {
            let query = getClient()
                .from("suppliers")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("supplier_code", supplierCode);

            if (excludeId) {
                query = query.neq("id", excludeId);
            }

            const { count, error } = await query;

            if (error) return { data: null, error: error.message };
            return { data: (count ?? 0) === 0, error: null };
        } catch {
            return { data: null, error: "Failed to check supplier code uniqueness" };
        }
    },

    // ========================================================================
    // SUPPLIER STATISTICS
    // ========================================================================

    /**
     * Get supplier statistics for a store
     */
    getStats: async (storeId: string): Promise<ServiceResponse<SupplierStats>> => {
        try {
            const { data: suppliers, error } = await getClient()
                .from("suppliers")
                .select("type, payment_terms, gstin, is_active, is_preferred, blacklisted, credit_limit, credit_days")
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };

            const stats: SupplierStats = {
                total_suppliers: 0,
                active_suppliers: 0,
                inactive_suppliers: 0,
                preferred_suppliers: 0,
                blacklisted_suppliers: 0,
                by_type: { manufacturer: 0, distributor: 0, wholesaler: 0, retailer: 0 },
                by_payment_terms: {
                    immediate: 0,
                    "7_days": 0,
                    "15_days": 0,
                    "30_days": 0,
                    "45_days": 0,
                    "60_days": 0,
                },
                with_gstin: 0,
                without_gstin: 0,
                total_credit_limit: 0,
                average_credit_days: 0,
            };

            if (!suppliers) return { data: stats, error: null };

            let totalCreditDays = 0;
            let creditDaysCount = 0;

            stats.total_suppliers = suppliers.length;

            for (const s of suppliers) {
                if (s.is_active) stats.active_suppliers++;
                else stats.inactive_suppliers++;
                if (s.is_preferred) stats.preferred_suppliers++;
                if (s.blacklisted) stats.blacklisted_suppliers++;

                const sType = s.type as keyof typeof stats.by_type;
                if (sType in stats.by_type) stats.by_type[sType]++;

                const sPt = s.payment_terms as keyof typeof stats.by_payment_terms;
                if (sPt in stats.by_payment_terms) stats.by_payment_terms[sPt]++;

                if (s.gstin) stats.with_gstin++;
                else stats.without_gstin++;

                stats.total_credit_limit += Number(s.credit_limit) || 0;
                if (s.credit_days > 0) {
                    totalCreditDays += s.credit_days;
                    creditDaysCount++;
                }
            }

            stats.average_credit_days =
                creditDaysCount > 0 ? Math.round(totalCreditDays / creditDaysCount) : 0;

            return { data: stats, error: null };
        } catch {
            return { data: null, error: "Failed to fetch supplier statistics" };
        }
    },

    // ========================================================================
    // SUPPLIER CONTACTS CRUD
    // ========================================================================

    /**
     * Get all contacts for a supplier
     */
    getContacts: async (supplierId: string): Promise<ServiceResponse<SupplierContact[]>> => {
        try {
            const { data, error } = await getClient()
                .from("supplier_contacts")
                .select("*")
                .eq("supplier_id", supplierId)
                .order("is_primary", { ascending: false })
                .order("name", { ascending: true });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as SupplierContact[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch supplier contacts" };
        }
    },

    /**
     * Get a single contact by ID
     */
    getContactById: async (contactId: string): Promise<ServiceResponse<SupplierContact>> => {
        try {
            const { data, error } = await getClient()
                .from("supplier_contacts")
                .select("*")
                .eq("id", contactId)
                .single();

            if (error) return { data: null, error: error.message };
            return { data: data as unknown as SupplierContact, error: null };
        } catch {
            return { data: null, error: "Failed to fetch contact" };
        }
    },

    /**
     * Add a new contact to a supplier
     * If is_primary, unsets existing primary contacts first
     */
    addContact: async (
        supplierId: string,
        data: CreateSupplierContactRequest
    ): Promise<ServiceResponse<SupplierContact>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            // If marking as primary, unset existing primary contacts
            if (data.is_primary) {
                await getClient()
                    .from("supplier_contacts")
                    .update({ is_primary: false } as never)
                    .eq("supplier_id", supplierId)
                    .eq("is_primary", true);
            }

            const { data: contact, error } = await getClient()
                .from("supplier_contacts")
                .insert({
                    ...data,
                    supplier_id: supplierId,
                    created_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: contact as unknown as SupplierContact, error: null };
        } catch {
            return { data: null, error: "Failed to add contact" };
        }
    },

    /**
     * Update a supplier contact
     */
    updateContact: async (
        supplierId: string,
        contactId: string,
        data: UpdateSupplierContactRequest
    ): Promise<ServiceResponse<SupplierContact>> => {
        try {
            // If setting as primary, unset existing primary contacts
            if (data.is_primary) {
                await getClient()
                    .from("supplier_contacts")
                    .update({ is_primary: false } as never)
                    .eq("supplier_id", supplierId)
                    .eq("is_primary", true)
                    .neq("id", contactId);
            }

            const { data: contact, error } = await getClient()
                .from("supplier_contacts")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", contactId)
                .eq("supplier_id", supplierId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: contact as unknown as SupplierContact, error: null };
        } catch {
            return { data: null, error: "Failed to update contact" };
        }
    },

    /**
     * Delete a supplier contact
     */
    deleteContact: async (
        supplierId: string,
        contactId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("supplier_contacts")
                .delete()
                .eq("id", contactId)
                .eq("supplier_id", supplierId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to delete contact" };
        }
    },

    /**
     * Set a contact as primary (unsets others)
     */
    setPrimaryContact: async (
        supplierId: string,
        contactId: string
    ): Promise<ServiceResponse<SupplierContact>> => {
        try {
            // Unset all primary contacts for this supplier
            await getClient()
                .from("supplier_contacts")
                .update({ is_primary: false } as never)
                .eq("supplier_id", supplierId);

            // Set the target contact as primary
            const { data, error } = await getClient()
                .from("supplier_contacts")
                .update({ is_primary: true, updated_at: new Date().toISOString() } as never)
                .eq("id", contactId)
                .eq("supplier_id", supplierId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: data as unknown as SupplierContact, error: null };
        } catch {
            return { data: null, error: "Failed to set primary contact" };
        }
    },

    // ========================================================================
    // SUPPLIER PRODUCTS
    // ========================================================================

    /**
     * Get products linked to a supplier
     */
    getSupplierProducts: async (
        storeId: string,
        supplierId: string
    ): Promise<ServiceResponse<SupplierProduct[]>> => {
        try {
            const { data, error } = await getClient()
                .from("supplier_products")
                .select("*")
                .eq("supplier_id", supplierId)
                .eq("store_id", storeId)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as SupplierProduct[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch supplier products" };
        }
    },

    /**
     * Get all suppliers for a specific product
     */
    getProductSuppliers: async (
        storeId: string,
        productId: string
    ): Promise<ServiceResponse<SupplierProduct[]>> => {
        try {
            const { data, error } = await getClient()
                .from("supplier_products")
                .select(`
                    *,
                    suppliers:supplier_id (
                        id, name, supplier_code, type, is_preferred, is_active
                    )
                `)
                .eq("product_id", productId)
                .eq("store_id", storeId)
                .eq("is_active", true);

            if (error) return { data: null, error: error.message };
            return { data: (data ?? []) as unknown as SupplierProduct[], error: null };
        } catch {
            return { data: null, error: "Failed to fetch product suppliers" };
        }
    },

    /**
     * Link a product to a supplier
     */
    linkProduct: async (
        storeId: string,
        supplierId: string,
        data: {
            product_id: string;
            purchase_price: number;
            mrp?: number;
            discount_percentage?: number;
            lead_time_days?: number;
            minimum_order_quantity?: number;
            supplier_product_code?: string;
            supplier_product_name?: string;
            is_preferred?: boolean;
        }
    ): Promise<ServiceResponse<SupplierProduct>> => {
        try {
            const user = (await getClient().auth.getUser()).data.user;
            if (!user) return { data: null, error: "Not authenticated" };

            const { data: sp, error } = await getClient()
                .from("supplier_products")
                .insert({
                    ...data,
                    supplier_id: supplierId,
                    store_id: storeId,
                    created_by: user.id,
                } as never)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sp as unknown as SupplierProduct, error: null };
        } catch {
            return { data: null, error: "Failed to link product to supplier" };
        }
    },

    /**
     * Unlink a product from a supplier
     */
    unlinkProduct: async (
        storeId: string,
        supplierProductId: string
    ): Promise<ServiceResponse<null>> => {
        try {
            const { error } = await getClient()
                .from("supplier_products")
                .delete()
                .eq("id", supplierProductId)
                .eq("store_id", storeId);

            if (error) return { data: null, error: error.message };
            return { data: null, error: null };
        } catch {
            return { data: null, error: "Failed to unlink product" };
        }
    },

    /**
     * Update a supplier-product link (pricing, lead time, etc.)
     */
    updateSupplierProduct: async (
        storeId: string,
        supplierProductId: string,
        data: Partial<{
            purchase_price: number;
            mrp: number;
            discount_percentage: number;
            lead_time_days: number;
            minimum_order_quantity: number;
            supplier_product_code: string;
            supplier_product_name: string;
            is_preferred: boolean;
            is_active: boolean;
        }>
    ): Promise<ServiceResponse<SupplierProduct>> => {
        try {
            const { data: sp, error } = await getClient()
                .from("supplier_products")
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq("id", supplierProductId)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) return { data: null, error: error.message };
            return { data: sp as unknown as SupplierProduct, error: null };
        } catch {
            return { data: null, error: "Failed to update supplier product" };
        }
    },
};
