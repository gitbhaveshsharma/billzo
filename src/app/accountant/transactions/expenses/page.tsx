"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import {
  Receipt,
  Wallet,
  AlertTriangle,
  ArrowDownRight,
  DollarSign,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { usePurchaseStore } from "@/stores/purchase.store";
import { useShiftsStore } from "@/stores/shifts.store";
import {
  StatCardGrid,
  MiniStatList,
} from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import {
  PurchaseStats,
  PurchaseToolbar,
  PurchaseTable,
  PurchasePagination,
  PurchaseDetailSheet,
  type PurchaseAction,
} from "@/app/store-admin/_components/purchase";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
} from "@/types/purchase.types";

// ============================================================================
// ACCOUNTANT — EXPENSES PAGE
// ============================================================================

export default function ExpensesPage() {
  const { storeId } = useAccountant();

  // ── Purchase store ─────────────────────────────────────────────────────
  const {
    orders,
    dashboardStats: purchaseStats,
    filters,
    pagination,
    totalOrders,
    totalPages,
    isLoading: purchaseLoading,
    selectedOrderIds,
    fetchOrders,
    fetchDashboardStats: fetchPurchaseStats,
    setFilters,
    setPagination,
    toggleOrderSelection,
    setSelectedOrderIds,
  } = usePurchaseStore();

  // ── Shift store (cash-out data) ────────────────────────────────────────
  const {
    dashboardStats: shiftStats,
    isLoading: shiftLoading,
    fetchDashboardStats: fetchShiftStats,
  } = useShiftsStore();

  const [poDetailOpen, setPoDetailOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const isLoading = purchaseLoading || shiftLoading;

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchOrders(storeId);
    fetchPurchaseStats(storeId);
    fetchShiftStats(storeId);
  }, [storeId, filters, pagination, fetchOrders, fetchPurchaseStats, fetchShiftStats]);

  // ========================================================================
  // STATS
  // ========================================================================

  const expenseStats = useMemo<DashboardStatConfig[]>(() => {
    const ps = purchaseStats;
    const ss = shiftStats;
    return [
      {
        label: "This Month Purchases",
        value: formatCurrency(ps?.this_month_total ?? 0),
        icon: Receipt,
        color: "bg-red-500",
        isCurrency: true,
        tooltip: "Total value of purchase orders created this calendar month",
      },
      {
        label: "Paid to Suppliers",
        value: formatCurrency(ps?.paid_amount ?? 0),
        icon: ArrowDownRight,
        color: "bg-orange-500",
        isCurrency: true,
        tooltip: "Total payments made to suppliers against purchase orders",
      },
      {
        label: "Cash Out Today",
        value: formatCurrency(ss?.total_cash_out_today ?? 0),
        icon: Wallet,
        color: "bg-yellow-500",
        isCurrency: true,
        tooltip: "Cash-out movements from cash registers today (safe drops, petty cash, etc.)",
      },
      {
        label: "Overdue Payments",
        value: (ps?.overdue_payments ?? 0).toLocaleString("en-IN"),
        icon: AlertTriangle,
        color: "bg-red-600",
        tooltip: "Number of purchase orders past their expected payment due date",
      },
    ];
  }, [purchaseStats, shiftStats]);

  // ── Cash movement summary ─────────────────────────────────────────────
  const cashMovementItems = useMemo(() => {
    const ss = shiftStats;
    return [
      {
        label: "Cash In Today",
        value: formatCurrency(ss?.total_cash_in_today ?? 0),
        tooltip: "Total cash added to tills today (opening + cash-in movements)",
      },
      {
        label: "Cash Out Today",
        value: formatCurrency(ss?.total_cash_out_today ?? 0),
        tooltip: "Total cash removed from tills today (safe drops, petty cash, closings)",
      },
      {
        label: "Today Discounts Given",
        value: formatCurrency(ss?.today_total_discounts ?? 0),
        tooltip: "Total value of discounts applied on sales today — this reduces effective revenue",
      },
      {
        label: "Today Returns Value",
        value: formatCurrency(ss?.today_total_returns ?? 0),
        tooltip: "Value of goods returned today — refund liability",
      },
    ];
  }, [shiftStats]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleFiltersChange = useCallback(
    (f: Partial<PurchaseOrderFilters>) => {
      setFilters(f);
      setPagination({ page: 1 });
    },
    [setFilters, setPagination],
  );

  const handleAction = useCallback(
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
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <InfoTooltip content="Expense tracking covers purchase orders to suppliers (goods purchased for resale) and cash-out movements from shifts (petty cash, safe drops). This view helps track where money is going out." />
        </div>
        <p className="text-sm text-muted-foreground">
          Purchase order payments, cash-out movements, and expense tracking.
        </p>
      </div>

      {/* Expense KPIs */}
      <StatCardGrid stats={expenseStats} isLoading={isLoading} columns={4} />

      {/* Cash Movement Summary */}
      <MiniStatList
        title="Cash Movement Summary"
        icon={DollarSign}
        items={cashMovementItems}
        isLoading={isLoading}
      />

      {/* Purchase Orders (Expense Transactions) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          Purchase Orders
          <InfoTooltip content="Purchase orders represent goods bought from suppliers. Filter by status or supplier to view specific expense transactions." />
        </h2>

        <PurchaseToolbar
          filters={filters}
          orders={orders}
          onFiltersChange={handleFiltersChange}
          onCreatePO={() => {}}
          isLoading={purchaseLoading}
        />

        <PurchaseTable
          orders={orders}
          selectedIds={selectedOrderIds}
          isLoading={purchaseLoading}
          onToggleSelect={toggleOrderSelection}
          onSelectAll={setSelectedOrderIds}
          onAction={handleAction}
        />

        <PurchasePagination
          page={pagination.page}
          limit={pagination.limit}
          totalOrders={totalOrders}
          totalPages={totalPages}
          onPageChange={(p) => setPagination({ page: p })}
          onLimitChange={(l) => setPagination({ limit: l, page: 1 })}
        />
      </section>

      {/* Detail sheet */}
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
