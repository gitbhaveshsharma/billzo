"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../_context/store-admin-context";
import { useProductStore } from "@/stores/product.store";
import {
    ProductTable,
    ProductToolbar,
    ProductStats,
    ProductPagination,
    AddProductDialog,
    EditProductDialog,
    ProductDetailSheet,
    DeleteProductDialog,
    type ProductAction,
} from "../../_components/products";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    Product,
    EnrichedProduct,
    CreateProductRequest,
    UpdateProductRequest,
    ProductFilters,
    ProductPagination as ProductPaginationType,
} from "@/types/product.types";

// ============================================================================
// PRODUCTS PAGE
// ============================================================================

export default function ProductsPage() {
    const { storeId, isLoading: contextLoading } = useStoreAdmin();

    const {
        products,
        currentProduct,
        categories,
        units,
        dashboardStats,
        filters,
        pagination,
        totalProducts,
        totalPages,
        isLoading,
        selectedProductIds,
        fetchProducts,
        fetchProductById,
        fetchDashboardStats,
        fetchCategories,
        fetchUnits,
        createProduct,
        updateProduct,
        deleteProduct,
        toggleProductActive,
        setFilters,
        setPagination,
        setSelectedProductIds,
        toggleProductSelection,
        clearSelection,
    } = useProductStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    const filtersKey = JSON.stringify(filters);
    const paginationPage = pagination.page;
    const paginationLimit = pagination.limit;
    const paginationSortBy = pagination.sort_by;
    const paginationSortOrder = pagination.sort_order;

    useEffect(() => {
        if (storeId) {
            fetchProducts(storeId, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

    useEffect(() => {
        if (storeId) {
            fetchDashboardStats(storeId);
        }
    }, [storeId, fetchDashboardStats]);

    useEffect(() => {
        if (storeId) {
            fetchCategories(storeId);
        }
    }, [storeId, fetchCategories]);

    useEffect(() => {
        if (storeId) {
            fetchUnits(storeId);
        }
    }, [storeId, fetchUnits]);

    // ========================================================================
    // ACTION HANDLERS
    // ========================================================================

    const handleAction = useCallback(
        (action: ProductAction, product: Product) => {
            setSelectedProduct(product);

            switch (action) {
                case "view":
                    if (storeId) {
                        fetchProductById(storeId, product.id);
                    }
                    setDetailSheetOpen(true);
                    break;
                case "edit":
                    setEditDialogOpen(true);
                    break;
                case "toggle-active":
                    handleToggleActive(product);
                    break;
                case "delete":
                    setDeleteDialogOpen(true);
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storeId]
    );

    const handleToggleActive = async (product: Product) => {
        if (!storeId) return;
        const newState = !product.is_active;
        const toastId = toast.loading(
            newState ? "Activating product..." : "Deactivating product..."
        );
        const success = await toggleProductActive(storeId, product.id, newState);
        if (success) {
            toast.success(
                newState
                    ? `${product.name} activated`
                    : `${product.name} deactivated`,
                { id: toastId }
            );
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to update product status", { id: toastId });
        }
    };

    // ========================================================================
    // CRUD HANDLERS
    // ========================================================================

    const handleAddProduct = async (data: CreateProductRequest): Promise<boolean> => {
        if (!storeId) return false;
        const result = await createProduct(storeId, data);
        if (result) {
            fetchDashboardStats(storeId);
            return true;
        }
        return false;
    };

    const handleUpdateProduct = async (
        productId: string,
        data: UpdateProductRequest
    ): Promise<boolean> => {
        if (!storeId) return false;
        const success = await updateProduct(storeId, productId, data);
        if (success) {
            fetchDashboardStats(storeId);
        }
        return success;
    };

    const handleDeleteProduct = async (productId: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Deleting product...");
        const success = await deleteProduct(storeId, productId);
        if (success) {
            toast.success("Product deleted", { id: toastId });
            fetchDashboardStats(storeId);
        } else {
            toast.error("Failed to delete product", { id: toastId });
        }
        return success;
    };

    // ========================================================================
    // SELECT HANDLERS
    // ========================================================================

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = products.map((p) => p.id);
            setSelectedProductIds(allIds);
        } else {
            clearSelection();
        }
    };

    // ========================================================================
    // FILTER & PAGINATION HANDLERS
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<ProductFilters>) => {
            setFilters(newFilters);
        },
        [setFilters]
    );

    const handlePaginationChange = useCallback(
        (newPagination: Partial<ProductPaginationType>) => {
            setPagination(newPagination);
        },
        [setPagination]
    );

    // ========================================================================
    // LOADING STATE
    // ========================================================================

    if (contextLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" text="Loading..." />
            </div>
        );
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Products</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your product catalog, inventory, and pricing.
                </p>
            </div>

            {/* Stats */}
            <ProductStats
                stats={dashboardStats}
                isLoading={isLoading && !products.length}
            />

            {/* Toolbar */}
            <ProductToolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                selectedCount={selectedProductIds.length}
                onAddProduct={() => setAddDialogOpen(true)}
                products={products}
                categories={categories}
            />

            {/* Table */}
            <ProductTable
                products={products}
                categories={categories}
                isLoading={isLoading}
                selectedIds={selectedProductIds}
                onToggleSelect={toggleProductSelection}
                onSelectAll={handleSelectAll}
                onAction={handleAction}
            />

            {/* Pagination */}
            <ProductPagination
                pagination={pagination}
                totalProducts={totalProducts}
                totalPages={totalPages}
                onPaginationChange={handlePaginationChange}
            />

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            {/* Add Product */}
            <AddProductDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                storeId={storeId!}
                onSubmit={handleAddProduct}
                categories={categories}
                units={units}
            />

            {/* Edit Product */}
            <EditProductDialog
                product={selectedProduct}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                storeId={storeId!}
                onSubmit={handleUpdateProduct}
                categories={categories}
                units={units}
            />

            {/* View Product Detail */}
            {currentProduct && (
                <ProductDetailSheet
                    product={currentProduct}
                    open={detailSheetOpen}
                    onOpenChange={setDetailSheetOpen}
                    storeId={storeId!}
                    categories={categories}
                    units={units}
                />
            )}

            {/* Delete Product */}
            <DeleteProductDialog
                product={selectedProduct}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteProduct}
            />
        </div>
    );
}
