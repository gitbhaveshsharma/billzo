"use client";

import {
    RotateCcw,
    Clock,
    CheckCircle2,
    XCircle,
    IndianRupee,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaleReturn } from "@/types/sales.types";
import type { ReturnStatus } from "@/types/sales.types";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface RefundStatsProps {
    returns: SaleReturn[];
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
// HELPERS
// ============================================================================

const PENDING_STATUSES: ReturnStatus[] = ["INITIATED", "REFUND_PENDING"];
const COMPLETED_STATUSES: ReturnStatus[] = ["APPROVED", "COMPLETED", "REFUND_COMPLETED"];
const REJECTED_STATUSES: ReturnStatus[] = ["REJECTED"];

function computeRefundStats(returns: SaleReturn[]) {
    const totalCount = returns.length;
    const totalAmount = returns.reduce((sum, r) => sum + r.total_returned, 0);
    const pendingCount = returns.filter((r) => PENDING_STATUSES.includes(r.status)).length;
    const pendingAmount = returns
        .filter((r) => PENDING_STATUSES.includes(r.status))
        .reduce((sum, r) => sum + r.total_returned, 0);
    const completedCount = returns.filter((r) => COMPLETED_STATUSES.includes(r.status)).length;
    const completedAmount = returns
        .filter((r) => COMPLETED_STATUSES.includes(r.status))
        .reduce((sum, r) => sum + r.total_returned, 0);
    const rejectedCount = returns.filter((r) => REJECTED_STATUSES.includes(r.status)).length;

    return { totalCount, totalAmount, pendingCount, pendingAmount, completedCount, completedAmount, rejectedCount };
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
// REFUND STATS
// ============================================================================

export function RefundStats({ returns, isLoading }: RefundStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    const stats = computeRefundStats(returns);

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
                label="Total Returns"
                value={stats.totalCount}
                icon={<RotateCcw className="h-4 w-4" />}
                description={formatCurrency(stats.totalAmount)}
                variant="default"
            />
            <StatCard
                label="Pending"
                value={stats.pendingCount}
                icon={<Clock className="h-4 w-4" />}
                description={formatCurrency(stats.pendingAmount)}
                variant={stats.pendingCount > 0 ? "warning" : "default"}
            />
            <StatCard
                label="Completed"
                value={stats.completedCount}
                icon={<CheckCircle2 className="h-4 w-4" />}
                description={formatCurrency(stats.completedAmount)}
                variant="success"
            />
            <StatCard
                label="Refunded Amount"
                value={formatCurrency(stats.completedAmount)}
                icon={<IndianRupee className="h-4 w-4" />}
                description={`${stats.rejectedCount} rejected`}
                variant={stats.completedAmount > 0 ? "danger" : "default"}
            />
        </div>
    );
}
