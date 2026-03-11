"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
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
} from "@/app/store-admin/_components/suppliers";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierFilters,
  SupplierPagination as SupplierPaginationType,
} from "@/types/supplier.types";

// ============================================================================
// INVENTORY MANAGER — SUPPLIERS PAGE
// ============================================================================

export default function InventorySuppliersPage() {
  const { storeId } = useInventory();

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

  const filtersKey = JSON.stringify(filters);
  const paginationPage = pagination.page;
  const paginationLimit = pagination.limit;
  const paginationSortBy = pagination.sort_by;
  const paginationSortOrder = pagination.sort_order;

  useEffect(() => {
    if (storeId) fetchSuppliers(storeId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

  useEffect(() => {
    if (storeId) fetchStats(storeId);
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
  // CRUD HANDLERS
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
    if (success) fetchStats(storeId);
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
      setSelectedSupplierIds(suppliers.map((s) => s.id));
    } else {
      clearSelection();
    }
  };

  // ========================================================================
  // FILTER & PAGINATION
  // ========================================================================

  const handleFiltersChange = useCallback(
    (newFilters: Partial<SupplierFilters>) => setFilters(newFilters),
    [setFilters]
  );

  const handlePaginationChange = useCallback(
    (newPagination: Partial<SupplierPaginationType>) => setPagination(newPagination),
    [setPagination]
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <InfoTooltip content="Manage your suppliers and vendor relationships — add new suppliers, track GST details, set payment terms, and manage preferred/blacklisted status." />
        </div>
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
      {/* DIALOGS & SHEETS                                             */}
      {/* ============================================================ */}

      <AddSupplierDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddSupplier}
      />

      <EditSupplierDialog
        supplier={selectedSupplier}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdateSupplier}
      />

      <SupplierDetailSheet
        supplier={selectedSupplier}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      <BlacklistSupplierDialog
        supplier={selectedSupplier}
        open={blacklistDialogOpen}
        onOpenChange={setBlacklistDialogOpen}
        onConfirm={handleBlacklist}
      />

      <DeleteSupplierDialog
        supplier={selectedSupplier}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSupplier}
      />
    </div>
  );
}
