"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Warehouse,
  AlertTriangle,
  Truck,
  Clock,
  RefreshCw,
  BarChart3,
  PackageX,
  CalendarClock,
  ShieldAlert,
  Boxes,
  ClipboardList,
  PackageSearch,
  DollarSign,
  ShoppingCart,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  StatCardGrid,
  BarChartCard,
  DonutChartCard,
  StockAlertsList,
  QuickActions,
  MiniStatList,
  AlertBanner,
} from "@/components/dashboard";
import type {
  DashboardStatConfig,
  DashboardAlertItem,
  ChartDataPoint,
  QuickActionConfig,
} from "@/components/dashboard";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// InventoryDashboard – interactive dashboard focused on inventory management
// ============================================================================

type InventoryDashboardTab = "overview" | "stock" | "purchases" | "suppliers";

interface InventoryDashboardProps {
  basePath: string;
  title?: string;
  subtitle?: string;
  storeName?: string | null;
}

export function InventoryDashboard({
  basePath,
  title = "Inventory Dashboard",
  subtitle = "Real-time overview of stock levels, purchases, and suppliers",
  storeName,
}: InventoryDashboardProps) {
  const router = useRouter();
  const data = useDashboardData();

  const navigate = useCallback(
    (path: string) => router.push(path),
    [router]
  );

  // ── Alerts ───────────────────────────────────────────────────────────
  const alerts = useMemo<DashboardAlertItem[]>(() => {
    const items: DashboardAlertItem[] = [];

    if (data.inventoryStats && data.inventoryStats.out_of_stock_count > 0) {
      items.push({
        id: "out-of-stock",
        title: `${data.inventoryStats.out_of_stock_count} products out of stock`,
        description: "These products need immediate restocking",
        severity: "critical",
        icon: PackageX,
        action: {
          label: "View",
          onClick: () => navigate(`${basePath}/stock?filter=out-of-stock`),
        },
      });
    }

    if (data.inventoryStats && data.inventoryStats.expired_count > 0) {
      items.push({
        id: "expired",
        title: `${data.inventoryStats.expired_count} expired batches`,
        description: "Remove expired items from inventory",
        severity: "critical",
        icon: ShieldAlert,
        action: {
          label: "Review",
          onClick: () => navigate(`${basePath}/stock?filter=expired`),
        },
      });
    }

    if (data.inventoryStats && data.inventoryStats.low_stock_count > 0) {
      items.push({
        id: "low-stock",
        title: `${data.inventoryStats.low_stock_count} products running low`,
        description: "Consider reordering soon",
        severity: "warning",
        icon: AlertTriangle,
        action: {
          label: "View",
          onClick: () => navigate(`${basePath}/stock?filter=low-stock`),
        },
      });
    }

    if (data.unresolvedAlertCount > 0) {
      items.push({
        id: "unresolved-alerts",
        title: `${data.unresolvedAlertCount} unresolved stock alerts`,
        description: "Alerts require attention",
        severity: "warning",
        icon: AlertTriangle,
      });
    }

    if (data.purchaseStats && (data.purchaseStats.overdue_payments ?? 0) > 0) {
      items.push({
        id: "overdue-payments",
        title: `${data.purchaseStats.overdue_payments} overdue purchase payments`,
        description: "Supplier payments past due date",
        severity: "warning",
        icon: CalendarClock,
        action: {
          label: "View",
          onClick: () => navigate(`${basePath}/purchase-orders`),
        },
      });
    }

    return items;
  }, [data.inventoryStats, data.unresolvedAlertCount, data.purchaseStats, basePath, navigate]);

  // ── Overview stats ────────────────────────────────────────────────────
  const overviewStats = useMemo<DashboardStatConfig[]>(() => {
    const inv = data.inventoryStats;
    const p = data.purchaseStats;
    const sup = data.supplierStats;

    return [
      {
        label: "Total Products",
        value: (inv?.total_products ?? 0).toLocaleString("en-IN"),
        icon: Boxes,
        color: "bg-blue-500",
        subtitle: `${inv?.total_products ?? 0} tracked`,
        tooltip: "Total number of products in your inventory catalog",
        onClick: () => navigate(`${basePath}/products`),
      },
      {
        label: "Stock Value",
        value: formatCurrency(inv?.total_stock_value ?? 0),
        icon: Warehouse,
        color: "bg-violet-500",
        isCurrency: true,
        tooltip: "Total monetary value of all inventory on hand",
        onClick: () => navigate(`${basePath}/reports`),
      },
      {
        label: "Low Stock Items",
        value: (inv?.low_stock_count ?? 0).toString(),
        icon: AlertTriangle,
        color: "bg-amber-500",
        subtitle: `${inv?.out_of_stock_count ?? 0} out of stock`,
        tooltip: "Products below reorder level that need restocking",
        onClick: () => navigate(`${basePath}/stock?filter=low-stock`),
      },
      {
        label: "Out of Stock",
        value: (inv?.out_of_stock_count ?? 0).toString(),
        icon: PackageX,
        color: "bg-red-500",
        tooltip: "Products with zero stock — immediate attention required",
        onClick: () => navigate(`${basePath}/stock?filter=out-of-stock`),
      },
      {
        label: "Open POs",
        value: ((p?.confirmed_orders ?? 0) + (p?.draft_orders ?? 0)).toString(),
        icon: ClipboardList,
        color: "bg-blue-500",
        subtitle: `${p?.draft_orders ?? 0} draft`,
        tooltip: "Active purchase orders including drafts and confirmed orders",
        onClick: () => navigate(`${basePath}/purchase-orders`),
      },
      {
        label: "Pending Amount",
        value: formatCurrency(p?.unpaid_amount ?? 0),
        icon: CreditCard,
        color: "bg-orange-500",
        subtitle: `${p?.unpaid_orders ?? 0} orders`,
        isCurrency: true,
        tooltip: "Total unpaid amount across all purchase orders",
        onClick: () => navigate(`${basePath}/purchase-orders`),
      },
      {
        label: "Active Suppliers",
        value: (sup?.active_suppliers ?? 0).toString(),
        icon: Truck,
        color: "bg-teal-500",
        subtitle: `${sup?.total_suppliers ?? 0} total`,
        tooltip: "Number of active supplier relationships",
        onClick: () => navigate(`${basePath}/suppliers`),
      },
      {
        label: "Expiring Soon",
        value: (inv?.expiring_soon_count ?? data.expiringBatches.length).toString(),
        icon: CalendarClock,
        color: "bg-pink-500",
        subtitle: `${inv?.expired_count ?? 0} expired`,
        tooltip: "Products nearing expiry date — review and take action",
        onClick: () => navigate(`${basePath}/stock?filter=expiring`),
      },
    ];
  }, [data.inventoryStats, data.purchaseStats, data.supplierStats, data.expiringBatches, basePath, navigate]);

  // ── Stock tab stats ───────────────────────────────────────────────────
  const stockTabStats = useMemo<DashboardStatConfig[]>(() => {
    const inv = data.inventoryStats;
    return [
      {
        label: "Total Products",
        value: (inv?.total_products ?? 0).toLocaleString("en-IN"),
        icon: Package,
        color: "bg-blue-500",
        tooltip: "Total number of unique products in inventory",
      },
      {
        label: "Stock Value",
        value: formatCurrency(inv?.total_stock_value ?? 0),
        icon: Warehouse,
        color: "bg-violet-500",
        isCurrency: true,
        tooltip: "Aggregate value of all inventory at cost price",
      },
      {
        label: "Low Stock",
        value: (inv?.low_stock_count ?? 0).toString(),
        icon: AlertTriangle,
        color: "bg-amber-500",
        tooltip: "Items below their configured reorder level",
      },
      {
        label: "Out of Stock",
        value: (inv?.out_of_stock_count ?? 0).toString(),
        icon: PackageX,
        color: "bg-red-500",
        tooltip: "Items with zero quantity on hand",
      },
    ];
  }, [data.inventoryStats]);

  // ── Purchase tab stats ────────────────────────────────────────────────
  const purchaseTabStats = useMemo<DashboardStatConfig[]>(() => {
    const p = data.purchaseStats;
    return [
      {
        label: "Total Orders",
        value: (p?.total_orders ?? 0).toString(),
        icon: ShoppingCart,
        color: "bg-blue-500",
        tooltip: "Total purchase orders created across all statuses",
      },
      {
        label: "This Month",
        value: formatCurrency(p?.this_month_total ?? 0),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${p?.this_month_count ?? 0} orders`,
        isCurrency: true,
        tooltip: "Total purchase value for the current month",
      },
      {
        label: "Unpaid Amount",
        value: formatCurrency(p?.unpaid_amount ?? 0),
        icon: CreditCard,
        color: "bg-red-500",
        subtitle: `${p?.unpaid_orders ?? 0} orders`,
        isCurrency: true,
        tooltip: "Outstanding payment due to suppliers",
      },
      {
        label: "Overdue Payments",
        value: (p?.overdue_payments ?? 0).toString(),
        icon: CalendarClock,
        color: "bg-orange-500",
        tooltip: "Supplier payments that are past their due date",
      },
    ];
  }, [data.purchaseStats]);

  // ── Chart data: products by category ──────────────────────────────────
  const categoryChartData = useMemo<ChartDataPoint[]>(() => {
    if (!data.productStats?.products_by_category) return [];
    return data.productStats.products_by_category
      .filter((c) => c.count > 0)
      .slice(0, 8)
      .map((c) => ({ label: c.category_name || "Uncategorized", value: c.count }));
  }, [data.productStats]);

  // ── Chart data: stock value by category ───────────────────────────────
  const stockValueChartData = useMemo<ChartDataPoint[]>(() => {
    if (!data.inventoryStats?.stock_value_by_category) return [];
    return data.inventoryStats.stock_value_by_category
      .filter((c) => c.total_value > 0)
      .slice(0, 8)
      .map((c) => ({
        label: c.category_name || "Uncategorized",
        value: c.total_value,
      }));
  }, [data.inventoryStats]);

  // ── Chart data: purchase order status ─────────────────────────────────
  const purchaseStatusChart = useMemo<ChartDataPoint[]>(() => {
    const p = data.purchaseStats;
    if (!p) return [];
    return [
      { label: "Draft", value: p.draft_orders ?? 0, color: "#6b7280" },
      { label: "Confirmed", value: p.confirmed_orders ?? 0, color: "#3b82f6" },
      { label: "Received", value: p.received_orders ?? 0, color: "#10b981" },
      { label: "Cancelled", value: p.cancelled_orders ?? 0, color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [data.purchaseStats]);

  // ── Low stock items for widget ────────────────────────────────────────
  const lowStockAlerts = useMemo(() => {
    return data.lowStockItems.map((item) => ({
      id: item.id,
      name: item.product?.name ?? "Unknown Product",
      detail: `Stock: ${item.quantity_on_hand ?? 0} / Reorder: ${item.product?.reorder_level ?? 0}`,
      severity: (item.quantity_on_hand ?? 0) === 0 ? ("critical" as const) : ("warning" as const),
    }));
  }, [data.lowStockItems]);

  // ── Expiring batches for widget ───────────────────────────────────────
  const expiringAlerts = useMemo(() => {
    return data.expiringBatches.map((batch) => ({
      id: batch.id,
      name: batch.product?.name ?? "Unknown Product",
      detail: `Batch: ${batch.batch_number ?? "—"} | Qty: ${batch.current_quantity ?? 0}`,
      severity: "warning" as const,
    }));
  }, [data.expiringBatches]);

  // ── Quick actions ─────────────────────────────────────────────────────
  const quickActions = useMemo<QuickActionConfig[]>(
    () => [
      {
        label: "Stock Levels",
        description: "View & manage stock",
        icon: Package,
        href: `${basePath}/stock`,
        color: "bg-violet-500",
      },
      {
        label: "Products",
        description: "Manage catalog",
        icon: Boxes,
        href: `${basePath}/products`,
        color: "bg-blue-500",
      },
      {
        label: "Purchase Orders",
        description: "Create & track POs",
        icon: ClipboardList,
        href: `${basePath}/purchase-orders`,
        color: "bg-emerald-500",
      },
      {
        label: "Suppliers",
        description: "Vendor management",
        icon: Truck,
        href: `${basePath}/suppliers`,
        color: "bg-teal-500",
      },
      {
        label: "Reports",
        description: "Valuation & analytics",
        icon: BarChart3,
        href: `${basePath}/reports`,
        color: "bg-amber-500",
      },
      {
        label: "Audits",
        description: "Stock count & adjust",
        icon: PackageSearch,
        href: `${basePath}/audits`,
        color: "bg-pink-500",
      },
    ],
    [basePath]
  );

  // ── Supplier summary ─────────────────────────────────────────────────
  const supplierSummaryItems = useMemo(() => {
    const s = data.supplierStats;
    if (!s) return [];
    return [
      { label: "Total Suppliers", value: s.total_suppliers.toString() },
      { label: "Active", value: s.active_suppliers.toString(), color: "text-emerald-600 dark:text-emerald-400" },
      { label: "Preferred", value: s.preferred_suppliers.toString(), color: "text-blue-600 dark:text-blue-400" },
      { label: "Blacklisted", value: s.blacklisted_suppliers.toString(), color: s.blacklisted_suppliers > 0 ? "text-red-600 dark:text-red-400" : undefined },
      { label: "With GSTIN", value: s.with_gstin.toString() },
      { label: "Total Credit Limit", value: formatCurrency(s.total_credit_limit) },
    ];
  }, [data.supplierStats]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <InfoTooltip content="This dashboard shows a real-time overview of your inventory — stock levels, purchase orders, supplier health, and critical alerts that need your attention." />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          {storeName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {storeName}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => data.refresh()}
          disabled={data.isLoading}
          className="gap-2 self-start"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${data.isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} isLoading={data.isLoading} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {(
            [
              { value: "overview", label: "Overview" },
              { value: "stock", label: "Stock" },
              { value: "purchases", label: "Purchases" },
              { value: "suppliers", label: "Suppliers" },
            ] as { value: InventoryDashboardTab; label: string }[]
          ).map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs sm:text-sm px-3 py-1.5"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          <StatCardGrid
            stats={overviewStats}
            isLoading={data.isLoading}
            columns={4}
          />

          <div className="grid gap-5 lg:grid-cols-3">
            <QuickActions actions={quickActions} onNavigate={navigate} />

            <StockAlertsList
              title="Low Stock Items"
              icon={AlertTriangle}
              items={lowStockAlerts}
              isLoading={data.isLoading}
              onViewAll={() => navigate(`${basePath}/stock?filter=low-stock`)}
            />

            <StockAlertsList
              title="Expiring Soon"
              icon={CalendarClock}
              items={expiringAlerts}
              isLoading={data.isLoading}
              onViewAll={() => navigate(`${basePath}/stock?filter=expiring`)}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <BarChartCard
              title="Products by Category"
              data={categoryChartData}
              isLoading={data.isLoading}
              layout="horizontal"
              color="#8b5cf6"
            />
            <BarChartCard
              title="Stock Value by Category"
              data={stockValueChartData}
              formatter={formatCurrency}
              isLoading={data.isLoading}
              layout="horizontal"
              color="#6366f1"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <MiniStatList
              title="Suppliers"
              icon={Truck}
              items={supplierSummaryItems}
              isLoading={data.isLoading}
            />

            {data.purchaseStats && (
              <MiniStatList
                title="Purchase Summary"
                icon={ShoppingCart}
                items={[
                  {
                    label: "Total Amount",
                    value: formatCurrency(data.purchaseStats.total_amount ?? 0),
                  },
                  {
                    label: "Paid",
                    value: formatCurrency(data.purchaseStats.paid_amount ?? 0),
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    label: "Unpaid",
                    value: formatCurrency(data.purchaseStats.unpaid_amount ?? 0),
                    color: (data.purchaseStats.unpaid_amount ?? 0) > 0
                      ? "text-red-600 dark:text-red-400"
                      : undefined,
                  },
                  {
                    label: "Overdue",
                    value: (data.purchaseStats.overdue_payments ?? 0).toString(),
                    color: (data.purchaseStats.overdue_payments ?? 0) > 0
                      ? "text-red-600 dark:text-red-400"
                      : undefined,
                  },
                ]}
                isLoading={data.isLoading}
              />
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STOCK TAB                                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="stock" className="space-y-6">
          <StatCardGrid
            stats={stockTabStats}
            isLoading={data.isLoading}
            columns={4}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <BarChartCard
              title="Products by Category"
              data={categoryChartData}
              isLoading={data.isLoading}
              layout="horizontal"
              color="#8b5cf6"
            />
            <BarChartCard
              title="Stock Value by Category"
              data={stockValueChartData}
              formatter={formatCurrency}
              isLoading={data.isLoading}
              layout="horizontal"
              color="#6366f1"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <StockAlertsList
              title="Low Stock Items"
              icon={AlertTriangle}
              items={lowStockAlerts}
              isLoading={data.isLoading}
              maxItems={8}
              onViewAll={() => navigate(`${basePath}/stock?filter=low-stock`)}
            />

            <StockAlertsList
              title="Expiring Soon"
              icon={CalendarClock}
              items={expiringAlerts}
              isLoading={data.isLoading}
              maxItems={8}
              onViewAll={() => navigate(`${basePath}/stock?filter=expiring`)}
            />
          </div>

          {data.inventoryStats && (
            <div className="grid gap-5 lg:grid-cols-2">
              <MiniStatList
                title="Inventory Overview"
                icon={Warehouse}
                items={[
                  {
                    label: "Total Products",
                    value: (data.inventoryStats.total_products ?? 0).toLocaleString("en-IN"),
                  },
                  {
                    label: "Overstock",
                    value: (data.inventoryStats.overstock_count ?? 0).toString(),
                  },
                  {
                    label: "Expired",
                    value: (data.inventoryStats.expired_count ?? 0).toString(),
                    color: (data.inventoryStats.expired_count ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
                  },
                  {
                    label: "Transactions Today",
                    value: (data.inventoryStats.total_transactions_today ?? 0).toString(),
                  },
                  {
                    label: "Adjustments This Month",
                    value: (data.inventoryStats.total_adjustments_this_month ?? 0).toString(),
                  },
                ]}
                isLoading={data.isLoading}
              />

              {data.valuationSummary && (
                <MiniStatList
                  title="Valuation Summary"
                  icon={DollarSign}
                  items={[
                    {
                      label: "Total Items",
                      value: (data.valuationSummary.total_items ?? 0).toLocaleString("en-IN"),
                    },
                    {
                      label: "Total Quantity",
                      value: (data.valuationSummary.total_quantity ?? 0).toLocaleString("en-IN"),
                    },
                    {
                      label: "Total Value",
                      value: formatCurrency(data.valuationSummary.total_value ?? 0),
                    },
                    {
                      label: "Avg Cost/Unit",
                      value: formatCurrency(data.valuationSummary.average_cost_per_unit ?? 0),
                    },
                    ...(data.valuationSummary.highest_value_product
                      ? [
                          {
                            label: "Highest Value Product",
                            value: `${data.valuationSummary.highest_value_product.product_name} (${formatCurrency(data.valuationSummary.highest_value_product.total_value)})`,
                          },
                        ]
                      : []),
                  ]}
                  isLoading={data.isLoading}
                />
              )}
            </div>
          )}

          {data.inventoryStats?.top_moving_products &&
            data.inventoryStats.top_moving_products.length > 0 && (
              <BarChartCard
                title="Top Moving Products"
                data={data.inventoryStats.top_moving_products.map((p) => ({
                  label: p.product_name,
                  value: p.total_quantity_moved,
                }))}
                isLoading={data.isLoading}
                layout="vertical"
                color="#10b981"
              />
            )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PURCHASES TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="purchases" className="space-y-6">
          <StatCardGrid
            stats={purchaseTabStats}
            isLoading={data.isLoading}
            columns={4}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DonutChartCard
              title="Order Status Breakdown"
              data={purchaseStatusChart}
              isLoading={data.isLoading}
            />

            <MiniStatList
              title="Purchase Summary"
              icon={ShoppingCart}
              items={[
                {
                  label: "Total Amount",
                  value: formatCurrency(data.purchaseStats?.total_amount ?? 0),
                },
                {
                  label: "Paid",
                  value: formatCurrency(data.purchaseStats?.paid_amount ?? 0),
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Unpaid",
                  value: formatCurrency(data.purchaseStats?.unpaid_amount ?? 0),
                  color: (data.purchaseStats?.unpaid_amount ?? 0) > 0
                    ? "text-red-600 dark:text-red-400"
                    : undefined,
                },
                {
                  label: "Overdue Payments",
                  value: (data.purchaseStats?.overdue_payments ?? 0).toString(),
                  color: (data.purchaseStats?.overdue_payments ?? 0) > 0
                    ? "text-red-600 dark:text-red-400"
                    : undefined,
                },
              ]}
              isLoading={data.isLoading}
            />
          </div>

          <MiniStatList
            title="Suppliers"
            icon={Truck}
            items={supplierSummaryItems}
            isLoading={data.isLoading}
          />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SUPPLIERS TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="suppliers" className="space-y-6">
          <MiniStatList
            title="Supplier Overview"
            icon={Truck}
            items={supplierSummaryItems}
            isLoading={data.isLoading}
          />

          {data.purchaseStats && (
            <MiniStatList
              title="Purchase Orders"
              icon={ClipboardList}
              items={[
                {
                  label: "Total Orders",
                  value: (data.purchaseStats.total_orders ?? 0).toString(),
                },
                {
                  label: "This Month Total",
                  value: formatCurrency(data.purchaseStats.this_month_total ?? 0),
                },
                {
                  label: "Pending Delivery",
                  value: (data.purchaseStats.confirmed_orders ?? 0).toString(),
                  color: "text-blue-600 dark:text-blue-400",
                },
                {
                  label: "Outstanding",
                  value: formatCurrency(data.purchaseStats.unpaid_amount ?? 0),
                  color: (data.purchaseStats.unpaid_amount ?? 0) > 0
                    ? "text-red-600 dark:text-red-400"
                    : undefined,
                },
              ]}
              isLoading={data.isLoading}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
