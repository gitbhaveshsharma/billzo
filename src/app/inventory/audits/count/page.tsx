"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Package } from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InventoryTable,
  InventoryToolbar,
  InventoryPagination as InventoryPaginationComponent,
  StockCountDialog,
} from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  StockCountItem,
  InventoryFilters,
} from "@/types/inventory.types";

// ============================================================================
// INVENTORY MANAGER — PHYSICAL COUNT PAGE
// ============================================================================

export default function PhysicalCountPage() {
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
    performStockCount,
    toggleItemSelection,
    setSelectedItemIds,
  } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleSelectAll = useCallback(
    (ids: string[]) => setSelectedItemIds(ids),
    [setSelectedItemIds],
  );

  const handleStockCount = useCallback(
    async (countItems: StockCountItem[], notes: string): Promise<boolean> => {
      if (!storeId) return false;
      try {
        const success = await performStockCount(storeId, {
          items: countItems,
          notes,
        });
        if (success) {
          toast.success("Stock count recorded successfully");
          fetchInventory(storeId, true);
        } else {
          toast.error("Failed to record stock count");
        }
        return success;
      } catch {
        toast.error("Failed to record stock count");
        return false;
      }
    },
    [storeId, performStockCount, fetchInventory],
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Physical Stock Count</h1>
            <InfoTooltip content="Physical count lets you verify actual stock on hand against system records. Select items, enter counted quantities, and the system will create adjustment entries for discrepancies." />
          </div>
          <p className="text-sm text-muted-foreground">
            Count inventory items and reconcile discrepancies.
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <ClipboardList className="h-4 w-4" />
          Start Count
        </Button>
      </div>

      {/* Inventory Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
          </CardTitle>
          <CardDescription>
            Browse inventory below to review current quantities before starting a count.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InventoryToolbar
            filters={inventoryFilters}
            items={items}
            onFiltersChange={handleFiltersChange}
            onAdjustment={() => {}}
            onTransfer={() => {}}
            onStockCount={() => setDialogOpen(true)}
            isLoading={isLoading}
          />

          <InventoryTable
            items={items}
            selectedIds={selectedItemIds}
            isLoading={isLoading}
            onToggleSelect={toggleItemSelection}
            onSelectAll={handleSelectAll}
            onAction={() => {}}
          />

          <InventoryPaginationComponent
            page={inventoryPagination.page}
            limit={inventoryPagination.limit}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onLimitChange={handlePageSizeChange}
            label="items"
          />
        </CardContent>
      </Card>

      {/* Count Dialog */}
      <StockCountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        inventoryItems={items}
        onSubmit={handleStockCount}
        isSaving={isSaving}
      />
    </div>
  );
}
