"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Warehouse,
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  PackageX,
  CalendarClock,
} from "lucide-react";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { useProductStore } from "@/stores/product.store";
import {
  StatCardGrid,
  BarChartCard,
  StockAlertsList,
  MiniStatList,
} from "@/components/dashboard";
import type { DashboardStatConfig, ChartDataPoint } from "@/components/dashboard";
import { AnalyticsPanel } from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// INVENTORY MANAGER — REPORTS PAGE
// ============================================================================

export default function InventoryReportsPage() {
  const router = useRouter();
  const { storeId } = useInventory();

  const {
    dashboardStats: inventoryStats,
    valuationSummary,
    lowStockItems,
    expiringBatches,
    isLoading: inventoryLoading,
    fetchDashboardStats: fetchInventoryStats,
    fetchValuationSummary,
    fetchLowStock,
    fetchExpiringBatches,
  } = useInventoryStore();

  const {
    dashboardStats: productStats,
    isLoading: productLoading,
    fetchDashboardStats: fetchProductStats,
  } = useProductStore();

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchInventoryStats(storeId);
    fetchValuationSummary(storeId);
    fetchProductStats(storeId);
    fetchLowStock(storeId);
    fetchExpiringBatches(storeId);
  }, [storeId, fetchInventoryStats, fetchValuationSummary, fetchProductStats, fetchLowStock, fetchExpiringBatches]);

  const isLoading = inventoryLoading || productLoading;

  // ── Stats ──────────────────────────────────────────────────────────────
  const reportStats = useMemo<DashboardStatConfig[]>(() => {
    const inv = inventoryStats;
    return [
      {
        label: "Total Products",
        value: (inv?.total_products ?? 0).toLocaleString("en-IN"),
        icon: Package,
        color: "bg-blue-500",
        tooltip: "Total unique products tracked in inventory",
      },
      {
        label: "Stock Value",
        value: formatCurrency(inv?.total_stock_value ?? 0),
        icon: Warehouse,
        color: "bg-violet-500",
        isCurrency: true,
        tooltip: "Aggregate cost-value of all inventory on hand",
      },
      {
        label: "Low Stock",
        value: (inv?.low_stock_count ?? 0).toString(),
        icon: AlertTriangle,
        color: "bg-amber-500",
        tooltip: "Products below their configured reorder level",
      },
      {
        label: "Out of Stock",
        value: (inv?.out_of_stock_count ?? 0).toString(),
        icon: PackageX,
        color: "bg-red-500",
        tooltip: "Products completely out of stock",
      },
    ];
  }, [inventoryStats]);

  // ── Chart data ─────────────────────────────────────────────────────────
  const categoryChartData = useMemo<ChartDataPoint[]>(() => {
    if (!productStats?.products_by_category) return [];
    return productStats.products_by_category
      .filter((c) => c.count > 0)
      .slice(0, 8)
      .map((c) => ({ label: c.category_name || "Uncategorized", value: c.count }));
  }, [productStats]);

  const stockValueChartData = useMemo<ChartDataPoint[]>(() => {
    if (!inventoryStats?.stock_value_by_category) return [];
    return inventoryStats.stock_value_by_category
      .filter((c) => c.total_value > 0)
      .slice(0, 8)
      .map((c) => ({
        label: c.category_name || "Uncategorized",
        value: c.total_value,
      }));
  }, [inventoryStats]);

  // ── Low stock & expiring ───────────────────────────────────────────────
  const lowStockAlerts = useMemo(() => {
    return lowStockItems.map((item) => ({
      id: item.id,
      name: item.product?.name ?? "Unknown Product",
      detail: `Stock: ${item.quantity_on_hand ?? 0} / Reorder: ${item.product?.reorder_level ?? 0}`,
      severity: (item.quantity_on_hand ?? 0) === 0 ? ("critical" as const) : ("warning" as const),
    }));
  }, [lowStockItems]);

  const expiringAlerts = useMemo(() => {
    return expiringBatches.map((batch) => ({
      id: batch.id,
      name: batch.product?.name ?? "Unknown Product",
      detail: `Batch: ${batch.batch_number ?? "—"} | Qty: ${batch.current_quantity ?? 0}`,
      severity: "warning" as const,
    }));
  }, [expiringBatches]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Inventory Reports</h1>
          <InfoTooltip content="Analyze inventory performance — view valuation summaries, category breakdowns, stock movement trends, and identify products needing attention." />
        </div>
        <p className="text-sm text-muted-foreground">
          Valuation, analytics, and stock movement insights.
        </p>
      </div>

      {/* Stats */}
      <StatCardGrid stats={reportStats} isLoading={isLoading} columns={4} />

      {/* Analytics Panel */}
      <AnalyticsPanel
        dashboardStats={inventoryStats}
        valuationSummary={valuationSummary}
        movementSummary={[]}
        isLoading={isLoading}
      />

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChartCard
          title="Products by Category"
          data={categoryChartData}
          isLoading={isLoading}
          layout="horizontal"
          color="#8b5cf6"
        />
        <BarChartCard
          title="Stock Value by Category"
          data={stockValueChartData}
          formatter={formatCurrency}
          isLoading={isLoading}
          layout="horizontal"
          color="#6366f1"
        />
      </div>

      {/* Top Moving Products */}
      {inventoryStats?.top_moving_products &&
        inventoryStats.top_moving_products.length > 0 && (
          <BarChartCard
            title="Top Moving Products"
            data={inventoryStats.top_moving_products.map((p) => ({
              label: p.product_name,
              value: p.total_quantity_moved,
            }))}
            isLoading={isLoading}
            layout="vertical"
            color="#10b981"
          />
        )}

      {/* Valuation Details */}
      {valuationSummary && (
        <MiniStatList
          title="Valuation Summary"
          icon={DollarSign}
          items={[
            {
              label: "Total Items",
              value: (valuationSummary.total_items ?? 0).toLocaleString("en-IN"),
            },
            {
              label: "Total Quantity",
              value: (valuationSummary.total_quantity ?? 0).toLocaleString("en-IN"),
            },
            {
              label: "Total Value",
              value: formatCurrency(valuationSummary.total_value ?? 0),
            },
            {
              label: "Avg Cost/Unit",
              value: formatCurrency(valuationSummary.average_cost_per_unit ?? 0),
            },
            ...(valuationSummary.highest_value_product
              ? [
                  {
                    label: "Highest Value Product",
                    value: `${valuationSummary.highest_value_product.product_name} (${formatCurrency(valuationSummary.highest_value_product.total_value)})`,
                  },
                ]
              : []),
          ]}
          isLoading={isLoading}
        />
      )}

      {/* Alert Widgets */}
      <div className="grid gap-5 lg:grid-cols-2">
        <StockAlertsList
          title="Low Stock Items"
          icon={AlertTriangle}
          items={lowStockAlerts}
          isLoading={isLoading}
          maxItems={10}
          onViewAll={() => router.push("/inventory/stock?filter=low-stock")}
        />
        <StockAlertsList
          title="Expiring Soon"
          icon={CalendarClock}
          items={expiringAlerts}
          isLoading={isLoading}
          maxItems={10}
          onViewAll={() => router.push("/inventory/stock?filter=expiring")}
        />
      </div>
    </div>
  );
}
