"use client";

import { useEffect, useMemo } from "react";
import {
  Landmark,
  Package,
  Banknote,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { usePurchaseStore } from "@/stores/purchase.store";
import { useCustomerStore } from "@/stores/customers.store";
import { useShiftsStore } from "@/stores/shifts.store";
import {
  StatCardGrid,
  MiniStatList,
  DonutChartCard,
  BarChartCard,
} from "@/components/dashboard";
import type { DashboardStatConfig, ChartDataPoint } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// ACCOUNTANT — BALANCE SHEET
// ============================================================================

export default function BalanceSheetPage() {
  const { storeId } = useAccountant();

  const {
    dashboardStats: invStats,
    valuationSummary,
    isLoading: invLoading,
    fetchDashboardStats: fetchInvStats,
    fetchValuationSummary,
  } = useInventoryStore();

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

  const isLoading = invLoading || purchaseLoading || customerLoading || shiftLoading;

  // ========================================================================
  // FETCH
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchInvStats(storeId);
    fetchValuationSummary(storeId);
    fetchPurchaseStats(storeId);
    fetchCustomerStats(storeId);
    fetchShiftStats(storeId);
  }, [storeId, fetchInvStats, fetchValuationSummary, fetchPurchaseStats, fetchCustomerStats, fetchShiftStats]);

  const handleRefresh = () => {
    if (!storeId) return;
    fetchInvStats(storeId);
    fetchValuationSummary(storeId);
    fetchPurchaseStats(storeId);
    fetchCustomerStats(storeId);
    fetchShiftStats(storeId);
  };

  // ========================================================================
  // COMPUTED — BALANCE SHEET FIGURES
  // ========================================================================

  const balance = useMemo(() => {
    const inventoryValue = invStats?.total_stock_value ?? valuationSummary?.total_value ?? 0;
    const cashInHand = (shiftStats?.today_cash_sales ?? 0) + (shiftStats?.total_cash_in_today ?? 0) - (shiftStats?.total_cash_out_today ?? 0);
    const accountsReceivable = customerStats?.total_outstanding ?? 0;

    const totalAssets = inventoryValue + cashInHand + accountsReceivable;

    const accountsPayable = purchaseStats?.unpaid_amount ?? 0;
    const totalLiabilities = accountsPayable;

    const equity = totalAssets - totalLiabilities;

    return {
      inventoryValue,
      cashInHand,
      accountsReceivable,
      totalAssets,
      accountsPayable,
      totalLiabilities,
      equity,
    };
  }, [invStats, valuationSummary, shiftStats, customerStats, purchaseStats]);

  // ── KPI Cards ──────────────────────────────────────────────────────────
  const kpiStats = useMemo<DashboardStatConfig[]>(
    () => [
      {
        label: "Total Assets",
        value: formatCurrency(balance.totalAssets),
        icon: Landmark,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip: "Inventory + Cash + Accounts Receivable",
      },
      {
        label: "Total Liabilities",
        value: formatCurrency(balance.totalLiabilities),
        icon: ShoppingBag,
        color: "bg-red-500",
        isCurrency: true,
        tooltip: "Unpaid supplier amounts (Accounts Payable)",
      },
      {
        label: "Owner's Equity",
        value: formatCurrency(balance.equity),
        icon: balance.equity >= 0 ? TrendingUp : TrendingDown,
        color: balance.equity >= 0 ? "bg-emerald-500" : "bg-red-500",
        isCurrency: true,
        tooltip: "Total Assets minus Total Liabilities",
      },
    ],
    [balance]
  );

  // ── Asset breakdown donut ──────────────────────────────────────────────
  const assetBreakdown = useMemo<ChartDataPoint[]>(
    () =>
      [
        { label: "Inventory", value: balance.inventoryValue, color: "#10b981" },
        { label: "Cash in Hand", value: balance.cashInHand, color: "#3b82f6" },
        { label: "Receivables", value: balance.accountsReceivable, color: "#f59e0b" },
      ].filter((d) => d.value > 0),
    [balance]
  );

  // ── Stock value by category (from inventory stats) ─────────────────────
  const stockByCategory = useMemo<ChartDataPoint[]>(() => {
    if (!invStats?.stock_value_by_category) return [];
    return invStats.stock_value_by_category.map((c) => ({
      label: c.category_name || "Uncategorized",
      value: c.total_value,
    }));
  }, [invStats]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
            <InfoTooltip content="A simplified balance sheet showing your store's assets (what you own), liabilities (what you owe), and the resulting owner's equity. Values are a current snapshot — not historical." />
          </div>
          <p className="text-sm text-muted-foreground">
            Assets, liabilities, and equity — current snapshot.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={3} />

      {/* Balance Sheet Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" />
            Balance Sheet Breakdown
            <InfoTooltip content="Assets = Liabilities + Equity. This equation must always balance." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Assets */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Assets
              </h3>
              <BSRow
                icon={Package}
                label="Inventory (Stock Value)"
                value={balance.inventoryValue}
                tooltip="Current valuation of all products in stock at cost price"
                isLoading={isLoading}
              />
              <BSRow
                icon={Banknote}
                label="Cash in Hand"
                value={balance.cashInHand}
                tooltip="Cash from today's sales plus cash-in movements minus cash-out movements"
                isLoading={isLoading}
              />
              <BSRow
                icon={CreditCard}
                label="Accounts Receivable"
                value={balance.accountsReceivable}
                tooltip="Total unpaid credit from customers"
                isLoading={isLoading}
              />
              <Separator />
              <BSRow
                label="Total Assets"
                value={balance.totalAssets}
                bold
                isLoading={isLoading}
              />
            </div>

            {/* Liabilities */}
            <div className="pt-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Liabilities
              </h3>
              <BSRow
                icon={ShoppingBag}
                label="Accounts Payable (Suppliers)"
                value={balance.accountsPayable}
                tooltip="Unpaid amounts due to suppliers from purchase orders"
                isLoading={isLoading}
              />
              <Separator />
              <BSRow
                label="Total Liabilities"
                value={balance.totalLiabilities}
                bold
                isLoading={isLoading}
              />
            </div>

            {/* Equity */}
            <div className="pt-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Equity
              </h3>
              <Separator />
              <BSRow
                label="Owner's Equity (Assets − Liabilities)"
                value={balance.equity}
                bold
                highlight
                isLoading={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DonutChartCard
          title="Asset Composition"
          data={assetBreakdown}
          formatter={formatCurrency}
          isLoading={isLoading}
        />
        <BarChartCard
          title="Inventory Value by Category"
          data={stockByCategory}
          formatter={formatCurrency}
          isLoading={isLoading}
          color="#10b981"
        />
      </div>

      {/* Additional metrics */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniStatList
          title="Inventory Details"
          icon={Package}
          items={[
            {
              label: "Total Products",
              value: (invStats?.total_products ?? 0).toLocaleString("en-IN"),
              tooltip: "Number of distinct products in inventory",
            },
            {
              label: "Stock Value",
              value: formatCurrency(balance.inventoryValue),
              tooltip: "Total value of stock at cost",
            },
            {
              label: "Low Stock Items",
              value: (invStats?.low_stock_count ?? 0).toLocaleString("en-IN"),
              color: (invStats?.low_stock_count ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
              tooltip: "Products below reorder level",
            },
            {
              label: "Out of Stock",
              value: (invStats?.out_of_stock_count ?? 0).toLocaleString("en-IN"),
              color: (invStats?.out_of_stock_count ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Products with zero available quantity",
            },
          ]}
          isLoading={isLoading}
        />
        <MiniStatList
          title="Payables Details"
          icon={ShoppingBag}
          items={[
            {
              label: "Total PO Amount",
              value: formatCurrency(purchaseStats?.total_amount ?? 0),
              tooltip: "Total value of all purchase orders",
            },
            {
              label: "Paid",
              value: formatCurrency(purchaseStats?.paid_amount ?? 0),
              color: "text-emerald-600 dark:text-emerald-400",
              tooltip: "Amount already paid to suppliers",
            },
            {
              label: "Unpaid",
              value: formatCurrency(purchaseStats?.unpaid_amount ?? 0),
              color: (purchaseStats?.unpaid_amount ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Outstanding amount due to suppliers",
            },
            {
              label: "Overdue",
              value: (purchaseStats?.overdue_payments ?? 0).toLocaleString("en-IN"),
              color: (purchaseStats?.overdue_payments ?? 0) > 0 ? "text-red-600 dark:text-red-400" : undefined,
              tooltip: "Number of overdue payment obligations",
            },
          ]}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

// ============================================================================
// BSRow — Balance Sheet row helper
// ============================================================================

interface BSRowProps {
  label: string;
  value: number;
  icon?: React.ComponentType<{ className?: string }>;
  bold?: boolean;
  highlight?: boolean;
  tooltip?: string;
  isLoading?: boolean;
}

function BSRow({ label, value, icon: Icon, bold, highlight, tooltip, isLoading }: BSRowProps) {
  const valueColor = highlight
    ? value >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400"
    : "";

  return (
    <div className={`flex items-center justify-between py-2 ${bold ? "font-semibold" : "text-sm"}`}>
      <span className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
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
