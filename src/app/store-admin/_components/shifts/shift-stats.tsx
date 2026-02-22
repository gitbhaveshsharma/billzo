"use client";

import {
    Clock,
    IndianRupee,
    Banknote,
    AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShiftDashboardStats } from "@/types/shifts.types";
import { formatCurrency } from "@/utils/shifts.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ShiftStatsProps {
    stats: ShiftDashboardStats | null;
    isLoading: boolean;
}

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    variant?: "default" | "success" | "warning" | "danger";
}

// ============================================================================
// STAT CARD
// ============================================================================

const VARIANT_STYLES = {
    default: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    success: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
    danger: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
};

function StatCard({ label, value, icon, description, variant = "default" }: StatCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2.5 ${VARIANT_STYLES[variant]}`}>
                        {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs font-medium truncate">
                            {label}
                        </p>
                        <p className="text-lg font-bold truncate">{value}</p>
                        {description && (
                            <p className="text-muted-foreground text-xs truncate">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// SKELETON
// ============================================================================

function StatSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// SHIFT STATS
// ============================================================================

export function ShiftStats({ stats, isLoading }: ShiftStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    const totalDiscrepancy = stats.total_cash_in_today - stats.total_cash_out_today;
    const hasDiscrepancyWarning = totalDiscrepancy < 0;

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
                label="Open Shifts"
                value={stats.open_shifts_count}
                icon={<Clock className="h-4 w-4" />}
                description={`${stats.closed_shifts_today} closed today`}
                variant={stats.open_shifts_count > 0 ? "success" : "default"}
            />
            <StatCard
                label="Today's Revenue"
                value={formatCurrency(stats.today_total_revenue)}
                icon={<IndianRupee className="h-4 w-4" />}
                description={`${stats.today_total_sales} transactions`}
                variant="default"
            />
            <StatCard
                label="Cash Collected"
                value={formatCurrency(stats.today_cash_sales)}
                icon={<Banknote className="h-4 w-4" />}
                description={`In: ${formatCurrency(stats.total_cash_in_today)} | Out: ${formatCurrency(stats.total_cash_out_today)}`}
                variant="success"
            />
            <StatCard
                label="Discrepancy"
                value={formatCurrency(Math.abs(totalDiscrepancy))}
                icon={<AlertTriangle className="h-4 w-4" />}
                description={hasDiscrepancyWarning ? "Cash shortage detected" : "No discrepancies"}
                variant={hasDiscrepancyWarning ? "danger" : "default"}
            />
        </div>
    );
}
