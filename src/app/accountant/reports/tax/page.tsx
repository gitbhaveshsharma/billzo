"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Landmark,
  ReceiptText,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  RefreshCw,
  BarChart3,
  Info,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { usePurchaseStore } from "@/stores/purchase.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGrid, BarChartCard } from "@/components/dashboard";
import type { DashboardStatConfig, ChartDataPoint } from "@/components/dashboard";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { useSalesReportData } from "@/hooks/use-sales-report-data";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// ACCOUNTANT — TAX REPORT
// ============================================================================

export default function TaxReportPage() {
  const { storeId } = useAccountant();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  // Sales data — via the reusable hook
  const { stats: salesStats, isLoading: salesLoading, refresh } = useSalesReportData(dateFrom, dateTo);

  // Purchase data — for input credit
  const {
    orders,
    dashboardStats: purchaseStats,
    isLoading: purchaseLoading,
    fetchOrders,
    fetchDashboardStats: fetchPurchaseStats,
  } = usePurchaseStore();

  const isLoading = salesLoading || purchaseLoading;

  useEffect(() => {
    if (!storeId) return;
    fetchOrders(storeId);
    fetchPurchaseStats(storeId);
  }, [storeId, fetchOrders, fetchPurchaseStats]);

  // ========================================================================
  // COMPUTE TAX FIGURES
  // ========================================================================

  const tax = useMemo(() => {
    // OUTPUT TAX — tax collected from customers on sales
    const outputTax = salesStats.today_tax_total;

    // INPUT TAX — tax paid on purchases (GST paid to suppliers)
    // Sum tax from purchase orders that are RECEIVED / PAID
    const completedPOs = orders.filter(
      (po) => po.status === "received" || po.status === "partially_received"
    );
    const inputTax = completedPOs.reduce((sum, po) => sum + (po.total_tax ?? 0), 0);

    // NET TAX LIABILITY = output tax - input credit
    const netLiability = outputTax - inputTax;

    // Simplified CGST/SGST split (assuming intra-state, 50-50 split)
    // Real implementation would need item-level GST breakdown
    const cgstOutput = outputTax / 2;
    const sgstOutput = outputTax / 2;
    const cgstInput = inputTax / 2;
    const sgstInput = inputTax / 2;

    return {
      outputTax,
      inputTax,
      netLiability,
      cgstOutput,
      sgstOutput,
      cgstInput,
      sgstInput,
      cgstNet: cgstOutput - cgstInput,
      sgstNet: sgstOutput - sgstInput,
      salesRevenue: salesStats.today_sales_amount,
      purchaseTotal: purchaseStats?.total_amount ?? 0,
    };
  }, [salesStats, orders, purchaseStats]);

  // ── KPI Cards ──────────────────────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "GST Collected (Output)",
        value: formatCurrency(tax.outputTax),
        icon: ArrowUpRight,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip: "Total GST, CGST, SGST collected from customers on sales",
      },
      {
        label: "GST Paid (Input Credit)",
        value: formatCurrency(tax.inputTax),
        icon: ArrowDownRight,
        color: "bg-blue-500",
        isCurrency: true,
        tooltip: "Total GST paid on received purchase orders — claimable as input tax credit",
      },
      {
        label: "Net Tax Liability",
        value: formatCurrency(tax.netLiability),
        icon: Landmark,
        color: tax.netLiability > 0 ? "bg-red-500" : "bg-emerald-500",
        isCurrency: true,
        tooltip:
          tax.netLiability > 0
            ? "Amount payable to the government (output tax > input credit)"
            : "Input credit exceeds output tax — can be carried forward",
      },
    ],
    [tax]
  );

  // ── Tax comparison chart ───────────────────────────────────────────────
  const taxComparison = useMemo<ChartDataPoint[]>(
    () => [
      { label: "CGST Collected", value: tax.cgstOutput, color: "#10b981" },
      { label: "CGST Credit", value: tax.cgstInput, color: "#3b82f6" },
      { label: "SGST Collected", value: tax.sgstOutput, color: "#f59e0b" },
      { label: "SGST Credit", value: tax.sgstInput, color: "#8b5cf6" },
    ],
    [tax]
  );

  // ── Handle refresh ─────────────────────────────────────────────────────
  const handleRefresh = async () => {
    await refresh();
    if (storeId) {
      fetchOrders(storeId);
      fetchPurchaseStats(storeId);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Tax Report</h1>
            <InfoTooltip content="GST summary showing output tax collected on sales versus input tax credit from purchases. Net liability = Output Tax − Input Credit. A positive number means you owe tax; negative means you have excess credit to carry forward." />
          </div>
          <p className="text-sm text-muted-foreground">
            GST collected vs input credit — net tax liability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={3} />

      {/* GST Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            GST Computation
            <InfoTooltip content="Simplified GST computation assuming intra-state (CGST + SGST) transactions. For inter-state (IGST) transactions, refer to individual invoice details." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Output Tax */}
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Output Tax (Collected on Sales)
            </h3>
            <TaxRow
              label="Taxable Sales Value"
              value={tax.salesRevenue}
              tooltip="Total sales amount on which tax was charged"
              isLoading={isLoading}
            />
            <TaxRow
              label="CGST Collected"
              value={tax.cgstOutput}
              tooltip="Central GST collected from buyer"
              isLoading={isLoading}
            />
            <TaxRow
              label="SGST Collected"
              value={tax.sgstOutput}
              tooltip="State GST collected from buyer"
              isLoading={isLoading}
            />
            <Separator />
            <TaxRow
              label="Total Output Tax"
              value={tax.outputTax}
              bold
              isLoading={isLoading}
            />

            {/* Input Tax */}
            <div className="pt-3" />
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Input Tax Credit (Paid on Purchases)
            </h3>
            <TaxRow
              label="Taxable Purchase Value"
              value={tax.purchaseTotal}
              tooltip="Total purchase amount on which input tax was paid"
              isLoading={isLoading}
            />
            <TaxRow
              label="CGST Paid (Input)"
              value={tax.cgstInput}
              tooltip="Central GST paid to supplier — claimable as credit"
              isLoading={isLoading}
            />
            <TaxRow
              label="SGST Paid (Input)"
              value={tax.sgstInput}
              tooltip="State GST paid to supplier — claimable as credit"
              isLoading={isLoading}
            />
            <Separator />
            <TaxRow
              label="Total Input Credit"
              value={tax.inputTax}
              bold
              isLoading={isLoading}
            />

            {/* Net Liability */}
            <div className="pt-3" />
            <Separator />
            <TaxRow
              label="CGST Payable"
              value={tax.cgstNet}
              highlight
              isLoading={isLoading}
              tooltip="CGST collected minus CGST input credit"
            />
            <TaxRow
              label="SGST Payable"
              value={tax.sgstNet}
              highlight
              isLoading={isLoading}
              tooltip="SGST collected minus SGST input credit"
            />
            <Separator />
            <TaxRow
              label="Net Tax Liability"
              value={tax.netLiability}
              bold
              highlight
              isLoading={isLoading}
              tooltip="Total output tax minus total input credit"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChartCard
          title="CGST & SGST Comparison"
          data={taxComparison}
          formatter={formatCurrency}
          isLoading={isLoading}
          color="#10b981"
        />

        {/* Disclaimer card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              • This is a <strong>simplified</strong> GST report for internal review.
              It should not be used as a substitute for official GST returns (GSTR-1, GSTR-3B).
            </p>
            <p>
              • Input tax credit is computed from <strong>received</strong> purchase orders only.
              Draft and cancelled orders are excluded.
            </p>
            <p>
              • The CGST/SGST split assumes intra-state transactions. For inter-state (IGST)
              details, review individual sale and purchase invoices.
            </p>
            <p>
              • Always consult with a chartered accountant before filing GST returns.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// TaxRow — helper
// ============================================================================

interface TaxRowProps {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
  tooltip?: string;
  isLoading?: boolean;
}

function TaxRow({ label, value, bold, highlight, tooltip, isLoading }: TaxRowProps) {
  const valueColor = highlight
    ? value > 0
      ? "text-red-600 dark:text-red-400"
      : value < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : ""
    : "";

  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? "font-semibold" : "text-sm"}`}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
      </span>
      {isLoading ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <span className={`font-mono ${valueColor}`}>
          {formatCurrency(value)}
        </span>
      )}
    </div>
  );
}
