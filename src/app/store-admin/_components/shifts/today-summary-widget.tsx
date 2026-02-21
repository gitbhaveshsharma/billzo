"use client";

import {
    Clock,
    Banknote,
    ShoppingCart,
    AlertTriangle,
    TrendingUp,
    Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { TodayShiftSummary } from "@/types/shifts.types";
import {
    getShiftStatusLabel,
    getShiftStatusColor,
    formatCurrency,
    formatTime,
} from "@/utils/shifts.utils";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

interface TodaySummaryWidgetProps {
    summaries: TodayShiftSummary[];
    isLoading: boolean;
}

// ============================================================================
// WIDGET SKELETON
// ============================================================================

function WidgetSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-3">
                <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-5 w-20" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// TODAY SUMMARY WIDGET
// ============================================================================

export function TodaySummaryWidget({ summaries, isLoading }: TodaySummaryWidgetProps) {
    if (isLoading) return <WidgetSkeleton />;

    // Aggregate totals from all shifts today
    const totals = summaries.reduce(
        (acc, s) => ({
            sales_count: acc.sales_count + s.total_sales_count,
            sales_amount: acc.sales_amount + s.total_sales_amount,
            discounts: acc.discounts + s.total_discount_given,
            tax: acc.tax + s.total_tax_collected,
            cash: acc.cash + s.cash_sales,
            card: acc.card + s.card_sales,
            upi: acc.upi + s.upi_sales,
        }),
        {
            sales_count: 0,
            sales_amount: 0,
            discounts: 0,
            tax: 0,
            cash: 0,
            card: 0,
            upi: 0,
        }
    );

    const activeShifts = summaries.filter((s) => s.shift_status === "OPEN");
    const suspendedShifts = summaries.filter((s) => s.shift_status === "SUSPENDED");

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Today&apos;s Shift Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Aggregate Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" /> Total Sales
                        </p>
                        <p className="text-lg font-bold">{totals.sales_count}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(totals.sales_amount)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> Active Shifts
                        </p>
                        <p className="text-lg font-bold">{activeShifts.length}</p>
                        {suspendedShifts.length > 0 && (
                            <p className="text-xs text-amber-600">
                                {suspendedShifts.length} suspended
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Banknote className="h-3 w-3" /> Cash Sales
                        </p>
                        <p className="text-sm font-semibold">{formatCurrency(totals.cash)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Card + UPI</p>
                        <p className="text-sm font-semibold">
                            {formatCurrency(totals.card + totals.upi)}
                        </p>
                    </div>
                </div>

                {/* Per-Terminal Breakdown */}
                {summaries.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Active Terminals
                        </p>
                        {summaries.map((s) => (
                            <div
                                key={s.shift_id}
                                className="flex items-center justify-between rounded-lg border p-2.5"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs shrink-0 ${getShiftStatusColor(s.shift_status)}`}
                                    >
                                        {getShiftStatusLabel(s.shift_status)}
                                    </Badge>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {s.terminal_name ?? "Main Terminal"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {s.cashier_name ?? "Unknown"} · Since {formatTime(s.opened_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold">
                                        {formatCurrency(s.total_sales_amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.total_sales_count} sales
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {summaries.length === 0 && (
                    <div className="text-center py-4">
                        <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No shifts today yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
