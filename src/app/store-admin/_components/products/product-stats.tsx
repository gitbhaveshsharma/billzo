"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Package,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    PackageX,
    IndianRupee,
    Tag,
    Layers,
    Clock,
    Bell,
} from "lucide-react";
import type { ProductDashboardStats } from "@/types/product.types";
import { formatCurrency } from "@/utils/product.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProductStatsProps {
    stats: ProductDashboardStats | null;
    isLoading: boolean;
}

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    description?: string;
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value, icon, color, description }: StatCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${color}`}>
                        {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground truncate">
                            {label}
                        </p>
                        <p className="text-xl font-bold tracking-tight">
                            {value}
                        </p>
                        {description && (
                            <p className="text-[10px] text-muted-foreground truncate">
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
// STAT SKELETON
// ============================================================================

function StatSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-12" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductStats({ stats, isLoading }: ProductStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <StatCard
                label="Total Products"
                value={stats.total_products}
                icon={<Package className="h-4 w-4 text-blue-600" />}
                color="bg-blue-100 dark:bg-blue-900/30"
                description={`${stats.active_products} active, ${stats.inactive_products} inactive`}
            />
            <StatCard
                label="Low Stock"
                value={stats.low_stock_count}
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                color="bg-amber-100 dark:bg-amber-900/30"
                description={`${stats.out_of_stock_count} out of stock`}
            />
            <StatCard
                label="Inventory Value"
                value={formatCurrency(stats.total_inventory_value)}
                icon={<IndianRupee className="h-4 w-4 text-green-600" />}
                color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
                label="Categories"
                value={stats.total_categories}
                icon={<Layers className="h-4 w-4 text-purple-600" />}
                color="bg-purple-100 dark:bg-purple-900/30"
                description={`${stats.total_brands} brands`}
            />
            <StatCard
                label="Alerts"
                value={stats.unresolved_alerts}
                icon={<Bell className="h-4 w-4 text-red-600" />}
                color="bg-red-100 dark:bg-red-900/30"
                description={`${stats.expiring_soon_count} expiring soon`}
            />
        </div>
    );
}
