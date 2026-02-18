"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStoreAdmin } from "../../_context/store-admin-context";
import { useSupplierStore } from "@/stores/supplier.store";
import {
    SupplierTable,
    SupplierToolbar,
    SupplierStats,
    SupplierPagination,
    AddSupplierDialog,
    EditSupplierDialog,
    SupplierDetailSheet,
    BlacklistSupplierDialog,
    DeleteSupplierDialog,
    type SupplierAction,
} from "../../_components/suppliers";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type {
    Supplier,
    CreateSupplierRequest,
    UpdateSupplierRequest,
    SupplierFilters,
    SupplierPagination as SupplierPaginationType,
} from "@/types/supplier.types";

// ============================================================================
// SUPPLIERS PAGE
// ============================================================================

export default function SuppliersPage() {
    const {
        storeId,
        isLoading: contextLoading,
    } = useStoreAdmin();

    const {
        suppliers,
        stats,
        filters,
        pagination,
        totalSuppliers,
        totalPages,
        isLoading,
        selectedSupplierIds,
        fetchSuppliers,
        fetchStats,
        createSupplier,
        updateSupplier,
        deleteSupplier,
        activateSupplier,
        deactivateSupplier,
        togglePreferred,
        blacklistSupplier,
        unblacklistSupplier,
        setFilters,
        setPagination,
        setSelectedSupplierIds,
        toggleSupplierSelection,
        clearSelection,
    } = useSupplierStore();

    // ========================================================================
    // DIALOG STATE
    // ========================================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailSheetOpen, setDetailSheetOpen] = useState(false);
    const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    // Serialize filter/pagination to primitive values to avoid infinite loops.
    // Zustand creates new object references on every set() call, so watching
    // `filters` / `pagination` objects directly would re-trigger on every fetch.
    const filtersKey = JSON.stringify(filters);
    const paginationPage = pagination.page;
    const paginationLimit = pagination.limit;
    const paginationSortBy = pagination.sort_by;
    const paginationSortOrder = pagination.sort_order;

    useEffect(() => {
        if (storeId) {
            fetchSuppliers(storeId, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

    useEffect(() => {
        if (storeId) {
            fetchStats(storeId);
        }
    }, [storeId, fetchStats]);

    // ========================================================================
    // ACTION HANDLERS
    // ========================================================================

    const handleAction = useCallback(
        (action: SupplierAction, supplier: Supplier) => {
            setSelectedSupplier(supplier);

            switch (action) {
                case "view":
                    setDetailSheetOpen(true);
                    break;
                case "edit":
                    setEditDialogOpen(true);
                    break;
                case "activate":
                    handleActivate(supplier);
                    break;
                case "deactivate":
                    handleDeactivate(supplier);
                    break;
                case "toggle-preferred":
                    handleTogglePreferred(supplier);
                    break;
                case "blacklist":
                    setBlacklistDialogOpen(true);
                    break;
                case "unblacklist":
                    handleUnblacklist(supplier);
                    break;
                case "delete":
                    setDeleteDialogOpen(true);
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storeId]
    );

    const handleActivate = async (supplier: Supplier) => {
        if (!storeId) return;
        const toastId = toast.loading("Activating supplier...");
        const success = await activateSupplier(storeId, supplier.id);
        if (success) {
            toast.success(`${supplier.name} activated`, { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to activate supplier", { id: toastId });
        }
    };

    const handleDeactivate = async (supplier: Supplier) => {
        if (!storeId) return;
        const toastId = toast.loading("Deactivating supplier...");
        const success = await deactivateSupplier(storeId, supplier.id);
        if (success) {
            toast.success(`${supplier.name} deactivated`, { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to deactivate supplier", { id: toastId });
        }
    };

    const handleTogglePreferred = async (supplier: Supplier) => {
        if (!storeId) return;
        const newState = !supplier.is_preferred;
        const toastId = toast.loading(
            newState ? "Marking as preferred..." : "Removing preferred status..."
        );
        const success = await togglePreferred(storeId, supplier.id, newState);
        if (success) {
            toast.success(
                newState
                    ? `${supplier.name} marked as preferred`
                    : `${supplier.name} removed from preferred`,
                { id: toastId }
            );
            fetchStats(storeId);
        } else {
            toast.error("Failed to update preferred status", { id: toastId });
        }
    };

    const handleUnblacklist = async (supplier: Supplier) => {
        if (!storeId) return;
        const toastId = toast.loading("Removing blacklist...");
        const success = await unblacklistSupplier(storeId, supplier.id);
        if (success) {
            toast.success(`${supplier.name} removed from blacklist`, { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to remove blacklist", { id: toastId });
        }
    };

    // ========================================================================
    // CRUD HANDLERS (passed to dialogs)
    // ========================================================================

    const handleAddSupplier = async (data: CreateSupplierRequest): Promise<boolean> => {
        if (!storeId) return false;
        const result = await createSupplier(storeId, data);
        if (result) {
            fetchStats(storeId);
            return true;
        }
        return false;
    };

    const handleUpdateSupplier = async (supplierId: string, data: UpdateSupplierRequest): Promise<boolean> => {
        if (!storeId) return false;
        const success = await updateSupplier(storeId, supplierId, data);
        if (success) {
            fetchStats(storeId);
        }
        return success;
    };

    const handleBlacklist = async (supplierId: string, reason: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Blacklisting supplier...");
        const success = await blacklistSupplier(storeId, supplierId, { reason });
        if (success) {
            toast.success("Supplier blacklisted", { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to blacklist supplier", { id: toastId });
        }
        return success;
    };

    const handleDeleteSupplier = async (supplierId: string): Promise<boolean> => {
        if (!storeId) return false;
        const toastId = toast.loading("Deleting supplier...");
        const success = await deleteSupplier(storeId, supplierId);
        if (success) {
            toast.success("Supplier deleted", { id: toastId });
            fetchStats(storeId);
        } else {
            toast.error("Failed to delete supplier", { id: toastId });
        }
        return success;
    };

    // ========================================================================
    // SELECT HANDLERS
    // ========================================================================

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = suppliers.map((s) => s.id);
            setSelectedSupplierIds(allIds);
        } else {
            clearSelection();
        }
    };

    // ========================================================================
    // FILTER & PAGINATION HANDLERS
    // ========================================================================

    const handleFiltersChange = useCallback(
        (newFilters: Partial<SupplierFilters>) => {
            setFilters(newFilters);
        },
        [setFilters]
    );

    const handlePaginationChange = useCallback(
        (newPagination: Partial<SupplierPaginationType>) => {
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
                <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your suppliers, distributors, and vendor relationships.
                </p>
            </div>

            {/* Stats */}
            <SupplierStats stats={stats} isLoading={isLoading && !suppliers.length} />

            {/* Toolbar */}
            <SupplierToolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                selectedCount={selectedSupplierIds.length}
                onAddSupplier={() => setAddDialogOpen(true)}
                suppliers={suppliers}
            />

            {/* Table */}
            <SupplierTable
                suppliers={suppliers}
                isLoading={isLoading}
                selectedIds={selectedSupplierIds}
                onToggleSelect={toggleSupplierSelection}
                onSelectAll={handleSelectAll}
                onAction={handleAction}
            />

            {/* Pagination */}
            <SupplierPagination
                pagination={pagination}
                totalSuppliers={totalSuppliers}
                totalPages={totalPages}
                onPaginationChange={handlePaginationChange}
            />

            {/* ============================================================ */}
            {/* DIALOGS & SHEETS */}
            {/* ============================================================ */}

            {/* Add Supplier */}
            <AddSupplierDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onSubmit={handleAddSupplier}
            />

            {/* Edit Supplier */}
            <EditSupplierDialog
                supplier={selectedSupplier}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSubmit={handleUpdateSupplier}
            />

            {/* View Supplier Detail */}
            <SupplierDetailSheet
                supplier={selectedSupplier}
                open={detailSheetOpen}
                onOpenChange={setDetailSheetOpen}
            />

            {/* Blacklist Supplier */}
            <BlacklistSupplierDialog
                supplier={selectedSupplier}
                open={blacklistDialogOpen}
                onOpenChange={setBlacklistDialogOpen}
                onConfirm={handleBlacklist}
            />

            {/* Delete Supplier */}
            <DeleteSupplierDialog
                supplier={selectedSupplier}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteSupplier}
            />
        </div>
    );
}
