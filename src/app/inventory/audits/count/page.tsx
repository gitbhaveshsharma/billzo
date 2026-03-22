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
  StockTransferDialog,
  EditInventoryDialog,
  InventoryDetailSheet,
  StockAdjustmentDialog,
  StockCountDialog,
  type InventoryAction,
} from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  EnrichedInventoryRecord,
  CreateStockAdjustmentRequest,
  CreateStockTransferRequest,
  UpdateInventoryRecordRequest,
  InventoryTransaction,
  PriceHistory,
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
    fetchProductTransactions,
    fetchPriceHistory,
    setInventoryFilters,
    setInventoryPagination,
    createStockAdjustment,
    createStockTransfer,
    updateInventoryRecord,
    performStockCount,
    toggleItemSelection,
    setSelectedItemIds,
  } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedInventoryRecord | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<InventoryTransaction[]>([]);
  const [detailPriceHistory, setDetailPriceHistory] = useState<PriceHistory[]>([]);
  const [isLoadingDetailTx, setIsLoadingDetailTx] = useState(false);
  const [isLoadingDetailPH, setIsLoadingDetailPH] = useState(false);

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

  const openDetailSheet = useCallback(
    async (item: EnrichedInventoryRecord) => {
      setSelectedItem(item);
      setDetailSheetOpen(true);
      setDetailTransactions([]);
      setDetailPriceHistory([]);

      if (!storeId) return;

      setIsLoadingDetailTx(true);
      try {
        const txs = await fetchProductTransactions(storeId, item.product_id);
        setDetailTransactions(txs);
      } catch {
        // Non-blocking in detail sheet
      } finally {
        setIsLoadingDetailTx(false);
      }

      setIsLoadingDetailPH(true);
      try {
        const ph = await fetchPriceHistory(storeId, item.product_id, item.variant_id ?? undefined);
        setDetailPriceHistory(ph);
      } catch {
        // Non-blocking in detail sheet
      } finally {
        setIsLoadingDetailPH(false);
      }
    },
    [storeId, fetchProductTransactions, fetchPriceHistory],
  );

  const handleAction = useCallback(
    (action: InventoryAction, item: EnrichedInventoryRecord) => {
      setSelectedItem(item);
      switch (action) {
        case "view":
        case "history":
          void openDetailSheet(item);
          break;
        case "edit":
          setEditDialogOpen(true);
          break;
        case "adjust":
          setAdjustDialogOpen(true);
          break;
        case "transfer":
          setTransferDialogOpen(true);
          break;
      }
    },
    [openDetailSheet],
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

  const handleTransfer = useCallback(
    async (data: CreateStockTransferRequest): Promise<boolean> => {
      if (!storeId) return false;
      try {
        const result = await createStockTransfer(storeId, data);
        if (result) {
          toast.success("Stock transfer completed");
          fetchInventory(storeId, true);
          return true;
        }
        toast.error("Failed to complete transfer");
        return false;
      } catch {
        toast.error("Failed to complete transfer");
        return false;
      }
    },
    [storeId, createStockTransfer, fetchInventory],
  );

  const handleUpdateRecord = useCallback(
    async (inventoryId: string, data: UpdateInventoryRecordRequest): Promise<boolean> => {
      if (!storeId) return false;
      try {
        const success = await updateInventoryRecord(storeId, inventoryId, data);
        if (success) {
          toast.success("Inventory settings updated");
          fetchInventory(storeId, true);
          return true;
        }
        toast.error("Failed to update inventory settings");
        return false;
      } catch {
        toast.error("Failed to update inventory settings");
        return false;
      }
    },
    [storeId, updateInventoryRecord, fetchInventory],
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
            onAdjustment={() => {
              setSelectedItem(null);
              setAdjustDialogOpen(true);
            }}
            onTransfer={() => {
              setSelectedItem(null);
              setTransferDialogOpen(true);
            }}
            onStockCount={() => setDialogOpen(true)}
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

      {/* Count Dialog */}
      <StockCountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        inventoryItems={items}
        onSubmit={handleStockCount}
        isSaving={isSaving}
      />

      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={(open) => {
          setAdjustDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={handleAdjustment}
        isSaving={isSaving}
      />

      <StockTransferDialog
        open={transferDialogOpen}
        onOpenChange={(open) => {
          setTransferDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={handleTransfer}
        isSaving={isSaving}
      />

      <EditInventoryDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={handleUpdateRecord}
        isSaving={isSaving}
      />

      <InventoryDetailSheet
        open={detailSheetOpen}
        onOpenChange={(open) => {
          setDetailSheetOpen(open);
          if (!open) {
            setDetailTransactions([]);
            setDetailPriceHistory([]);
          }
        }}
        item={selectedItem}
        recentTransactions={detailTransactions}
        priceHistory={detailPriceHistory}
        isLoadingTransactions={isLoadingDetailTx}
        isLoadingPriceHistory={isLoadingDetailPH}
        onAdjust={() => {
          setDetailSheetOpen(false);
          setAdjustDialogOpen(true);
        }}
        onTransfer={() => {
          setDetailSheetOpen(false);
          setTransferDialogOpen(true);
        }}
        onEdit={() => {
          setDetailSheetOpen(false);
          setEditDialogOpen(true);
        }}
      />
    </div>
  );
}
