"use client";

import { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, Package } from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
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
  StockAdjustmentDialog,
  type InventoryAction,
} from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  CreateStockAdjustmentRequest,
  EnrichedInventoryRecord,
  InventoryFilters,
} from "@/types/inventory.types";

// ============================================================================
// INVENTORY MANAGER — STOCK ADJUSTMENT PAGE
// ============================================================================

export default function StockAdjustmentPage() {
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
    createStockAdjustment,
    toggleItemSelection,
    setSelectedItemIds,
  } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleSelectAll = useCallback(
    (ids: string[]) => setSelectedItemIds(ids),
    [setSelectedItemIds],
  );

  const handleAction = useCallback(
    (action: InventoryAction, item: EnrichedInventoryRecord) => {
      if (action === "adjust") {
        setSelectedItem(item);
        setDialogOpen(true);
      }
    },
    [],
  );

  const handleAdjustment = useCallback(
    async (data: CreateStockAdjustmentRequest): Promise<boolean> => {
      if (!storeId) return false;
      try {
        const result = await createStockAdjustment(storeId, data);
        if (result) {
          toast.success("Stock adjustment applied");
          fetchInventory(storeId, true);
          return true;
        }
        toast.error("Failed to apply adjustment");
        return false;
      } catch {
        toast.error("Failed to apply adjustment");
        return false;
      }
    },
    [storeId, createStockAdjustment, fetchInventory],
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Stock Adjustment</h1>
          <InfoTooltip content="Make manual adjustments to correct inventory discrepancies. Use this for damage write-offs, expiry removals, or correcting miscounted stock. Every adjustment is logged for audit purposes." />
        </div>
        <p className="text-sm text-muted-foreground">
          Correct inventory quantities for damage, expiry or discrepancies.
        </p>
      </div>

      {/* Inventory Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
          </CardTitle>
          <CardDescription>
            Select an item and click &quot;Adjust&quot; to make a stock correction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InventoryToolbar
            filters={inventoryFilters}
            items={items}
            onFiltersChange={handleFiltersChange}
            onAdjustment={() => {
              if (items.length > 0) {
                setSelectedItem(items[0]);
                setDialogOpen(true);
              }
            }}
            onTransfer={() => {}}
            onStockCount={() => {}}
            isLoading={isLoading}
          />

          <InventoryTable
            items={items}
            selectedIds={selectedItemIds}
            isLoading={isLoading}
            onToggleSelect={toggleItemSelection}
            onSelectAll={handleSelectAll}
            onAction={handleAction}
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

      {/* Adjustment Dialog */}
      <StockAdjustmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={handleAdjustment}
        isSaving={isSaving}
      />
    </div>
  );
}
