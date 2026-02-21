"use client";

import {
    ShoppingCart,
    IndianRupee,
    RotateCcw,
    CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesDashboardStats } from "@/types/sales.types";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface SalesStatsProps {
    stats: SalesDashboardStats | null;
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
// SALES STATS
// ============================================================================

export function SalesStats({ stats, isLoading }: SalesStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
                label="Today's Sales"
                value={formatCurrency(stats.today_sales_amount)}
                icon={<ShoppingCart className="h-4 w-4" />}
                description={`${stats.today_sales_count} transactions`}
                variant="success"
            />
            <StatCard
                label="Cash Collected"
                value={formatCurrency(stats.today_cash)}
                icon={<IndianRupee className="h-4 w-4" />}
                description={`Card: ${formatCurrency(stats.today_card)} | UPI: ${formatCurrency(stats.today_upi)}`}
                variant="default"
            />
            <StatCard
                label="Returns"
                value={formatCurrency(stats.today_returns_amount)}
                icon={<RotateCcw className="h-4 w-4" />}
                description={`${stats.today_returns_count} returns today`}
                variant={stats.today_returns_count > 0 ? "warning" : "default"}
            />
            <StatCard
                label="Credit Dues"
                value={formatCurrency(stats.total_outstanding)}
                icon={<CreditCard className="h-4 w-4" />}
                description={`${stats.today_credit_sales} credit sales today`}
                variant={stats.total_outstanding > 0 ? "danger" : "default"}
            />
        </div>
    );
}
