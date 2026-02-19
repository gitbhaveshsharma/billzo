"use client";

import {
    ShoppingCart,
    IndianRupee,
    CreditCard,
    AlertTriangle,
    FileText,
    TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseDashboardStats } from "@/types/purchase.types";
import { formatCurrency } from "@/utils/purchase.utils";

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseStatsProps {
    stats: PurchaseDashboardStats | null;
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
// PURCHASE STATS
// ============================================================================

export function PurchaseStats({ stats, isLoading }: PurchaseStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
                label="Total Orders"
                value={stats.total_orders}
                icon={<ShoppingCart className="h-4 w-4" />}
                description={`${stats.this_month_count} this month`}
                variant="default"
            />
            <StatCard
                label="This Month"
                value={formatCurrency(stats.this_month_total)}
                icon={<TrendingUp className="h-4 w-4" />}
                description={`${stats.this_month_count} orders`}
                variant="default"
            />
            <StatCard
                label="Total Paid"
                value={formatCurrency(stats.paid_amount)}
                icon={<CreditCard className="h-4 w-4" />}
                variant="success"
            />
            <StatCard
                label="Total Due"
                value={formatCurrency(stats.unpaid_amount)}
                icon={<IndianRupee className="h-4 w-4" />}
                description={`${stats.unpaid_orders} orders`}
                variant="warning"
            />
            <StatCard
                label="Overdue"
                value={stats.overdue_payments}
                icon={<AlertTriangle className="h-4 w-4" />}
                description="Payments overdue"
                variant="danger"
            />
            <StatCard
                label="Drafts"
                value={stats.draft_orders}
                icon={<FileText className="h-4 w-4" />}
                description={`${stats.confirmed_orders} confirmed`}
                variant="default"
            />
        </div>
    );
}
