"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  DollarSign,
  TrendingUp,
  ReceiptText,
  CreditCard,
  RotateCcw,
  RefreshCw,
  BarChart3,
  ShoppingBag,
  FileText,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StatCardGrid,
  PaymentBreakdownChart,
  MiniStatList,
} from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ProductSalesReportTable } from "@/app/store-admin/_components/sales";
import { QuickActions } from "@/components/dashboard";
import type { QuickActionConfig } from "@/components/dashboard";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { useSalesReportData } from "@/hooks/use-sales-report-data";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// ACCOUNTANT — FINANCIAL REPORTS OVERVIEW
// ============================================================================

export default function ReportsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  const { stats: s, productReport, isLoading, refresh } = useSalesReportData(dateFrom, dateTo);

  // ── Profit metrics from product report ─────────────────────────────────
  const profitSummary = useMemo(() => {
    const totalRevenue = productReport.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalCost = productReport.reduce((sum, p) => sum + p.total_cost, 0);
    const totalProfit = productReport.reduce((sum, p) => sum + p.total_profit, 0);
    const profitPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCost, totalProfit, profitPct };
  }, [productReport]);

  // ── Primary KPI Cards ─────────────────────────────────────────────────
  const primaryStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Revenue",
        value: formatCurrency(s.today_sales_amount),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${s.today_sales_count} sales`,
        isCurrency: true,
        tooltip: "Total sales revenue in the selected period",
      },
      {
        label: "Cost of Goods Sold",
        value: formatCurrency(profitSummary.totalCost),
        icon: ShoppingBag,
        color: "bg-orange-500",
        isCurrency: true,
        tooltip: "Total purchase cost of products sold",
      },
      {
        label: "Gross Profit",
        value: formatCurrency(profitSummary.totalProfit),
        icon: TrendingUp,
        color: profitSummary.totalProfit >= 0 ? "bg-emerald-500" : "bg-red-500",
        subtitle: `${profitSummary.profitPct.toFixed(1)}% margin`,
        isCurrency: true,
        tooltip: "Revenue minus cost of goods sold",
      },
      {
        label: "Tax Collected",
        value: formatCurrency(s.today_tax_total),
        icon: Landmark,
        color: "bg-indigo-500",
        isCurrency: true,
        tooltip: "Total GST & cess collected on sales",
      },
    ],
    [s, profitSummary]
  );

  // ── Financial Summary ──────────────────────────────────────────────────
  const financialItems = useMemo(
    () => [
      {
        label: "Total Revenue",
        value: formatCurrency(s.today_sales_amount),
        color: "text-emerald-600 dark:text-emerald-400" as const,
        tooltip: "Gross sales revenue before returns and discounts",
      },
      {
        label: "Returns",
        value: `(${formatCurrency(s.today_returns_amount)})`,
        color: s.today_returns_amount > 0
          ? ("text-red-600 dark:text-red-400" as const)
          : undefined,
        tooltip: "Goods returned by customers — deducted from revenue",
      },
      {
        label: "Discounts Given",
        value: `(${formatCurrency(s.today_discount_total)})`,
        color: s.today_discount_total > 0
          ? ("text-orange-600 dark:text-orange-400" as const)
          : undefined,
        tooltip: "Item-level and bill-level discounts applied",
      },
      {
        label: "Net Revenue",
        value: formatCurrency(s.today_sales_amount - s.today_returns_amount - s.today_discount_total),
        color: "text-emerald-600 dark:text-emerald-400" as const,
        tooltip: "Revenue after returns and discounts",
      },
      {
        label: "COGS",
        value: `(${formatCurrency(profitSummary.totalCost)})`,
        tooltip: "Cost of goods sold — purchase cost of products sold",
      },
      {
        label: "Gross Profit",
        value: formatCurrency(profitSummary.totalProfit),
        color: profitSummary.totalProfit >= 0
          ? ("text-emerald-600 dark:text-emerald-400" as const)
          : ("text-red-600 dark:text-red-400" as const),
        tooltip: "Net revenue minus cost of goods sold",
      },
    ],
    [s, profitSummary]
  );

  const receivablesItems = useMemo(
    () => [
      {
        label: "Credit Sales",
        value: s.today_credit_sales.toString(),
        tooltip: "Number of credit transactions",
      },
      {
        label: "Credit Amount",
        value: formatCurrency(s.today_credit_amount),
        tooltip: "Total credit sales value",
      },
      {
        label: "Outstanding",
        value: formatCurrency(s.total_outstanding),
        color: s.total_outstanding > 0
          ? ("text-red-600 dark:text-red-400" as const)
          : undefined,
        tooltip: "Unpaid credit amount — accounts receivable",
      },
    ],
    [s]
  );

  // ── Quick links to sub-reports ─────────────────────────────────────────
  const quickActions = useMemo<QuickActionConfig[]>(
    () => [
      {
        label: "Income Statement",
        description: "Revenue, COGS, P&L analysis",
        icon: FileText,
        href: "/accountant/reports/income",
        color: "bg-emerald-500",
      },
      {
        label: "Balance Sheet",
        description: "Assets, liabilities, equity",
        icon: Landmark,
        href: "/accountant/reports/balance",
        color: "bg-blue-500",
      },
      {
        label: "Tax Report",
        description: "GST collected vs input credit",
        icon: ReceiptText,
        href: "/accountant/reports/tax",
        color: "bg-indigo-500",
      },
    ],
    []
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Financial Reports
            </h1>
            <InfoTooltip content="Comprehensive financial overview with profit & loss, payment breakdown, and product-level analysis. Select a date range to analyse any period." />
          </div>
          <p className="text-sm text-muted-foreground">
            Revenue, costs, profit, and receivables at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <StatCardGrid stats={primaryStats} isLoading={isLoading} columns={4} />

      {/* Payment Breakdown + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PaymentBreakdownChart
          cash={s.today_cash}
          card={s.today_card}
          upi={s.today_upi}
          other={s.today_other}
          credit={s.today_credit_amount}
          formatter={formatCurrency}
          isLoading={isLoading}
        />
        <QuickActions actions={quickActions} onNavigate={(href) => router.push(href)} />
      </div>

      {/* Financial Summary + Receivables */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniStatList
          title="Profit & Loss Summary"
          icon={BarChart3}
          items={financialItems}
          isLoading={isLoading}
        />
        <MiniStatList
          title="Accounts Receivable"
          icon={CreditCard}
          items={receivablesItems}
          isLoading={isLoading}
        />
      </div>

      {/* Product-Level Report */}
      <ProductSalesReportTable data={productReport} isLoading={isLoading} />
    </div>
  );
}
