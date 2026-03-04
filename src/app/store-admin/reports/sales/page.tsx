"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ReceiptText,
  CreditCard,
  RefreshCw,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StatCardGrid,
  PaymentBreakdownChart,
  TopProductsTable,
  MiniStatList,
} from "@/components/dashboard";
import type { DashboardStatConfig } from "@/components/dashboard";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ProductSalesReportTable } from "../../_components/sales";
import { useSalesReportData } from "@/hooks/use-sales-report-data";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// Sales Report Page – /store-admin/reports/sales
// Full date-range analytics for store admins (POS stays today-only)
// ============================================================================

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  const { stats: s, productReport, isLoading, refresh } = useSalesReportData(dateFrom, dateTo);

  // ── Stat cards ──────────────────────────────────────────────────────────
  const primaryStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Total Sales",
        value: formatCurrency(s.today_sales_amount),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${s.today_sales_count} transactions`,
        isCurrency: true,
      },
      {
        label: "Average Bill Value",
        value: formatCurrency(s.average_bill_value),
        icon: ReceiptText,
        color: "bg-blue-500",
        subtitle: `~${s.average_items_per_bill.toFixed(1)} items/bill`,
        isCurrency: true,
      },
      {
        label: "Discounts Given",
        value: formatCurrency(s.today_discount_total),
        icon: TrendingUp,
        color: "bg-orange-500",
        isCurrency: true,
      },
      {
        label: "Tax Collected",
        value: formatCurrency(s.today_tax_total),
        icon: ReceiptText,
        color: "bg-indigo-500",
        subtitle: "GST & other taxes",
        isCurrency: true,
      },
    ],
    [s]
  );

  const secondaryStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Credit Sales",
        value: s.today_credit_sales.toString(),
        icon: CreditCard,
        color: "bg-amber-500",
        subtitle: formatCurrency(s.today_credit_amount),
      },
      {
        label: "Outstanding",
        value: formatCurrency(s.total_outstanding),
        icon: CreditCard,
        color: "bg-red-500",
        subtitle: "Pending credit",
        isCurrency: true,
      },
      {
        label: "Returns",
        value: formatCurrency(s.today_returns_amount),
        icon: RotateCcw,
        color: "bg-pink-500",
        subtitle: `${s.today_returns_count} returns`,
        isCurrency: true,
      },
      {
        label: "Hold Bills",
        value: s.hold_bills_count.toString(),
        icon: ShoppingCart,
        color: "bg-slate-500",
        subtitle: "Pending checkout",
      },
    ],
    [s]
  );

  // ── Top products from product report ────────────────────────────────────
  const topProducts = useMemo(() => {
    return productReport
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10)
      .map((p) => ({
        product_name: p.product_name,
        product_code: p.product_code,
        quantity_sold: p.net_quantity_sold,
        revenue: p.total_revenue,
      }));
  }, [productReport]);

  // ── Payment breakdown ──────────────────────────────────────────────────
  const paymentData = useMemo(
    () => ({
      cash: s.today_cash,
      card: s.today_card,
      upi: s.today_upi,
      other: s.today_other,
      credit: s.today_credit_amount,
    }),
    [s]
  );

  // ── Profit summary from product report ─────────────────────────────────
  const profitSummary = useMemo(() => {
    const totalRevenue = productReport.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalCost = productReport.reduce((sum, p) => sum + p.total_cost, 0);
    const totalProfit = productReport.reduce((sum, p) => sum + p.total_profit, 0);
    const profitPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCost, totalProfit, profitPct };
  }, [productReport]);

  return (
    <div className="space-y-6">
      {/* Header + Date Range Picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Report</h1>
          <p className="text-muted-foreground text-sm">
            Analyze sales performance across any date range
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

      {/* Primary stats */}
      <StatCardGrid stats={primaryStats} isLoading={isLoading} columns={4} />

      {/* Payment breakdown + Top products */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PaymentBreakdownChart
          cash={paymentData.cash}
          card={paymentData.card}
          upi={paymentData.upi}
          other={paymentData.other}
          credit={paymentData.credit}
          formatter={formatCurrency}
          isLoading={isLoading}
        />
        <TopProductsTable
          products={topProducts}
          formatter={formatCurrency}
          isLoading={isLoading}
        />
      </div>

      {/* Credit & Returns stats */}
      <StatCardGrid stats={secondaryStats} isLoading={isLoading} columns={4} />

      {/* Detail breakdowns */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniStatList
          title="Sales Metrics"
          icon={BarChart3}
          items={[
            { label: "Total Transactions", value: s.today_sales_count.toString() },
            { label: "Gross Sales", value: formatCurrency(s.today_sales_amount) },
            { label: "Average Bill Value", value: formatCurrency(s.average_bill_value) },
            { label: "Avg Items/Bill", value: s.average_items_per_bill.toFixed(1) },
            {
              label: "Total Outstanding",
              value: formatCurrency(s.total_outstanding),
              color: s.total_outstanding > 0 ? "text-red-600 dark:text-red-400" : undefined,
            },
          ]}
          isLoading={isLoading}
        />

        <MiniStatList
          title="Profitability"
          icon={TrendingUp}
          items={[
            {
              label: "Total Revenue",
              value: formatCurrency(profitSummary.totalRevenue),
              color: "text-emerald-600 dark:text-emerald-400",
            },
            { label: "Total Cost", value: formatCurrency(profitSummary.totalCost) },
            {
              label: "Gross Profit",
              value: formatCurrency(profitSummary.totalProfit),
              color:
                profitSummary.totalProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
            },
            {
              label: "Profit Margin",
              value: `${profitSummary.profitPct.toFixed(1)}%`,
              color:
                profitSummary.profitPct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
            },
            {
              label: "Returns",
              value: formatCurrency(s.today_returns_amount),
              color: s.today_returns_amount > 0 ? "text-red-600 dark:text-red-400" : undefined,
            },
            {
              label: "Discounts",
              value: formatCurrency(s.today_discount_total),
              color: s.today_discount_total > 0 ? "text-orange-600 dark:text-orange-400" : undefined,
            },
          ]}
          isLoading={isLoading}
        />
      </div>

      {/* Product Sales Report Table */}
      {productReport.length > 0 && (
        <ProductSalesReportTable data={productReport} isLoading={isLoading} />
      )}
    </div>
  );
}
