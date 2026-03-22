"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  SlidersHorizontal,
  Package,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InventoryTable,
  InventoryToolbar,
  InventoryPagination as InventoryPaginationComponent,
  StockCountDialog,
  StockAdjustmentDialog,
  TransactionsPanel,
  type InventoryAction,
} from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  StockCountItem,
  CreateStockAdjustmentRequest,
  EnrichedInventoryRecord,
  InventoryFilters,
  TransactionFilters,
  TransactionPagination,
} from "@/types/inventory.types";

// ============================================================================
// INVENTORY MANAGER — AUDITS & ADJUSTMENTS PAGE
// ============================================================================

export default function InventoryAuditsPage() {
  const { storeId } = useInventory();

  const {
    items,
    totalItems,
    totalPages,
    inventoryFilters,
    inventoryPagination,
    transactions,
    totalTransactions,
    totalTransactionPages,
    transactionFilters,
    transactionPagination,
    selectedItemIds,
    isLoading,
    isSaving,
    fetchInventory,
    fetchTransactions,
    setInventoryFilters,
    setInventoryPagination,
    setTransactionFilters,
    setTransactionPagination,
    performStockCount,
    createStockAdjustment,
    toggleItemSelection,
    setSelectedItemIds,
  } = useInventoryStore();

  // ── Tab State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("count");

  // ── Dialog State ───────────────────────────────────────────────────────
  const [countDialogOpen, setCountDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedInventoryRecord | null>(null);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchInventory(storeId);
  }, [storeId, inventoryFilters, inventoryPagination, fetchInventory]);

  useEffect(() => {
    if (!storeId) return;
    fetchTransactions(storeId);
  }, [storeId, transactionFilters, transactionPagination, fetchTransactions]);

  // ========================================================================
  // FILTER HANDLERS
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

  const handleTransactionFiltersChange = useCallback(
    (filters: Partial<TransactionFilters>) => {
      setTransactionFilters(filters);
      setTransactionPagination({ page: 1 });
    },
    [setTransactionFilters, setTransactionPagination],
  );

  const handleTransactionPaginationChange = useCallback(
    (pagination: Partial<TransactionPagination>) => setTransactionPagination(pagination),
    [setTransactionPagination],
  );

  // ========================================================================
  // ACTION HANDLERS
  // ========================================================================

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

  const handleAction = useCallback(
    (action: InventoryAction, item: EnrichedInventoryRecord) => {
      if (action === "adjust") {
        setSelectedItem(item);
        setAdjustDialogOpen(true);
      }
    },
    [],
  );

  const handleSelectAll = useCallback(
    (ids: string[]) => {
      setSelectedItemIds(ids);
    },
    [setSelectedItemIds],
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Audits &amp; Adjustments</h1>
            <InfoTooltip content="Verify inventory accuracy through physical stock counts, and make corrections for damage, expiry, or discrepancies." />
          </div>
          <p className="text-sm text-muted-foreground">
            Physical counts, stock adjustments, and audit history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCountDialogOpen(true)} className="gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Start Stock Count</span>
            <span className="sm:hidden">Count</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="count" className="gap-1">
            <ClipboardList className="h-4 w-4" />
            Physical Count
          </TabsTrigger>
          <TabsTrigger value="adjust" className="gap-1">
            <SlidersHorizontal className="h-4 w-4" />
            Stock Adjustment
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <ChevronRight className="h-4 w-4" />
            Audit History
          </TabsTrigger>
        </TabsList>

        {/* ── Physical Count Tab ────────────────────────────────────────── */}
        <TabsContent value="count" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Items
                <InfoTooltip content="Select items below to include in a physical stock count. Compare actual quantities against system records." />
              </CardTitle>
              <CardDescription>
                Review current inventory levels and start a physical count to verify accuracy.
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
                onTransfer={() => {}}
                onStockCount={() => setCountDialogOpen(true)}
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
                totalPages={totalPages}
                limit={inventoryPagination.limit}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                onLimitChange={handlePageSizeChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Adjustment Tab ────────────────────────────────────────────── */}
        <TabsContent value="adjust" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Quick Adjust
                <InfoTooltip content="Adjust stock quantities for damage, expiry, or other corrections. Each adjustment is logged for accountability." />
              </CardTitle>
              <CardDescription>
                Select a product from the inventory list to apply an adjustment.
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
                onTransfer={() => {}}
                onStockCount={() => setCountDialogOpen(true)}
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
                totalPages={totalPages}
                limit={inventoryPagination.limit}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                onLimitChange={handlePageSizeChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Audit History Tab ─────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <TransactionsPanel
            transactions={transactions}
            total={totalTransactions}
            filters={transactionFilters}
            pagination={transactionPagination}
            isLoading={isLoading}
            onFiltersChange={handleTransactionFiltersChange}
            onPaginationChange={handleTransactionPaginationChange}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StockCountDialog
        open={countDialogOpen}
        onOpenChange={setCountDialogOpen}
        inventoryItems={items}
        onSubmit={handleStockCount}
        isSaving={isSaving}
      />

      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        item={selectedItem}
        onSubmit={handleAdjustment}
        isSaving={isSaving}
      />
    </div>
  );
}
