"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingDown,
  CreditCard,
  Wallet,
  ShoppingCart,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Banknote,
  Receipt,
  Package,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useSalesStore } from "@/stores/sales.store";
import { usePurchaseStore } from "@/stores/purchase.store";
import { useCustomerStore } from "@/stores/customers.store";
import { useShiftsStore } from "@/stores/shifts.store";
import { useInventoryStore } from "@/stores/inventory.store";
import {
  StatCardGrid,
  BarChartCard,
  DonutChartCard,
  PaymentBreakdownChart,
  MiniStatList,
  QuickActions,
  AlertBanner,
} from "@/components/dashboard";
import type {
  DashboardStatConfig,
  ChartDataPoint,
  DashboardAlertItem,
  QuickActionConfig,
} from "@/components/dashboard";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// ACCOUNTANT DASHBOARD PAGE
// ============================================================================

export default function AccountantDashboardPage() {
  const router = useRouter();
  const { storeId, storeName } = useAccountant();

  // ── Store hooks ────────────────────────────────────────────────────────
  const {
    dashboardStats: salesStats,
    isLoading: salesLoading,
    fetchDashboardStats: fetchSalesStats,
  } = useSalesStore();

  const {
    dashboardStats: purchaseStats,
    isLoading: purchaseLoading,
    fetchDashboardStats: fetchPurchaseStats,
  } = usePurchaseStore();

  const {
    dashboardStats: customerStats,
    isLoading: customerLoading,
    fetchDashboardStats: fetchCustomerStats,
  } = useCustomerStore();

  const {
    dashboardStats: shiftStats,
    isLoading: shiftLoading,
    fetchDashboardStats: fetchShiftStats,
  } = useShiftsStore();

  const {
    dashboardStats: inventoryStats,
    isLoading: inventoryLoading,
    fetchDashboardStats: fetchInventoryStats,
  } = useInventoryStore();

  const isLoading =
    salesLoading || purchaseLoading || customerLoading || shiftLoading || inventoryLoading;

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchSalesStats(storeId);
    fetchPurchaseStats(storeId);
    fetchCustomerStats(storeId);
    fetchShiftStats(storeId);
    fetchInventoryStats(storeId);
  }, [
    storeId,
    fetchSalesStats,
    fetchPurchaseStats,
    fetchCustomerStats,
    fetchShiftStats,
    fetchInventoryStats,
  ]);

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  // ── Revenue & expense KPI cards ────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(() => {
    const todayRevenue = salesStats?.today_sales_amount ?? 0;
    const todayTax = salesStats?.today_tax_total ?? 0;
    const purchaseOutgoing = purchaseStats?.unpaid_amount ?? 0;
    const customerOutstanding = customerStats?.total_outstanding ?? 0;
    const todayReturns = salesStats?.today_returns_amount ?? 0;
    const avgBillValue = salesStats?.average_bill_value ?? 0;

    return [
      {
        label: "Today's Revenue",
        value: formatCurrency(todayRevenue),
        icon: DollarSign,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip:
          "Total sales revenue collected today (all payment methods combined, before returns)",
      },
      {
        label: "Tax Collected",
        value: formatCurrency(todayTax),
        icon: Receipt,
        color: "bg-blue-500",
        isCurrency: true,
        tooltip:
          "Total GST (CGST + SGST / IGST) and Cess collected on today's sales",
      },
      {
        label: "Purchase Payables",
        value: formatCurrency(purchaseOutgoing),
        icon: Package,
        color: "bg-orange-500",
        isCurrency: true,
        tooltip:
          "Total unpaid amount across all purchase orders to suppliers",
      },
      {
        label: "Customer Outstanding",
        value: formatCurrency(customerOutstanding),
        icon: Users,
        color: "bg-red-500",
        isCurrency: true,
        tooltip:
          "Sum of all unpaid credit-sale balances owed by customers",
      },
      {
        label: "Today's Returns",
        value: formatCurrency(todayReturns),
        icon: TrendingDown,
        color: "bg-yellow-500",
        isCurrency: true,
        tooltip:
          "Value of goods returned by customers today",
      },
      {
        label: "Avg Bill Value",
        value: formatCurrency(avgBillValue),
        icon: Banknote,
        color: "bg-violet-500",
        isCurrency: true,
        tooltip:
          "Average invoice value = Today's Revenue ÷ Number of bills",
      },
    ];
  }, [salesStats, purchaseStats, customerStats]);

  // ── Payment breakdown data ─────────────────────────────────────────────
  const cashSales = shiftStats?.today_cash_sales ?? salesStats?.today_cash ?? 0;
  const cardSales = shiftStats?.today_card_sales ?? salesStats?.today_card ?? 0;
  const upiSales = shiftStats?.today_upi_sales ?? salesStats?.today_upi ?? 0;
  const otherSales = shiftStats?.today_other_sales ?? salesStats?.today_other ?? 0;
  const creditSales = salesStats?.today_credit_amount ?? 0;

  // ── Purchase overview stats ────────────────────────────────────────────
  const purchaseKpi = useMemo<DashboardStatConfig[]>(() => {
    const ps = purchaseStats;
    return [
      {
        label: "Total POs",
        value: (ps?.total_orders ?? 0).toLocaleString("en-IN"),
        icon: FileText,
        color: "bg-slate-500",
        tooltip: "Total purchase orders created across all time",
      },
      {
        label: "This Month Purchases",
        value: formatCurrency(ps?.this_month_total ?? 0),
        icon: ShoppingCart,
        color: "bg-indigo-500",
        isCurrency: true,
        tooltip: "Total purchase order value created this calendar month",
      },
      {
        label: "Paid to Suppliers",
        value: formatCurrency(ps?.paid_amount ?? 0),
        icon: Wallet,
        color: "bg-green-500",
        isCurrency: true,
        tooltip: "Total amount already paid against purchase orders",
      },
      {
        label: "Overdue Payments",
        value: (ps?.overdue_payments ?? 0).toLocaleString("en-IN"),
        icon: AlertTriangle,
        color: "bg-red-600",
        tooltip: "Number of purchase orders past their payment due date",
      },
    ];
  }, [purchaseStats]);

  // ── Shift summary stats ────────────────────────────────────────────────
  const shiftKpi = useMemo(() => {
    const ss = shiftStats;
    return [
      {
        label: "Today Sales Count",
        value: (ss?.today_total_sales ?? 0).toLocaleString("en-IN"),
        tooltip: "Number of completed sales transactions today",
      },
      {
        label: "Today Discounts",
        value: formatCurrency(ss?.today_total_discounts ?? 0),
        tooltip: "Total discounts given on sales today",
      },
      {
        label: "Open Shifts",
        value: (ss?.open_shifts_count ?? 0).toLocaleString("en-IN"),
        tooltip: "Number of cash register shifts currently open",
      },
      {
        label: "Cash In Today",
        value: formatCurrency(ss?.total_cash_in_today ?? 0),
        tooltip: "Total cash received today (cash-in movements)",
      },
      {
        label: "Cash Out Today",
        value: formatCurrency(ss?.total_cash_out_today ?? 0),
        tooltip: "Total cash paid out today (cash-out movements)",
      },
    ];
  }, [shiftStats]);

  // ── Stock value chart ──────────────────────────────────────────────────
  const stockValueByCategory = useMemo<ChartDataPoint[]>(() => {
    if (!inventoryStats?.stock_value_by_category) return [];
    return inventoryStats.stock_value_by_category
      .filter((c) => c.total_value > 0)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 8)
      .map((c) => ({
        label: c.category_name || "Uncategorized",
        value: c.total_value,
      }));
  }, [inventoryStats]);

  // ── Alerts ─────────────────────────────────────────────────────────────
  const alerts = useMemo<DashboardAlertItem[]>(() => {
    const list: DashboardAlertItem[] = [];

    if ((purchaseStats?.overdue_payments ?? 0) > 0) {
      list.push({
        id: "overdue-po",
        title: "Overdue Supplier Payments",
        description: `${purchaseStats!.overdue_payments} purchase orders have crossed their payment due date.`,
        severity: "critical",
        icon: AlertTriangle,
        action: {
          label: "View",
          onClick: () => router.push("/accountant/transactions"),
        },
      });
    }

    if ((customerStats?.total_outstanding ?? 0) > 0) {
      list.push({
        id: "customer-outstanding",
        title: "Customer Outstanding",
        description: `${formatCurrency(customerStats!.total_outstanding)} total unpaid balance across ${customerStats!.customers_with_credit} customers.`,
        severity: "warning",
        icon: Users,
        action: {
          label: "Review",
          onClick: () => router.push("/accountant/invoices/customers"),
        },
      });
    }

    if ((purchaseStats?.draft_orders ?? 0) > 0) {
      list.push({
        id: "draft-pos",
        title: "Draft Purchase Orders",
        description: `${purchaseStats!.draft_orders} purchase orders are still in draft. Review and confirm them.`,
        severity: "info",
        icon: FileText,
      });
    }

    return list;
  }, [purchaseStats, customerStats, router]);

  // ── Quick actions ──────────────────────────────────────────────────────
  const quickActions = useMemo<QuickActionConfig[]>(
    () => [
      {
        label: "All Transactions",
        description: "View sales & purchase transactions",
        icon: CreditCard,
        href: "/accountant/transactions",
        color: "bg-blue-500",
      },
      {
        label: "Income Statement",
        description: "Revenue, cost & profit report",
        icon: TrendingUp,
        href: "/accountant/reports/income",
        color: "bg-emerald-500",
      },
      {
        label: "Tax Report",
        description: "GST collected & input credit",
        icon: BarChart3,
        href: "/accountant/reports/tax",
        color: "bg-indigo-500",
      },
      {
        label: "Customer Accounts",
        description: "Outstanding & credit management",
        icon: Users,
        href: "/accountant/invoices/customers",
        color: "bg-orange-500",
      },
    ],
    [],
  );

  // ── Customer breakdown chart ───────────────────────────────────────────
  const customerTypeChart = useMemo<ChartDataPoint[]>(() => {
    if (!customerStats?.customers_by_type) return [];
    return customerStats.customers_by_type
      .filter((c) => c.count > 0)
      .map((c) => ({
        label: c.customer_type,
        value: c.count,
      }));
  }, [customerStats]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {storeName ? `${storeName} — Financial Overview` : "Financial Overview"}
          </h1>
          <InfoTooltip content="This dashboard aggregates real-time financial data from sales, purchases, customer accounts, cash shifts and inventory. All figures are derived from actual transactions — nothing is hardcoded." />
        </div>
        <p className="text-sm text-muted-foreground">
          Revenue, expenses, payables and cash position at a glance.
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} />
      )}

      {/* Revenue & Financial KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          Today&apos;s Financial Summary
          <InfoTooltip content="Key revenue and expense metrics for the current business day. Updates in real-time as sales are completed." />
        </h2>
        <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={3} />
      </section>

      {/* Payment Breakdown + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PaymentBreakdownChart
          cash={cashSales}
          card={cardSales}
          upi={upiSales}
          other={otherSales}
          credit={creditSales}
          formatter={formatCurrency}
          isLoading={isLoading}
        />
        <QuickActions actions={quickActions} onNavigate={(href) => router.push(href)} />
      </div>

      {/* Purchase Overview */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          Purchase &amp; Supplier Obligations
          <InfoTooltip content="Overview of purchase orders, amounts paid, and outstanding supplier payables. Overdue count shows POs past their expected payment due date." />
        </h2>
        <StatCardGrid stats={purchaseKpi} isLoading={isLoading} columns={4} />
      </section>

      {/* Charts Row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChartCard
          title="Stock Value by Category"
          data={stockValueByCategory}
          formatter={formatCurrency}
          isLoading={isLoading}
          color="#8b5cf6"
          emptyMessage="No inventory data available"
        />
        <DonutChartCard
          title="Customer Type Distribution"
          data={customerTypeChart}
          isLoading={isLoading}
          emptyMessage="No customer data available"
        />
      </div>

      {/* Shift & Cash Summary */}
      <MiniStatList
        title="Cash Register & Shift Summary"
        icon={Wallet}
        items={shiftKpi}
        isLoading={isLoading}
      />
    </div>
  );
}
