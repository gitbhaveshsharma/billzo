"use client";

import { useEffect, useMemo } from "react";
import {
  DollarSign,
  Warehouse,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { useProductStore } from "@/stores/product.store";
import {
  StatCardGrid,
  BarChartCard,
  MiniStatList,
} from "@/components/dashboard";
import type { DashboardStatConfig, ChartDataPoint } from "@/components/dashboard";
import { AnalyticsPanel } from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// INVENTORY MANAGER — VALUATION REPORT PAGE
// ============================================================================

export default function ValuationReportPage() {
  const { storeId } = useInventory();

  const {
    dashboardStats: inventoryStats,
    valuationSummary,
    isLoading: inventoryLoading,
    fetchDashboardStats: fetchInventoryStats,
    fetchValuationSummary,
  } = useInventoryStore();

  const {
    dashboardStats: productStats,
    isLoading: productLoading,
    fetchDashboardStats: fetchProductStats,
  } = useProductStore();

  const isLoading = inventoryLoading || productLoading;

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchInventoryStats(storeId);
    fetchValuationSummary(storeId);
    fetchProductStats(storeId);
  }, [storeId, fetchInventoryStats, fetchValuationSummary, fetchProductStats]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const valuationStats = useMemo<DashboardStatConfig[]>(() => {
    const inv = inventoryStats;
    const val = valuationSummary;
    return [
      {
        label: "Total Stock Value",
        value: formatCurrency(inv?.total_stock_value ?? 0),
        icon: Warehouse,
        color: "bg-violet-500",
        isCurrency: true,
        tooltip: "Sum of (quantity × average cost) across all inventory items",
      },
      {
        label: "Total Items",
        value: (val?.total_items ?? 0).toLocaleString("en-IN"),
        icon: Package,
        color: "bg-blue-500",
        tooltip: "Number of unique products with stock records",
      },
      {
        label: "Total Quantity",
        value: (val?.total_quantity ?? 0).toLocaleString("en-IN"),
        icon: TrendingUp,
        color: "bg-emerald-500",
        tooltip: "Aggregate unit count across all products",
      },
      {
        label: "Avg Cost / Unit",
        value: formatCurrency(val?.average_cost_per_unit ?? 0),
        icon: DollarSign,
        color: "bg-amber-500",
        isCurrency: true,
        tooltip: "Average cost per unit across the entire inventory",
      },
    ];
  }, [inventoryStats, valuationSummary]);

  // ── Chart data ─────────────────────────────────────────────────────────
  const valueByCategory = useMemo<ChartDataPoint[]>(() => {
    if (!inventoryStats?.stock_value_by_category) return [];
    return inventoryStats.stock_value_by_category
      .filter((c) => c.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)
      .map((c) => ({
        label: c.category_name || "Uncategorized",
        value: c.total_value,
      }));
  }, [inventoryStats]);

  const itemsByCategory = useMemo<ChartDataPoint[]>(() => {
    if (!inventoryStats?.stock_value_by_category) return [];
    return inventoryStats.stock_value_by_category
      .filter((c) => c.item_count > 0)
      .sort((a, b) => b.item_count - a.item_count)
      .slice(0, 10)
      .map((c) => ({
        label: c.category_name || "Uncategorized",
        value: c.item_count,
      }));
  }, [inventoryStats]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Inventory Valuation</h1>
          <InfoTooltip content="See the total monetary value of your inventory broken down by category. Use this to understand capital allocation, identify high-value categories, and plan procurement." />
        </div>
        <p className="text-sm text-muted-foreground">
          Stock value breakdown and category-level analysis.
        </p>
      </div>

      {/* Stats */}
      <StatCardGrid stats={valuationStats} isLoading={isLoading} columns={4} />

      {/* Analytics Panel (valuation-focused) */}
      <AnalyticsPanel
        dashboardStats={inventoryStats}
        valuationSummary={valuationSummary}
        movementSummary={[]}
        isLoading={isLoading}
      />

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChartCard
          title="Stock Value by Category"
          data={valueByCategory}
          formatter={formatCurrency}
          isLoading={isLoading}
          layout="horizontal"
          color="#8b5cf6"
        />
        <BarChartCard
          title="Items Count by Category"
          data={itemsByCategory}
          isLoading={isLoading}
          layout="horizontal"
          color="#6366f1"
        />
      </div>

      {/* Highest Value Product */}
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

      {/* Top Moving Products */}
      {inventoryStats?.top_moving_products &&
        inventoryStats.top_moving_products.length > 0 && (
          <BarChartCard
            title="Top Moving Products (by quantity)"
            data={inventoryStats.top_moving_products.map((p) => ({
              label: p.product_name,
              value: p.total_quantity_moved,
            }))}
            isLoading={isLoading}
            layout="vertical"
            color="#10b981"
          />
        )}
    </div>
  );
}
