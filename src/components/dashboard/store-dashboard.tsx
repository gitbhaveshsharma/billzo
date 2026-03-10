"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Truck,
  Clock,
  CreditCard,
  ReceiptText,
  Warehouse,
  UserCheck,
  RefreshCw,
  BarChart3,
  PackageX,
  CalendarClock,
  ShieldAlert,
  Boxes,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StatCardGrid,
  BarChartCard,
  DonutChartCard,
  PaymentBreakdownChart,
  TopProductsTable,
  StockAlertsList,
  QuickActions,
  ShiftStatusWidget,
  MiniStatList,
  AlertBanner,
} from "@/components/dashboard";
import type {
  DashboardStatConfig,
  DashboardAlertItem,
  ChartDataPoint,
  QuickActionConfig,
  DashboardTab,
} from "@/components/dashboard";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// StoreDashboard – shared interactive dashboard for store_admin & manager
// ============================================================================

interface StoreDashboardProps {
  /** Role-specific base path for navigation (e.g., "/store-admin" or "/manager") */
  basePath: string;
  /** Page title */
  title?: string;
  /** Page subtitle */
  subtitle?: string;
}

export function StoreDashboard({
  basePath,
  title = "Dashboard",
  subtitle = "Real-time overview of your store performance",
}: StoreDashboardProps) {
  const router = useRouter();
  const { appUser } = useAuth();
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

    return items;
  }, [data.inventoryStats, data.unresolvedAlertCount, basePath, navigate]);

  // ── Overview stats ────────────────────────────────────────────────────
  const overviewStats = useMemo<DashboardStatConfig[]>(() => {
    const s = data.salesStats;
    const inv = data.inventoryStats;
    const cust = data.customerStats;
    const staff = data.staffStats;

    return [
      {
        label: "Today's Sales",
        value: formatCurrency(s?.today_sales_amount ?? 0),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${s?.today_sales_count ?? 0} transactions`,
        isCurrency: true,
      },
      {
        label: "Average Bill Value",
        value: formatCurrency(s?.average_bill_value ?? 0),
        icon: ReceiptText,
        color: "bg-blue-500",
        subtitle: `~${s?.average_items_per_bill?.toFixed(1) ?? "0"} items/bill`,
        isCurrency: true,
      },
      {
        label: "Inventory Value",
        value: formatCurrency(inv?.total_stock_value ?? 0),
        icon: Warehouse,
        color: "bg-violet-500",
        subtitle: `${inv?.total_products ?? 0} products`,
        isCurrency: true,
      },
      {
        label: "Total Customers",
        value: (cust?.total_customers ?? 0).toLocaleString("en-IN"),
        icon: Users,
        color: "bg-amber-500",
        subtitle: `${cust?.new_customers_this_month ?? 0} new this month`,
      },
      {
        label: "Outstanding Credit",
        value: formatCurrency(s?.total_outstanding ?? 0),
        icon: CreditCard,
        color: "bg-red-500",
        subtitle: `${s?.today_credit_sales ?? 0} credit sales today`,
        isCurrency: true,
      },
      {
        label: "Hold Bills",
        value: (s?.hold_bills_count ?? 0).toString(),
        icon: Clock,
        color: "bg-orange-500",
        subtitle: "Pending checkout",
      },
      {
        label: "Returns Today",
        value: formatCurrency(s?.today_returns_amount ?? 0),
        icon: RefreshCw,
        color: "bg-pink-500",
        subtitle: `${s?.today_returns_count ?? 0} returns`,
        isCurrency: true,
      },
      {
        label: "Active Staff",
        value: (staff?.active_users ?? 0).toString(),
        icon: UserCheck,
        color: "bg-teal-500",
        subtitle: `${staff?.total_users ?? 0} total`,
      },
    ];
  }, [data.salesStats, data.inventoryStats, data.customerStats, data.staffStats]);

  // ── Sales tab stats ───────────────────────────────────────────────────
  const salesTabStats = useMemo<DashboardStatConfig[]>(() => {
    const s = data.salesStats;
    return [
      {
        label: "Total Sales",
        value: formatCurrency(s?.today_sales_amount ?? 0),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${s?.today_sales_count ?? 0} bills`,
      },
      {
        label: "Discounts Given",
        value: formatCurrency(s?.today_discount_total ?? 0),
        icon: TrendingUp,
        color: "bg-orange-500",
      },
      {
        label: "Tax Collected",
        value: formatCurrency(s?.today_tax_total ?? 0),
        icon: ReceiptText,
        color: "bg-blue-500",
      },
      {
        label: "Credit Amount",
        value: formatCurrency(s?.today_credit_amount ?? 0),
        icon: CreditCard,
        color: "bg-red-500",
        subtitle: `${s?.today_credit_sales ?? 0} credit bills`,
      },
    ];
  }, [data.salesStats]);

  // ── Inventory tab stats ───────────────────────────────────────────────
  const inventoryTabStats = useMemo<DashboardStatConfig[]>(() => {
    const inv = data.inventoryStats;
    return [
      {
        label: "Total Products",
        value: (inv?.total_products ?? 0).toLocaleString("en-IN"),
        icon: Package,
        color: "bg-blue-500",
      },
      {
        label: "Stock Value",
        value: formatCurrency(inv?.total_stock_value ?? 0),
        icon: Warehouse,
        color: "bg-violet-500",
        isCurrency: true,
      },
      {
        label: "Low Stock",
        value: (inv?.low_stock_count ?? 0).toString(),
        icon: AlertTriangle,
        color: "bg-amber-500",
      },
      {
        label: "Out of Stock",
        value: (inv?.out_of_stock_count ?? 0).toString(),
        icon: PackageX,
        color: "bg-red-500",
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
      },
      {
        label: "This Month",
        value: formatCurrency(p?.this_month_total ?? 0),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${p?.this_month_count ?? 0} orders`,
        isCurrency: true,
      },
      {
        label: "Unpaid Amount",
        value: formatCurrency(p?.unpaid_amount ?? 0),
        icon: CreditCard,
        color: "bg-red-500",
        subtitle: `${p?.unpaid_orders ?? 0} orders`,
        isCurrency: true,
      },
      {
        label: "Overdue Payments",
        value: (p?.overdue_payments ?? 0).toString(),
        icon: CalendarClock,
        color: "bg-orange-500",
      },
    ];
  }, [data.purchaseStats]);

  // ── Shift tab stats ───────────────────────────────────────────────────
  const shiftTabStats = useMemo<DashboardStatConfig[]>(() => {
    const sh = data.shiftStats;
    return [
      {
        label: "Today's Revenue",
        value: formatCurrency(sh?.today_total_revenue ?? 0),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${sh?.today_total_sales ?? 0} sales`,
        isCurrency: true,
      },
      {
        label: "Open Shifts",
        value: (sh?.open_shifts_count ?? 0).toString(),
        icon: Clock,
        color: "bg-blue-500",
      },
      {
        label: "Cash In Hand",
        value: formatCurrency(sh?.total_cash_in_today ?? 0),
        icon: DollarSign,
        color: "bg-teal-500",
        isCurrency: true,
      },
      {
        label: "Avg Sales/Shift",
        value: formatCurrency(sh?.average_sales_per_shift ?? 0),
        icon: BarChart3,
        color: "bg-violet-500",
        isCurrency: true,
      },
    ];
  }, [data.shiftStats]);

  // ── Customer tab stats ────────────────────────────────────────────────
  const customerTabStats = useMemo<DashboardStatConfig[]>(() => {
    const c = data.customerStats;
    return [
      {
        label: "Total Customers",
        value: (c?.total_customers ?? 0).toLocaleString("en-IN"),
        icon: Users,
        color: "bg-blue-500",
      },
      {
        label: "Active",
        value: (c?.active_customers ?? 0).toLocaleString("en-IN"),
        icon: UserCheck,
        color: "bg-emerald-500",
      },
      {
        label: "With Credit",
        value: (c?.customers_with_credit ?? 0).toString(),
        icon: CreditCard,
        color: "bg-amber-500",
        subtitle: formatCurrency(c?.total_outstanding ?? 0),
      },
      {
        label: "VIP Customers",
        value: (c?.vip_customers ?? 0).toString(),
        icon: Users,
        color: "bg-violet-500",
      },
    ];
  }, [data.customerStats]);

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

  // ── Chart data: customers by type ─────────────────────────────────────
  const customerTypeChart = useMemo<ChartDataPoint[]>(() => {
    if (!data.customerStats?.customers_by_type) return [];
    return data.customerStats.customers_by_type
      .filter((c) => c.count > 0)
      .map((c) => ({
        label: c.customer_type.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
        value: c.count,
      }));
  }, [data.customerStats]);

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
        label: "Sales",
        description: "View sales",
        icon: DollarSign,
        href: `${basePath}/sales`,
        color: "bg-emerald-500",
      },
      {
        label: "Inventory",
        description: "Manage stock",
        icon: Package,
        href: `${basePath}/stock`,
        color: "bg-violet-500",
      },
      {
        label: "Purchases",
        description: "Order stock",
        icon: Truck,
        href: `${basePath}/purchases`,
        color: "bg-blue-500",
      },
      {
        label: "Products",
        description: "Catalog",
        icon: Boxes,
        href: `${basePath}/products`,
        color: "bg-pink-500",
      },
      {
        label: "Customers",
        description: "CRM",
        icon: Users,
        href: `${basePath}/customers`,
        color: "bg-amber-500",
      },
      {
        label: "Shifts",
        description: "Cash shifts",
        icon: Clock,
        href: `${basePath}/shifts`,
        color: "bg-teal-500",
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

  // ── Staff summary ────────────────────────────────────────────────────
  const staffSummaryItems = useMemo(() => {
    const s = data.staffStats;
    if (!s) return [];
    return [
      { label: "Total Staff", value: s.total_users.toString() },
      { label: "Active", value: s.active_users.toString(), color: "text-emerald-600 dark:text-emerald-400" },
      { label: "Banned", value: s.banned_users.toString(), color: s.banned_users > 0 ? "text-red-600 dark:text-red-400" : undefined },
      { label: "Recent Logins (7d)", value: s.recent_logins.toString() },
      { label: "Never Logged In", value: s.never_logged_in.toString(), color: s.never_logged_in > 0 ? "text-amber-600 dark:text-amber-400" : undefined },
    ];
  }, [data.staffStats]);

  // ── Top products from sales ───────────────────────────────────────────
  const topProducts = useMemo(
    () => data.salesStats?.top_products ?? [],
    [data.salesStats]
  );

  // ── Top customers ─────────────────────────────────────────────────────
  const topCustomers = useMemo(
    () => data.customerStats?.top_customers ?? [],
    [data.customerStats]
  );

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          {appUser?.storeName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {appUser.storeName}
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
              { value: "sales", label: "Sales" },
              { value: "inventory", label: "Inventory" },
              { value: "purchases", label: "Purchases" },
              { value: "shifts", label: "Shifts" },
              { value: "customers", label: "Customers" },
            ] as { value: DashboardTab; label: string }[]
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

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Payment breakdown */}
            <PaymentBreakdownChart
              cash={data.salesStats?.today_cash ?? 0}
              card={data.salesStats?.today_card ?? 0}
              upi={data.salesStats?.today_upi ?? 0}
              other={data.salesStats?.today_other ?? 0}
              credit={data.salesStats?.today_credit_amount ?? 0}
              formatter={formatCurrency}
              isLoading={data.isLoading}
            />

            {/* Top selling products */}
            <TopProductsTable
              products={topProducts}
              formatter={formatCurrency}
              isLoading={data.isLoading}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Quick actions */}
            <QuickActions
              actions={quickActions}
              onNavigate={navigate}
            />

            {/* Low stock alerts */}
            <StockAlertsList
              title="Low Stock Items"
              icon={AlertTriangle}
              items={lowStockAlerts}
              isLoading={data.isLoading}
              onViewAll={() =>
                navigate(`${basePath}/stock?filter=low-stock`)
              }
            />

            {/* Shift status */}
            <ShiftStatusWidget
              openCount={data.shiftStats?.open_shifts_count ?? 0}
              closedToday={data.shiftStats?.closed_shifts_today ?? 0}
              avgDuration={
                data.shiftStats?.average_shift_duration_minutes ?? 0
              }
              avgSalesPerShift={
                data.shiftStats?.average_sales_per_shift ?? 0
              }
              formatter={formatCurrency}
              isLoading={data.isLoading}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Supplier summary */}
            <MiniStatList
              title="Suppliers"
              icon={Truck}
              items={supplierSummaryItems}
              isLoading={data.isLoading}
            />

            {/* Staff summary */}
            <MiniStatList
              title="Staff"
              icon={UserCheck}
              items={staffSummaryItems}
              isLoading={data.isLoading}
            />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SALES TAB                                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="sales" className="space-y-6">
          <StatCardGrid
            stats={salesTabStats}
            isLoading={data.isLoading}
            columns={4}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <PaymentBreakdownChart
              cash={data.salesStats?.today_cash ?? 0}
              card={data.salesStats?.today_card ?? 0}
              upi={data.salesStats?.today_upi ?? 0}
              other={data.salesStats?.today_other ?? 0}
              credit={data.salesStats?.today_credit_amount ?? 0}
              formatter={formatCurrency}
              isLoading={data.isLoading}
            />

            <TopProductsTable
              products={topProducts}
              formatter={formatCurrency}
              isLoading={data.isLoading}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <MiniStatList
              title="Sales Metrics"
              icon={BarChart3}
              items={[
                {
                  label: "Average Bill Value",
                  value: formatCurrency(data.salesStats?.average_bill_value ?? 0),
                },
                {
                  label: "Avg Items/Bill",
                  value: (data.salesStats?.average_items_per_bill ?? 0).toFixed(1),
                },
                {
                  label: "Total Outstanding",
                  value: formatCurrency(data.salesStats?.total_outstanding ?? 0),
                  color: (data.salesStats?.total_outstanding ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
                },
                {
                  label: "Hold Bills",
                  value: (data.salesStats?.hold_bills_count ?? 0).toString(),
                  color: (data.salesStats?.hold_bills_count ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
                },
              ]}
              isLoading={data.isLoading}
            />

            <MiniStatList
              title="Returns & Discounts"
              icon={RefreshCw}
              items={[
                {
                  label: "Returns Today",
                  value: (data.salesStats?.today_returns_count ?? 0).toString(),
                },
                {
                  label: "Return Amount",
                  value: formatCurrency(data.salesStats?.today_returns_amount ?? 0),
                  color: (data.salesStats?.today_returns_amount ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
                },
                {
                  label: "Discounts Given",
                  value: formatCurrency(data.salesStats?.today_discount_total ?? 0),
                },
                {
                  label: "Tax Collected",
                  value: formatCurrency(data.salesStats?.today_tax_total ?? 0),
                },
              ]}
              isLoading={data.isLoading}
            />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* INVENTORY TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="inventory" className="space-y-6">
          <StatCardGrid
            stats={inventoryTabStats}
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
              onViewAll={() =>
                navigate(`${basePath}/stock?filter=low-stock`)
              }
            />

            <StockAlertsList
              title="Expiring Soon"
              icon={CalendarClock}
              items={expiringAlerts}
              isLoading={data.isLoading}
              maxItems={8}
              onViewAll={() =>
                navigate(`${basePath}/stock?filter=expiring`)
              }
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
        {/* SHIFTS TAB                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="shifts" className="space-y-6">
          <StatCardGrid
            stats={shiftTabStats}
            isLoading={data.isLoading}
            columns={4}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <ShiftStatusWidget
              openCount={data.shiftStats?.open_shifts_count ?? 0}
              closedToday={data.shiftStats?.closed_shifts_today ?? 0}
              avgDuration={
                data.shiftStats?.average_shift_duration_minutes ?? 0
              }
              avgSalesPerShift={
                data.shiftStats?.average_sales_per_shift ?? 0
              }
              formatter={formatCurrency}
              isLoading={data.isLoading}
            />

            {data.shiftStats && (
              <MiniStatList
                title="Shift Payment Breakdown"
                icon={DollarSign}
                items={[
                  {
                    label: "Cash Sales",
                    value: formatCurrency(data.shiftStats.today_cash_sales ?? 0),
                  },
                  {
                    label: "Card Sales",
                    value: formatCurrency(data.shiftStats.today_card_sales ?? 0),
                  },
                  {
                    label: "UPI Sales",
                    value: formatCurrency(data.shiftStats.today_upi_sales ?? 0),
                  },
                  {
                    label: "Other",
                    value: formatCurrency(data.shiftStats.today_other_sales ?? 0),
                  },
                  {
                    label: "Returns",
                    value: formatCurrency(data.shiftStats.today_total_returns ?? 0),
                    color: (data.shiftStats.today_total_returns ?? 0) > 0
                      ? "text-red-600 dark:text-red-400"
                      : undefined,
                  },
                  {
                    label: "Discounts",
                    value: formatCurrency(data.shiftStats.today_total_discounts ?? 0),
                  },
                ]}
                isLoading={data.isLoading}
              />
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CUSTOMERS TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="customers" className="space-y-6">
          <StatCardGrid
            stats={customerTabStats}
            isLoading={data.isLoading}
            columns={4}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DonutChartCard
              title="Customers by Type"
              data={customerTypeChart}
              isLoading={data.isLoading}
            />

            {topCustomers.length > 0 && (
              <TopCustomersTable
                customers={topCustomers}
                formatter={formatCurrency}
                isLoading={data.isLoading}
              />
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <MiniStatList
              title="Customer Metrics"
              icon={Users}
              items={[
                {
                  label: "Inactive",
                  value: (data.customerStats?.inactive_customers ?? 0).toString(),
                },
                {
                  label: "Blacklisted",
                  value: (data.customerStats?.blacklisted_customers ?? 0).toString(),
                  color: (data.customerStats?.blacklisted_customers ?? 0) > 0
                    ? "text-red-600 dark:text-red-400"
                    : undefined,
                },
                {
                  label: "Corporate",
                  value: (data.customerStats?.corporate_customers ?? 0).toString(),
                },
                {
                  label: "Total Loyalty Points",
                  value: (data.customerStats?.total_loyalty_points ?? 0).toLocaleString("en-IN"),
                },
                {
                  label: "New This Month",
                  value: (data.customerStats?.new_customers_this_month ?? 0).toString(),
                  color: "text-emerald-600 dark:text-emerald-400",
                },
              ]}
              isLoading={data.isLoading}
            />

            <MiniStatList
              title="Credit Overview"
              icon={CreditCard}
              items={[
                {
                  label: "Customers with Credit",
                  value: (data.customerStats?.customers_with_credit ?? 0).toString(),
                },
                {
                  label: "Total Outstanding",
                  value: formatCurrency(data.customerStats?.total_outstanding ?? 0),
                  color: (data.customerStats?.total_outstanding ?? 0) > 0
                    ? "text-red-600 dark:text-red-400"
                    : undefined,
                },
              ]}
              isLoading={data.isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// TopCustomersTable – top customers widget (internal)
// ============================================================================

function TopCustomersTable({
  customers,
  formatter,
  isLoading,
}: {
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    total_purchases: number;
    total_visits: number;
  }>;
  formatter: (value: number) => string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {customers.length > 0 ? (
          <div className="divide-y divide-border">
            {customers.slice(0, 5).map((customer, i) => (
              <div
                key={customer.id}
                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {customer.phone} &middot; {customer.total_visits} visits
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatter(customer.total_purchases)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            No customer data yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
