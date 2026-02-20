"use client";

import {
    Package,
    IndianRupee,
    AlertTriangle,
    PackageX,
    Clock,
    TrendingUp,
    ArrowDownUp,
    BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryDashboardStats } from "@/types/inventory.types";
import { formatCurrency } from "@/utils/inventory.utils";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryStatsProps {
    stats: InventoryDashboardStats | null;
    isLoading: boolean;
}

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    variant?: "default" | "success" | "warning" | "danger" | "info";
}

// ============================================================================
// STAT CARD
// ============================================================================

const VARIANT_STYLES: Record<string, string> = {
    default: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
    success: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
    danger: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
    info: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
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
// INVENTORY STATS
// ============================================================================

export function InventoryStats({ stats, isLoading }: InventoryStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
                {Array.from({ length: 8 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            <StatCard
                label="Total SKUs"
                value={stats.total_products}
                icon={<Package className="h-4 w-4" />}
                variant="default"
            />
            <StatCard
                label="Stock Value"
                value={formatCurrency(stats.total_stock_value)}
                icon={<IndianRupee className="h-4 w-4" />}
                variant="success"
            />
            <StatCard
                label="Low Stock"
                value={stats.low_stock_count}
                icon={<AlertTriangle className="h-4 w-4" />}
                description="Below reorder point"
                variant="warning"
            />
            <StatCard
                label="Out of Stock"
                value={stats.out_of_stock_count}
                icon={<PackageX className="h-4 w-4" />}
                variant="danger"
            />
            <StatCard
                label="Expiring Soon"
                value={stats.expiring_soon_count}
                icon={<Clock className="h-4 w-4" />}
                description="Within 30 days"
                variant="warning"
            />
            <StatCard
                label="Overstock"
                value={stats.overstock_count}
                icon={<TrendingUp className="h-4 w-4" />}
                variant="info"
            />
            <StatCard
                label="Today's Moves"
                value={stats.total_transactions_today}
                icon={<ArrowDownUp className="h-4 w-4" />}
                variant="default"
            />
            <StatCard
                label="Unresolved Alerts"
                value={stats.unresolved_alerts_count}
                icon={<BarChart3 className="h-4 w-4" />}
                variant="danger"
            />
        </div>
    );
}
