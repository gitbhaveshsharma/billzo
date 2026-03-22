"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ReceiptText,
  RefreshCw,
  BarChart3,
  RotateCcw,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatCardGrid, BarChartCard } from "@/components/dashboard";
import type { DashboardStatConfig, ChartDataPoint } from "@/components/dashboard";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ProductSalesReportTable } from "@/app/store-admin/_components/sales";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { useSalesReportData } from "@/hooks/use-sales-report-data";
import { formatCurrency, formatPercentage } from "@/utils/sales.utils";

// ============================================================================
// ACCOUNTANT — INCOME STATEMENT (P&L)
// ============================================================================

export default function IncomeStatementPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  const { stats: s, productReport, isLoading, refresh } = useSalesReportData(dateFrom, dateTo);

  // ── Profit calculations from product report ────────────────────────────
  const pnl = useMemo(() => {
    const totalRevenue = productReport.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalCost = productReport.reduce((sum, p) => sum + p.total_cost, 0);
    const grossProfit = productReport.reduce((sum, p) => sum + p.total_profit, 0);
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Net revenue considers returns and discounts
    const returns = s.today_returns_amount;
    const discounts = s.today_discount_total;
    const netRevenue = s.today_sales_amount - returns - discounts;

    // Net profit = net revenue - COGS (simplified — no operating expenses in current system)
    const netProfit = netRevenue - totalCost;
    const netMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      grossSales: s.today_sales_amount,
      returns,
      discounts,
      netRevenue,
      cogs: totalCost,
      grossProfit,
      grossMarginPct,
      taxCollected: s.today_tax_total,
      netProfit,
      netMarginPct,
    };
  }, [s, productReport]);

  // ── KPI Cards ──────────────────────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Gross Sales",
        value: formatCurrency(pnl.grossSales),
        icon: DollarSign,
        color: "bg-emerald-500",
        subtitle: `${s.today_sales_count} transactions`,
        isCurrency: true,
        tooltip: "Total value of all completed sales before deductions",
      },
      {
        label: "COGS",
        value: formatCurrency(pnl.cogs),
        icon: ShoppingBag,
        color: "bg-orange-500",
        isCurrency: true,
        tooltip: "Cost of goods sold — the purchase price of products sold",
      },
      {
        label: "Gross Profit",
        value: formatCurrency(pnl.grossProfit),
        icon: pnl.grossProfit >= 0 ? TrendingUp : TrendingDown,
        color: pnl.grossProfit >= 0 ? "bg-emerald-500" : "bg-red-500",
        subtitle: `${pnl.grossMarginPct.toFixed(1)}% margin`,
        isCurrency: true,
        tooltip: "Revenue minus COGS before other deductions",
      },
      {
        label: "Net Profit",
        value: formatCurrency(pnl.netProfit),
        icon: pnl.netProfit >= 0 ? TrendingUp : TrendingDown,
        color: pnl.netProfit >= 0 ? "bg-emerald-500" : "bg-red-500",
        subtitle: `${pnl.netMarginPct.toFixed(1)}% margin`,
        isCurrency: true,
        tooltip: "Profit after returns, discounts, and COGS",
      },
    ],
    [pnl, s.today_sales_count]
  );

  // ── Top profitable products bar chart ──────────────────────────────────
  const profitByProduct = useMemo<ChartDataPoint[]>(() => {
    return productReport
      .sort((a, b) => b.total_profit - a.total_profit)
      .slice(0, 8)
      .map((p) => ({
        label: p.product_name.length > 20 ? p.product_name.slice(0, 18) + "…" : p.product_name,
        value: p.total_profit,
        color: p.total_profit >= 0 ? "#10b981" : "#ef4444",
      }));
  }, [productReport]);

  // ── Revenue by product (top 8) ────────────────────────────────────────
  const revenueByProduct = useMemo<ChartDataPoint[]>(() => {
    return productReport
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 8)
      .map((p) => ({
        label: p.product_name.length > 20 ? p.product_name.slice(0, 18) + "…" : p.product_name,
        value: p.total_revenue,
      }));
  }, [productReport]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Income Statement
            </h1>
            <InfoTooltip content="The income statement (P&L) shows your store's profitability: revenue earned, cost of goods sold, and the resulting profit or loss. Select a date range to compare periods." />
          </div>
          <p className="text-sm text-muted-foreground">
            Profit & loss analysis with product-level breakdown.
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

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={4} />

      {/* P&L Statement Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Profit & Loss Statement
            <InfoTooltip content="Step-by-step breakdown from gross sales down to net profit, showing each deduction along the way." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Revenue Section */}
            <PnlRow label="Gross Sales" value={pnl.grossSales} bold tooltip="Total invoiced amount" />
            <PnlRow label="Less: Returns" value={-pnl.returns} negative tooltip="Goods returned by customers" />
            <PnlRow label="Less: Discounts" value={-pnl.discounts} negative tooltip="Discounts applied on items and bills" />
            <Separator />
            <PnlRow label="Net Revenue" value={pnl.netRevenue} bold highlight tooltip="Sales minus returns and discounts" />

            {/* COGS Section */}
            <div className="pt-2" />
            <PnlRow label="Less: Cost of Goods Sold" value={-pnl.cogs} negative tooltip="Purchase cost of items sold" />
            <Separator />
            <PnlRow
              label="Gross Profit"
              value={pnl.grossProfit}
              bold
              highlight
              tooltip="Revenue minus COGS"
            />
            <PnlRow
              label="Gross Margin"
              value={pnl.grossMarginPct}
              isPercent
              tooltip="Gross profit as a percentage of revenue"
            />

            {/* Tax */}
            <div className="pt-2" />
            <PnlRow label="GST Collected" value={pnl.taxCollected} tooltip="Tax collected on sales (liability, not income)" />
            <Separator />
            <PnlRow
              label="Net Profit (before operating expenses)"
              value={pnl.netProfit}
              bold
              highlight
              tooltip="This is a simplified P&L. Operating expenses (rent, salaries, utilities) are not tracked in this system."
            />
            <PnlRow
              label="Net Profit Margin"
              value={pnl.netMarginPct}
              isPercent
              tooltip="Net profit as a percentage of net revenue"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChartCard
          title="Profit by Product (Top 8)"
          data={profitByProduct}
          formatter={formatCurrency}
          isLoading={isLoading}
          color="#10b981"
        />
        <BarChartCard
          title="Revenue by Product (Top 8)"
          data={revenueByProduct}
          formatter={formatCurrency}
          isLoading={isLoading}
          color="#3b82f6"
        />
      </div>

      {/* Full Product Report */}
      <ProductSalesReportTable data={productReport} isLoading={isLoading} />
    </div>
  );
}

// ============================================================================
// PnlRow — helper for the P&L statement breakdown
// ============================================================================

interface PnlRowProps {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
  isPercent?: boolean;
  tooltip?: string;
}

function PnlRow({ label, value, bold, highlight, negative, isPercent, tooltip }: PnlRowProps) {
  const formatted = isPercent ? formatPercentage(value) : formatCurrency(Math.abs(value));
  const sign = !isPercent && value < 0 ? "(" : "";
  const signEnd = !isPercent && value < 0 ? ")" : "";

  const valueColor = negative
    ? "text-red-600 dark:text-red-400"
    : highlight && value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : highlight && value < 0
    ? "text-red-600 dark:text-red-400"
    : "";

  return (
    <div className={`flex items-center justify-between py-1 ${bold ? "font-semibold" : "text-sm"}`}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </span>
      <span className={`font-mono ${valueColor}`}>
        {sign}{formatted}{signEnd}
      </span>
    </div>
  );
}
