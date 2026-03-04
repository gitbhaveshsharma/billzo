"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  DollarSign,
  TrendingUp,
  ReceiptText,
  CreditCard,
  RefreshCw,
  BarChart3,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StatCardGrid,
  PaymentBreakdownChart,
  DonutChartCard,
  MiniStatList,
} from "@/components/dashboard";
import type {
  DashboardStatConfig,
  ChartDataPoint,
} from "@/components/dashboard";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useSalesReportData } from "@/hooks/use-sales-report-data";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// Revenue Report Page – /store-admin/reports/revenue
// Full date-range revenue analytics for store admins (POS stays today-only)
// ============================================================================

export default function RevenueReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  const { stats: s, productReport, isLoading, refresh } = useSalesReportData(dateFrom, dateTo);

  const grossSales = s.today_sales_amount;
  const returns = s.today_returns_amount;
  const discounts = s.today_discount_total;
  const netRevenue = grossSales - returns - discounts;

  // ── Profit from product report ─────────────────────────────────────────
  const profitSummary = useMemo(() => {
    const totalRevenue = productReport.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalCost = productReport.reduce((sum, p) => sum + p.total_cost, 0);
    const totalProfit = productReport.reduce((sum, p) => sum + p.total_profit, 0);
    const profitPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCost, totalProfit, profitPct };
  }, [productReport]);

  // ── Primary revenue stats ──────────────────────────────────────────────
  const revenueStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Gross Sales",
        value: formatCurrency(grossSales),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${s.today_sales_count} transactions`,
        isCurrency: true,
        tooltip: "Total value of all sales before discounts and returns",
      },
      {
        label: "Net Revenue",
        value: formatCurrency(netRevenue),
        icon: TrendingUp,
        color: "bg-blue-500",
        subtitle: "After returns & discounts",
        isCurrency: true,
        tooltip: "Gross sales minus returns and discounts — what you actually earned",
      },
      {
        label: "Gross Profit",
        value: formatCurrency(profitSummary.totalProfit),
        icon: Wallet,
        color: profitSummary.totalProfit >= 0 ? "bg-teal-500" : "bg-red-500",
        subtitle: `${profitSummary.profitPct.toFixed(1)}% margin`,
        isCurrency: true,
        tooltip: "Revenue minus cost of goods sold — your actual earnings",
      },
      {
        label: "Tax Collected",
        value: formatCurrency(s.today_tax_total),
        icon: ReceiptText,
        color: "bg-indigo-500",
        subtitle: "GST & other taxes",
        isCurrency: true,
        tooltip: "Total GST and cess collected — this is owed to the government",
      },
    ],
    [grossSales, netRevenue, s, profitSummary]
  );

  // ── Payment method data ────────────────────────────────────────────────
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

  // ── Payment donut chart ────────────────────────────────────────────────
  const paymentMethodChart = useMemo<ChartDataPoint[]>(() => {
    const items: ChartDataPoint[] = [
      { label: "Cash", value: s.today_cash, color: "#10b981" },
      { label: "Card", value: s.today_card, color: "#3b82f6" },
      { label: "UPI", value: s.today_upi, color: "#8b5cf6" },
      { label: "Credit", value: s.today_credit_amount, color: "#f59e0b" },
      { label: "Other", value: s.today_other, color: "#6b7280" },
    ];
    return items.filter((d) => d.value > 0);
  }, [s]);

  // ── Deductions chart ───────────────────────────────────────────────────
  const deductionsChart = useMemo<ChartDataPoint[]>(() => {
    const items: ChartDataPoint[] = [
      { label: "Discounts", value: discounts, color: "#f97316" },
      { label: "Returns", value: returns, color: "#ef4444" },
    ];
    return items.filter((d) => d.value > 0);
  }, [discounts, returns]);

  return (
    <div className="space-y-6">
      {/* Header + Date Range Picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Report</h1>
          <p className="text-muted-foreground text-sm">
            Revenue analysis with payment breakdown and profitability
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

      {/* Revenue overview */}
      <StatCardGrid stats={revenueStats} isLoading={isLoading} columns={4} />

      {/* Payment breakdown chart + donut */}
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
        <DonutChartCard
          title="Payment Method Split"
          data={paymentMethodChart}
          isLoading={isLoading}
        />
      </div>

      {/* Deductions + Revenue waterfall */}
      <div className="grid gap-5 lg:grid-cols-2">
        {deductionsChart.length > 0 && (
          <DonutChartCard
            title="Deductions Breakdown"
            data={deductionsChart}
            isLoading={isLoading}
          />
        )}

        <MiniStatList
          title="Revenue Waterfall"
          icon={BarChart3}
          items={[
            {
              label: "Gross Sales",
              value: formatCurrency(grossSales),
              color: "text-emerald-600 dark:text-emerald-400",
              tooltip: "Total sales before any deductions",
            },
            {
              label: "Discounts",
              value: `- ${formatCurrency(discounts)}`,
              color: discounts > 0 ? "text-orange-600 dark:text-orange-400" : undefined,
              tooltip: "Item and bill discounts deducted from gross sales",
            },
            {
              label: "Returns",
              value: `- ${formatCurrency(returns)}`,
              color: returns > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Value of goods returned by customers",
            },
            {
              label: "Net Revenue",
              value: formatCurrency(netRevenue),
              color: "text-blue-600 dark:text-blue-400",
              tooltip: "Gross sales minus discounts and returns",
            },
            {
              label: "Tax (Included)",
              value: formatCurrency(s.today_tax_total),
              tooltip: "GST already included in the sale price, owed to government",
            },
          ]}
          isLoading={isLoading}
        />
      </div>

      {/* Profitability + Credit overview */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniStatList
          title="Profitability"
          icon={TrendingUp}
          items={[
            {
              label: "Total Revenue",
              value: formatCurrency(profitSummary.totalRevenue),
              color: "text-emerald-600 dark:text-emerald-400",
              tooltip: "Net selling price of all items sold",
            },
            {
              label: "Total Cost (COGS)",
              value: formatCurrency(profitSummary.totalCost),
              tooltip: "What you paid to purchase the goods you sold",
            },
            {
              label: "Gross Profit",
              value: formatCurrency(profitSummary.totalProfit),
              color:
                profitSummary.totalProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              tooltip: "Revenue minus cost — money earned after covering purchase cost",
            },
            {
              label: "Profit Margin",
              value: `${profitSummary.profitPct.toFixed(1)}%`,
              color:
                profitSummary.profitPct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              tooltip: "Percentage of revenue that is profit — higher is better",
            },
          ]}
          isLoading={isLoading}
        />

        <MiniStatList
          title="Credit & Outstanding"
          icon={CreditCard}
          items={[
            {
              label: "Credit Sales",
              value: s.today_credit_sales.toString(),
              tooltip: "Number of sales where payment is due later",
            },
            {
              label: "Credit Amount",
              value: formatCurrency(s.today_credit_amount),
              color: s.today_credit_amount > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
              tooltip: "Total value of sales given on credit",
            },
            {
              label: "Total Outstanding",
              value: formatCurrency(s.total_outstanding),
              color: s.total_outstanding > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "All unpaid credit across all customers — money yet to be collected",
            },
            {
              label: "Average Bill Value",
              value: formatCurrency(s.average_bill_value),
              tooltip: "Total sales divided by number of bills",
            },
          ]}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
