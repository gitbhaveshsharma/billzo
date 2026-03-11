"use client";

import { useEffect, useCallback, useState } from "react";
import {
  CreditCard,
  ShoppingCart,
  FileText,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useSalesStore } from "@/stores/sales.store";
import { usePurchaseStore } from "@/stores/purchase.store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SalesStats,
  SalesToolbar,
  SalesTable,
  SalesPagination,
  SaleDetailSheet,
  type SaleAction,
} from "@/app/store-admin/_components/sales";
import {
  PurchaseStats,
  PurchaseToolbar,
  PurchaseTable,
  PurchasePagination,
  PurchaseDetailSheet,
  type PurchaseAction,
} from "@/app/store-admin/_components/purchase";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type { Sale, SaleFilters } from "@/types/sales.types";
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
} from "@/types/purchase.types";

// ============================================================================
// ACCOUNTANT — ALL TRANSACTIONS PAGE
// ============================================================================

export default function TransactionsPage() {
  const { storeId } = useAccountant();

  // ── Sales store ────────────────────────────────────────────────────────
  const {
    sales,
    dashboardStats: salesStats,
    filters: salesFilters,
    pagination: salesPagination,
    totalSales,
    totalPages: saleTotalPages,
    isLoading: salesLoading,
    fetchSales,
    fetchDashboardStats: fetchSalesStats,
    setFilters: setSalesFilters,
    setPagination: setSalesPagination,
  } = useSalesStore();

  // ── Purchase store ─────────────────────────────────────────────────────
  const {
    orders,
    dashboardStats: purchaseStats,
    filters: purchaseFilters,
    pagination: purchasePagination,
    totalOrders,
    totalPages: purchaseTotalPages,
    isLoading: purchaseLoading,
    selectedOrderIds,
    fetchOrders,
    fetchDashboardStats: fetchPurchaseStats,
    setFilters: setPurchaseFilters,
    setPagination: setPurchasePagination,
    toggleOrderSelection,
    setSelectedOrderIds,
  } = usePurchaseStore();

  // ── Dialog state ───────────────────────────────────────────────────────
  const [saleDetailOpen, setSaleDetailOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [poDetailOpen, setPoDetailOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchSales(storeId);
    fetchSalesStats(storeId);
  }, [storeId, salesFilters, salesPagination, fetchSales, fetchSalesStats]);

  useEffect(() => {
    if (!storeId) return;
    fetchOrders(storeId);
    fetchPurchaseStats(storeId);
  }, [storeId, purchaseFilters, purchasePagination, fetchOrders, fetchPurchaseStats]);

  // ========================================================================
  // HANDLERS — SALES
  // ========================================================================

  const handleSalesFiltersChange = useCallback(
    (f: Partial<SaleFilters>) => {
      setSalesFilters(f);
      setSalesPagination({ page: 1 });
    },
    [setSalesFilters, setSalesPagination],
  );

  const handleSaleAction = useCallback(
    (action: SaleAction, sale: Sale) => {
      if (action === "view") {
        setSelectedSaleId(sale.id);
        setSaleDetailOpen(true);
      }
    },
    [],
  );

  // ========================================================================
  // HANDLERS — PURCHASES
  // ========================================================================

  const handlePurchaseFiltersChange = useCallback(
    (f: Partial<PurchaseOrderFilters>) => {
      setPurchaseFilters(f);
      setPurchasePagination({ page: 1 });
    },
    [setPurchaseFilters, setPurchasePagination],
  );

  const handlePurchaseAction = useCallback(
    (action: PurchaseAction, order: PurchaseOrder) => {
      if (action === "view") {
        setSelectedPoId(order.id);
        setPoDetailOpen(true);
      }
    },
    [],
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <InfoTooltip content="View all sales invoices and purchase orders in one place. Use the tabs to switch between sales (revenue) and purchases (expense) transactions. Click any row to see full details." />
        </div>
        <p className="text-sm text-muted-foreground">
          All sales and purchase transactions across the store.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Sales
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Purchases
          </TabsTrigger>
        </TabsList>

        {/* ── Sales Tab ─────────────────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-4 mt-4">
          <SalesStats stats={salesStats} isLoading={salesLoading} />

          <SalesToolbar
            filters={salesFilters}
            sales={sales}
            onFiltersChange={handleSalesFiltersChange}
            isLoading={salesLoading}
            showDateRange
          />

          <SalesTable
            sales={sales}
            isLoading={salesLoading}
            onAction={handleSaleAction}
          />

          <SalesPagination
            page={salesPagination.page}
            limit={salesPagination.limit}
            totalSales={totalSales}
            totalPages={saleTotalPages}
            onPageChange={(p) => setSalesPagination({ page: p })}
            onLimitChange={(l) => setSalesPagination({ limit: l, page: 1 })}
          />
        </TabsContent>

        {/* ── Purchases Tab ─────────────────────────────────────────── */}
        <TabsContent value="purchases" className="space-y-4 mt-4">
          <PurchaseStats stats={purchaseStats} isLoading={purchaseLoading} />

          <PurchaseToolbar
            filters={purchaseFilters}
            orders={orders}
            onFiltersChange={handlePurchaseFiltersChange}
            onCreatePO={() => {}}
            isLoading={purchaseLoading}
          />

          <PurchaseTable
            orders={orders}
            selectedIds={selectedOrderIds}
            isLoading={purchaseLoading}
            onToggleSelect={toggleOrderSelection}
            onSelectAll={setSelectedOrderIds}
            onAction={handlePurchaseAction}
          />

          <PurchasePagination
            page={purchasePagination.page}
            limit={purchasePagination.limit}
            totalOrders={totalOrders}
            totalPages={purchaseTotalPages}
            onPageChange={(p) => setPurchasePagination({ page: p })}
            onLimitChange={(l) => setPurchasePagination({ limit: l, page: 1 })}
          />
        </TabsContent>
      </Tabs>

      {/* Detail sheets */}
      {selectedSaleId && storeId && (
        <SaleDetailSheet
          open={saleDetailOpen}
          onOpenChange={setSaleDetailOpen}
          saleId={selectedSaleId}
          storeId={storeId}
        />
      )}

      {selectedPoId && storeId && (
        <PurchaseDetailSheet
          open={poDetailOpen}
          onOpenChange={setPoDetailOpen}
          orderId={selectedPoId}
          storeId={storeId}
          onEdit={() => {}}
          onReceive={() => {}}
          onAddPayment={() => {}}
          onCreateReturn={() => {}}
        />
      )}
    </div>
  );
}
