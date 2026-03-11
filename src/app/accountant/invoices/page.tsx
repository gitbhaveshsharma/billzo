"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import {
  FileText,
  ReceiptText,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useSalesStore } from "@/stores/sales.store";
import {
  SalesStats,
  SalesToolbar,
  SalesTable,
  SalesPagination,
  SaleDetailSheet,
} from "@/app/store-admin/_components/sales";
import type { SaleAction } from "@/app/store-admin/_components/sales";
import { StatCardGrid } from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";
import type { Sale } from "@/types/sales.types";

// ============================================================================
// ACCOUNTANT — INVOICES PAGE
// ============================================================================

export default function InvoicesPage() {
  const { storeId } = useAccountant();

  const {
    sales,
    filters,
    pagination,
    totalSales,
    totalPages,
    dashboardStats,
    isLoading,
    fetchSales,
    fetchDashboardStats,
    setFilters,
    setPagination,
  } = useSalesStore();

  // Detail sheet state
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // ========================================================================
  // FETCH
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchSales(storeId);
    fetchDashboardStats(storeId);
  }, [storeId, fetchSales, fetchDashboardStats]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleAction = useCallback((action: SaleAction, sale: Sale) => {
    if (action === "view") {
      setSelectedSaleId(sale.id);
    }
    // Accountant can only view — no cancel, return, or payment actions
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      setPagination({ page });
      if (storeId) fetchSales(storeId);
    },
    [setPagination, fetchSales, storeId]
  );

  const handleLimitChange = useCallback(
    (limit: number) => {
      setPagination({ page: 1, limit });
      if (storeId) fetchSales(storeId);
    },
    [setPagination, fetchSales, storeId]
  );

  // ── Invoice KPI cards ──────────────────────────────────────────────────
  const invoiceStats = useMemo<DashboardStatConfig[]>(() => {
    const s = dashboardStats;
    return [
      {
        label: "Total Invoices",
        value: (s?.today_sales_count ?? 0).toLocaleString("en-IN"),
        icon: FileText,
        color: "bg-blue-500",
        tooltip: "Total number of completed invoices",
      },
      {
        label: "Invoice Value",
        value: formatCurrency(s?.today_sales_amount ?? 0),
        icon: DollarSign,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip: "Total value of all invoices",
      },
      {
        label: "Tax Invoiced",
        value: formatCurrency(s?.today_tax_total ?? 0),
        icon: ReceiptText,
        color: "bg-indigo-500",
        isCurrency: true,
        tooltip: "Total GST amount across all invoices",
      },
      {
        label: "Outstanding",
        value: formatCurrency(s?.total_outstanding ?? 0),
        icon: CreditCard,
        color: (s?.total_outstanding ?? 0) > 0 ? "bg-red-500" : "bg-emerald-500",
        isCurrency: true,
        tooltip: "Unpaid invoice amount from credit sales",
      },
    ];
  }, [dashboardStats]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <InfoTooltip content="View all sales invoices with their amounts, tax details, and payment status. Click any row to view the full invoice with item breakdown." />
        </div>
        <p className="text-sm text-muted-foreground">
          Sales invoices, tax details, and payment tracking.
        </p>
      </div>

      {/* Invoice KPIs */}
      <StatCardGrid stats={invoiceStats} isLoading={isLoading} columns={4} />

      {/* Sales Stats (reused) */}
      <SalesStats stats={dashboardStats} isLoading={isLoading} />

      {/* Toolbar */}
      <SalesToolbar
        filters={filters}
        sales={sales}
        onFiltersChange={(f) => {
          setFilters(f);
          if (storeId) fetchSales(storeId);
        }}
        isLoading={isLoading}
        showDateRange
        showCreditFilter
      />

      {/* Table */}
      <SalesTable
        sales={sales}
        isLoading={isLoading}
        onAction={handleAction}
      />

      {/* Pagination */}
      <SalesPagination
        page={pagination.page}
        limit={pagination.limit}
        totalSales={totalSales}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {/* Detail Sheet */}
      {storeId && (
        <SaleDetailSheet
          open={!!selectedSaleId}
          onOpenChange={(open) => {
            if (!open) setSelectedSaleId(null);
          }}
          saleId={selectedSaleId}
          storeId={storeId}
        />
      )}
    </div>
  );
}
