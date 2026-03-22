"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import {
  InventoryStats,
  InventoryToolbar,
  InventoryTable,
  InventoryPagination as InventoryPaginationComponent,
  StockAdjustmentDialog,
  StockTransferDialog,
  EditInventoryDialog,
  AlertsPanel,
  BatchesPanel,
  CreateBatchDialog,
  TransactionsPanel,
  StockCountDialog,
  AnalyticsPanel,
  InventoryDetailSheet,
  type InventoryAction,
} from "@/app/store-admin/_components/stock";
import { PageLoader } from "@/components/shared/loading-spinner";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type {
  EnrichedInventoryRecord,
  CreateStockAdjustmentRequest,
  CreateStockTransferRequest,
  UpdateInventoryRecordRequest,
  CreateProductBatchRequest,
  StockCountItem,
  InventoryFilters,
  TransactionFilters,
  TransactionPagination,
  BatchFilters,
  AlertFilters,
  InventoryTransaction,
  PriceHistory,
} from "@/types/inventory.types";

// ============================================================================
// INVENTORY MANAGER — STOCK PAGE (inner content — uses useSearchParams)
// ============================================================================

function StockPageContent() {
  const { storeId } = useInventory();

  const {
    items,
    dashboardStats,
    transactions,
    batches,
    alerts,
    unresolvedAlertCount,
    valuationSummary,
    inventoryFilters,
    inventoryPagination,
    totalItems,
    totalPages,
    transactionFilters,
    transactionPagination,
    totalTransactions,
    batchFilters,
    totalBatches,
    isLoading,
    isSaving,
    selectedItemIds,
    fetchInventory,
    fetchDashboardStats,
    fetchValuationSummary,
    fetchTransactions,
    fetchBatches,
    fetchAlerts,
    fetchUnresolvedAlertCount,
    fetchPriceHistory,
    fetchProductTransactions,
    createStockAdjustment,
    createStockTransfer,
    updateInventoryRecord,
    performStockCount,
    createBatch,
    resolveAlert,
    bulkResolveAlerts,
    setInventoryFilters,
    setInventoryPagination,
    setTransactionFilters,
    setTransactionPagination,
    setBatchFilters,
    setSelectedItemIds,
    toggleItemSelection,
  } = useInventoryStore();

  // ========================================================================
  // DIALOG STATE
  // ========================================================================

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [stockCountDialogOpen, setStockCountDialogOpen] = useState(false);
  const [createBatchDialogOpen, setCreateBatchDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedInventoryRecord | null>(null);
  const [activeTab, setActiveTab] = useState("stock");

  const [detailTransactions, setDetailTransactions] = useState<InventoryTransaction[]>([]);
  const [detailPriceHistory, setDetailPriceHistory] = useState<PriceHistory[]>([]);
  const [isLoadingDetailTx, setIsLoadingDetailTx] = useState(false);
  const [isLoadingDetailPH, setIsLoadingDetailPH] = useState(false);

  // ========================================================================
  // URL FILTER PARAM
  // ========================================================================

  const searchParams = useSearchParams();
  const urlFilterApplied = useRef(false);

  useEffect(() => {
    if (urlFilterApplied.current) return;
    const filter = searchParams.get("filter");
    if (!filter) return;
    urlFilterApplied.current = true;

    if (filter === "expiring" || filter === "expired") {
      setActiveTab("alerts");
      return;
    }

    const filterMap: Record<string, Partial<InventoryFilters>> = {
      "out-of-stock": { out_of_stock_only: true },
      "low-stock": { low_stock_only: true },
      "overstock": { overstock_only: true },
    };

    const mapped = filterMap[filter];
    if (mapped) setInventoryFilters(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const filtersKey = JSON.stringify(inventoryFilters);
  const paginationPage = inventoryPagination.page;
  const paginationLimit = inventoryPagination.limit;
  const paginationSortBy = inventoryPagination.sort_by;
  const paginationSortOrder = inventoryPagination.sort_order;

  useEffect(() => {
    if (storeId) fetchInventory(storeId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, filtersKey, paginationPage, paginationLimit, paginationSortBy, paginationSortOrder]);

  useEffect(() => {
    if (storeId) {
      fetchDashboardStats(storeId);
      fetchUnresolvedAlertCount(storeId);
    }
  }, [storeId, fetchDashboardStats, fetchUnresolvedAlertCount]);

  const txFiltersKey = JSON.stringify(transactionFilters);
  const txPage = transactionPagination.page;
  const txLimit = transactionPagination.limit;

  useEffect(() => {
    if (storeId && activeTab === "transactions") fetchTransactions(storeId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, activeTab, txFiltersKey, txPage, txLimit]);

  const batchFiltersKey = JSON.stringify(batchFilters);

  useEffect(() => {
    if (storeId && activeTab === "batches") fetchBatches(storeId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, activeTab, batchFiltersKey]);

  useEffect(() => {
    if (storeId && activeTab === "alerts") fetchAlerts(storeId);
  }, [storeId, activeTab, fetchAlerts]);

  useEffect(() => {
    if (storeId && activeTab === "analytics") {
      fetchDashboardStats(storeId);
      fetchValuationSummary(storeId);
    }
  }, [storeId, activeTab, fetchDashboardStats, fetchValuationSummary]);

  // ========================================================================
  // ACTION HANDLER
  // ========================================================================

  const handleAction = useCallback(
    (action: InventoryAction, item: EnrichedInventoryRecord) => {
      setSelectedItem(item);
      switch (action) {
        case "view":
          openDetailSheet(item);
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
        case "history":
          setActiveTab("transactions");
          setTransactionFilters({ product_id: item.product_id });
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId]
  );

  const openDetailSheet = async (item: EnrichedInventoryRecord) => {
    setSelectedItem(item);
    setDetailSheetOpen(true);
    setDetailTransactions([]);
    setDetailPriceHistory([]);

    if (storeId) {
      setIsLoadingDetailTx(true);
      try {
        const txs = await fetchProductTransactions(storeId, item.product_id);
        setDetailTransactions(txs);
      } catch {
        /* detail panel non-critical */
      } finally {
        setIsLoadingDetailTx(false);
      }

      setIsLoadingDetailPH(true);
      try {
        const ph = await fetchPriceHistory(storeId, item.product_id, item.variant_id ?? undefined);
        setDetailPriceHistory(ph);
      } catch {
        /* detail panel non-critical */
      } finally {
        setIsLoadingDetailPH(false);
      }
    }
  };

  // ========================================================================
  // CRUD HANDLERS
  // ========================================================================

  const handleAdjustment = async (data: CreateStockAdjustmentRequest): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading("Creating stock adjustment...");
    const result = await createStockAdjustment(storeId, data);
    if (result) {
      toast.success("Stock adjustment recorded", { id: toastId });
      fetchDashboardStats(storeId);
      fetchUnresolvedAlertCount(storeId);
      return true;
    }
    toast.error("Failed to create stock adjustment", { id: toastId });
    return false;
  };

  const handleTransfer = async (data: CreateStockTransferRequest): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading("Creating stock transfer...");
    const result = await createStockTransfer(storeId, data);
    if (result) {
      toast.success("Stock transfer completed", { id: toastId });
      fetchDashboardStats(storeId);
      return true;
    }
    toast.error("Failed to create stock transfer", { id: toastId });
    return false;
  };

  const handleUpdateRecord = async (
    inventoryId: string,
    data: UpdateInventoryRecordRequest
  ): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading("Updating inventory record...");
    const success = await updateInventoryRecord(storeId, inventoryId, data);
    if (success) {
      toast.success("Inventory record updated", { id: toastId });
      return true;
    }
    toast.error("Failed to update inventory record", { id: toastId });
    return false;
  };

  const handleStockCount = async (countItems: StockCountItem[], notes: string): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading("Submitting stock count...");
    const success = await performStockCount(storeId, { items: countItems, notes });
    if (success) {
      toast.success("Stock count submitted successfully", { id: toastId });
      fetchDashboardStats(storeId);
      fetchUnresolvedAlertCount(storeId);
      return true;
    }
    toast.error("Failed to submit stock count", { id: toastId });
    return false;
  };

  const handleCreateBatch = async (data: CreateProductBatchRequest): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading("Creating batch...");
    const result = await createBatch(storeId, data);
    if (result) {
      toast.success(`Batch ${result.batch_number} created`, { id: toastId });
      return true;
    }
    toast.error("Failed to create batch", { id: toastId });
    return false;
  };

  const handleResolveAlert = async (alertId: string, notes: string): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading("Resolving alert...");
    const success = await resolveAlert(storeId, alertId, { resolution_notes: notes });
    if (success) {
      toast.success("Alert resolved", { id: toastId });
      fetchAlerts(storeId);
      fetchUnresolvedAlertCount(storeId);
      return true;
    }
    toast.error("Failed to resolve alert", { id: toastId });
    return false;
  };

  const handleBulkResolveAlerts = async (alertIds: string[], notes: string): Promise<boolean> => {
    if (!storeId) return false;
    const toastId = toast.loading(`Resolving ${alertIds.length} alerts...`);
    const success = await bulkResolveAlerts(storeId, alertIds, notes);
    if (success) {
      toast.success(`${alertIds.length} alerts resolved`, { id: toastId });
      fetchAlerts(storeId);
      fetchUnresolvedAlertCount(storeId);
      return true;
    }
    toast.error("Failed to resolve alerts", { id: toastId });
    return false;
  };

  // ========================================================================
  // FILTER & PAGINATION CALLBACKS
  // ========================================================================

  const handleFiltersChange = useCallback(
    (newFilters: Partial<InventoryFilters>) => setInventoryFilters(newFilters),
    [setInventoryFilters]
  );

  const handlePageChange = useCallback(
    (page: number) => setInventoryPagination({ page }),
    [setInventoryPagination]
  );

  const handlePageSizeChange = useCallback(
    (limit: number) => setInventoryPagination({ limit, page: 1 }),
    [setInventoryPagination]
  );

  const handleSelectAll = useCallback(
    (ids: string[]) => setSelectedItemIds(ids),
    [setSelectedItemIds]
  );

  const handleTransactionFiltersChange = useCallback(
    (f: Partial<TransactionFilters>) => setTransactionFilters(f),
    [setTransactionFilters]
  );

  const handleTransactionPaginationChange = useCallback(
    (p: Partial<TransactionPagination>) => setTransactionPagination(p),
    [setTransactionPagination]
  );

  const handleBatchFiltersChange = useCallback(
    (f: Partial<BatchFilters>) => setBatchFilters(f),
    [setBatchFilters]
  );

  const handleAlertFiltersChange = useCallback(
    (f: Partial<AlertFilters>) => {
      if (storeId) fetchAlerts(storeId, f as AlertFilters);
    },
    [storeId, fetchAlerts]
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Stock & Inventory</h1>
          <InfoTooltip content="Track stock levels across all products, manage transactions, batches with expiry tracking, handle alerts, and view inventory analytics." />
        </div>
        <p className="text-sm text-muted-foreground">
          Manage stock levels, track transactions, batches, alerts, and analytics.
        </p>
      </div>

      {/* Dashboard Stats */}
      <InventoryStats
        stats={dashboardStats}
        isLoading={isLoading && !items.length}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="stock">Stock List</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {unresolvedAlertCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-xs">
                {unresolvedAlertCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Stock List Tab */}
        <TabsContent value="stock" className="space-y-4 mt-4">
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
            onStockCount={() => setStockCountDialogOpen(true)}
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
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4 w-full min-w-0 max-w-full">
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

        {/* Batches Tab */}
        <TabsContent value="batches" className="mt-4">
          <BatchesPanel
            batches={batches}
            total={totalBatches}
            filters={batchFilters}
            isLoading={isLoading}
            onFiltersChange={handleBatchFiltersChange}
            onCreateBatch={() => setCreateBatchDialogOpen(true)}
          />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel
            alerts={alerts}
            total={alerts.length}
            filters={{}}
            isLoading={isLoading}
            isSaving={isSaving}
            onFiltersChange={handleAlertFiltersChange}
            onResolve={handleResolveAlert}
            onBulkResolve={handleBulkResolveAlerts}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsPanel
            dashboardStats={dashboardStats}
            valuationSummary={valuationSummary}
            movementSummary={[]}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* DIALOGS & SHEETS                                             */}
      {/* ============================================================ */}

      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        item={selectedItem}
        onSubmit={handleAdjustment}
        isSaving={isSaving}
      />

      <StockTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        item={selectedItem}
        onSubmit={handleTransfer}
        isSaving={isSaving}
      />

      <EditInventoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={selectedItem}
        onSubmit={handleUpdateRecord}
        isSaving={isSaving}
      />

      <StockCountDialog
        open={stockCountDialogOpen}
        onOpenChange={setStockCountDialogOpen}
        inventoryItems={items}
        onSubmit={handleStockCount}
        isSaving={isSaving}
      />

      <CreateBatchDialog
        open={createBatchDialogOpen}
        onOpenChange={setCreateBatchDialogOpen}
        storeId={storeId!}
        onSubmit={handleCreateBatch}
        isSaving={isSaving}
      />

      <InventoryDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
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

// ============================================================================
// DEFAULT EXPORT — wraps content in Suspense for useSearchParams
// ============================================================================

export default function InventoryStockPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading..." />}>
      <StockPageContent />
    </Suspense>
  );
}
