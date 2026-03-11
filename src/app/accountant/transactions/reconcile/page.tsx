"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Banknote,
  ArrowUpDown,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { useAccountant } from "@/app/accountant/_context/accountant-context";
import { useShiftsStore } from "@/stores/shifts.store";
import { useSalesStore } from "@/stores/sales.store";
import {
  StatCardGrid,
  MiniStatList,
  BarChartCard,
} from "@/components/dashboard";
import type { DashboardStatConfig, ChartDataPoint } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatCurrency, formatDateTime } from "@/utils/sales.utils";
import type { TodayShiftSummary } from "@/types/shifts.types";

// ============================================================================
// ACCOUNTANT — RECONCILIATION PAGE
// ============================================================================

export default function ReconciliationPage() {
  const { storeId } = useAccountant();

  const {
    todaySummary,
    dashboardStats: shiftStats,
    discrepancyShifts,
    isLoading: shiftLoading,
    fetchTodaySummary,
    fetchDashboardStats: fetchShiftStats,
    fetchDiscrepancies,
  } = useShiftsStore();

  const {
    dashboardStats: salesStats,
    isLoading: salesLoading,
    fetchDashboardStats: fetchSalesStats,
  } = useSalesStore();

  const isLoading = shiftLoading || salesLoading;

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchTodaySummary(storeId);
    fetchShiftStats(storeId);
    fetchDiscrepancies(storeId);
    fetchSalesStats(storeId);
  }, [storeId, fetchTodaySummary, fetchShiftStats, fetchDiscrepancies, fetchSalesStats]);

  // ========================================================================
  // COMPUTED — KPI STATS
  // ========================================================================

  const kpiStats = useMemo<DashboardStatConfig[]>(() => {
    const ss = shiftStats;
    const sa = salesStats;

    const totalSalesRevenue = ss?.today_total_revenue ?? sa?.today_sales_amount ?? 0;
    const cashCollected = ss?.today_cash_sales ?? sa?.today_cash ?? 0;
    const discrepancyCount = discrepancyShifts?.length ?? 0;

    return [
      {
        label: "Today's Revenue",
        value: formatCurrency(totalSalesRevenue),
        icon: DollarSign,
        color: "bg-emerald-500",
        isCurrency: true,
        tooltip: "Total sales revenue collected across all shifts today",
      },
      {
        label: "Cash Collected",
        value: formatCurrency(cashCollected),
        icon: Banknote,
        color: "bg-green-500",
        isCurrency: true,
        tooltip: "Total cash payments received in all shifts today",
      },
      {
        label: "Cash In",
        value: formatCurrency(ss?.total_cash_in_today ?? 0),
        icon: ArrowUpRight,
        color: "bg-blue-500",
        isCurrency: true,
        tooltip: "Cash-in movements (float additions, till replenishments)",
      },
      {
        label: "Cash Out",
        value: formatCurrency(ss?.total_cash_out_today ?? 0),
        icon: ArrowDownRight,
        color: "bg-orange-500",
        isCurrency: true,
        tooltip: "Cash-out movements (safe drops, petty cash withdrawals)",
      },
      {
        label: "Open Shifts",
        value: (ss?.open_shifts_count ?? 0).toLocaleString("en-IN"),
        icon: Clock,
        color: "bg-yellow-500",
        tooltip: "Number of cash register shifts currently open and active",
      },
      {
        label: "Discrepancies",
        value: discrepancyCount.toLocaleString("en-IN"),
        icon: discrepancyCount > 0 ? AlertTriangle : CheckCircle2,
        color: discrepancyCount > 0 ? "bg-red-500" : "bg-emerald-500",
        tooltip:
          "Shifts where actual cash at closing did not match the expected amount. A discrepancy of ≠ 0 indicates a potential error or loss.",
      },
    ];
  }, [shiftStats, salesStats, discrepancyShifts]);

  // ── Payment method chart ───────────────────────────────────────────────
  const paymentChart = useMemo<ChartDataPoint[]>(() => {
    const ss = shiftStats;
    if (!ss) return [];
    return [
      { label: "Cash", value: ss.today_cash_sales ?? 0, color: "#10b981" },
      { label: "Card", value: ss.today_card_sales ?? 0, color: "#3b82f6" },
      { label: "UPI", value: ss.today_upi_sales ?? 0, color: "#8b5cf6" },
      { label: "Other", value: ss.today_other_sales ?? 0, color: "#6b7280" },
    ].filter((d) => d.value > 0);
  }, [shiftStats]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Reconciliation</h1>
          <InfoTooltip content="Reconciliation compares expected cash (from sales, cash-in, cash-out) with actual cash counted at shift closing. Discrepancies may indicate counting errors, unrecorded transactions, or theft." />
        </div>
        <p className="text-sm text-muted-foreground">
          Cash reconciliation, shift summaries, and discrepancy tracking.
        </p>
      </div>

      {/* KPIs */}
      <StatCardGrid stats={kpiStats} isLoading={isLoading} columns={3} />

      {/* Chart + Today Shift Summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BarChartCard
          title="Today's Payment Methods"
          data={paymentChart}
          formatter={formatCurrency}
          isLoading={isLoading}
          color="#10b981"
        />

        {/* Today's Shift Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today&apos;s Shifts
              <InfoTooltip content="Each row is a cash register shift opened today. Shows sales count, revenue, and payment split per shift." />
            </CardTitle>
            <CardDescription>Live shift status across all terminals.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : todaySummary.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                No shifts opened today.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terminal</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaySummary.map((s: TodayShiftSummary) => (
                      <TableRow key={s.shift_id}>
                        <TableCell className="font-medium">
                          {s.terminal_name ?? "Main"}
                        </TableCell>
                        <TableCell>{s.cashier_name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={s.shift_status === "OPEN" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {s.shift_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {s.total_sales_count}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(s.total_sales_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(s.cash_sales)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discrepancy Shifts */}
      {discrepancyShifts && discrepancyShifts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Shifts with Cash Discrepancies
              <InfoTooltip content="These shifts had a difference between expected cash (opening + cash sales + cash-in − cash-out) and actual cash counted at closing. Positive = over, Negative = short." />
            </CardTitle>
            <CardDescription>
              Review these shifts for potential errors or unrecorded movements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift Date</TableHead>
                    <TableHead>Terminal</TableHead>
                    <TableHead className="text-right">Opening Cash</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancyShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(shift.opened_at)}
                      </TableCell>
                      <TableCell>{shift.terminal_name ?? "Main"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(shift.opening_cash)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            (shift.cash_difference ?? 0) < 0
                              ? "text-red-600"
                              : (shift.cash_difference ?? 0) > 0
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }
                        >
                          {formatCurrency(shift.cash_difference ?? 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {shift.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
