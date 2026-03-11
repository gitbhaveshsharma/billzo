"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import {
  InventoryTable,
  InventoryToolbar,
  InventoryPagination as InventoryPaginationComponent,
  StockTransferDialog,
  type InventoryAction,
} from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  EnrichedInventoryRecord,
  CreateStockTransferRequest,
  InventoryFilters,
} from "@/types/inventory.types";

// ============================================================================
// INVENTORY MANAGER — STOCK TRANSFER PAGE
// ============================================================================

export default function StockTransferPage() {
  const { storeId } = useInventory();

  const {
    items,
    totalItems,
    totalPages,
    inventoryFilters,
    inventoryPagination,
    selectedItemIds,
    isLoading,
    isSaving,
    fetchInventory,
    setInventoryFilters,
    setInventoryPagination,
    createStockTransfer,
    toggleItemSelection,
    setSelectedItemIds,
  } = useInventoryStore();

  // ── Dialog State ───────────────────────────────────────────────────────
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedInventoryRecord | null>(null);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchInventory(storeId);
  }, [storeId, inventoryFilters, inventoryPagination, fetchInventory]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleFiltersChange = useCallback(
    (filters: Partial<InventoryFilters>) => {
      setInventoryFilters(filters);
      setInventoryPagination({ page: 1 });
    },
    [setInventoryFilters, setInventoryPagination],
  );

  const handlePageChange = useCallback(
    (page: number) => setInventoryPagination({ page }),
    [setInventoryPagination],
  );

  const handlePageSizeChange = useCallback(
    (limit: number) => setInventoryPagination({ limit, page: 1 }),
    [setInventoryPagination],
  );

  const handleTransfer = useCallback(
    async (data: CreateStockTransferRequest): Promise<boolean> => {
      if (!storeId) return false;
      const result = await createStockTransfer(storeId, data);
      if (result) {
        toast.success("Stock transfer completed");
        fetchInventory(storeId, true);
        return true;
      }
      toast.error("Failed to complete transfer");
      return false;
    },
    [storeId, createStockTransfer, fetchInventory],
  );

  const handleAction = useCallback(
    (action: InventoryAction, item: EnrichedInventoryRecord) => {
      if (action === "transfer" || action === "adjust") {
        setSelectedItem(item);
        setTransferDialogOpen(true);
      }
    },
    [],
  );

  const handleSelectAll = useCallback(
    (ids: string[]) => setSelectedItemIds(ids),
    [setSelectedItemIds],
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Stock Transfer</h1>
          <InfoTooltip content="Move stock between locations within your store. Select an item then specify source and destination locations with the quantity to transfer." />
        </div>
        <p className="text-sm text-muted-foreground">
          Transfer inventory between locations. Select an item to initiate a transfer.
        </p>
      </div>

      {/* Toolbar */}
      <InventoryToolbar
        filters={inventoryFilters}
        items={items}
        onFiltersChange={handleFiltersChange}
        onAdjustment={() => {}}
        onTransfer={() => {
          setSelectedItem(null);
          setTransferDialogOpen(true);
        }}
        onStockCount={() => {}}
        isLoading={isLoading}
      />

      {/* Table */}
      <InventoryTable
        items={items}
        selectedIds={selectedItemIds}
        isLoading={isLoading}
        onToggleSelect={toggleItemSelection}
        onSelectAll={handleSelectAll}
        onAction={handleAction}
      />

      {/* Pagination */}
      <InventoryPaginationComponent
        page={inventoryPagination.page}
        totalPages={totalPages}
        limit={inventoryPagination.limit}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onLimitChange={handlePageSizeChange}
      />

      {/* Transfer Dialog */}
      <StockTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        item={selectedItem}
        onSubmit={handleTransfer}
        isSaving={isSaving}
      />
    </div>
  );
}
