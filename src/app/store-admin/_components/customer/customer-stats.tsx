"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    CheckCircle2,
    XCircle,
    Ban,
    IndianRupee,
    Star,
} from "lucide-react";
import type { CustomerDashboardStats } from "@/types/customers.types";
import { formatCurrency } from "@/utils/customers.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerStatsProps {
    stats: CustomerDashboardStats | null;
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

export function CustomerStats({ stats, isLoading }: CustomerStatsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <StatSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
                label="Total Customers"
                value={stats.total_customers}
                icon={<Users className="h-4 w-4 text-blue-600" />}
                color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
                label="Active"
                value={stats.active_customers}
                icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                color="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
                label="New This Month"
                value={stats.new_customers_this_month}
                icon={<Star className="h-4 w-4 text-amber-600" />}
                color="bg-amber-100 dark:bg-amber-900/30"
            />
            <StatCard
                label="With Outstanding"
                value={stats.customers_with_credit}
                icon={<IndianRupee className="h-4 w-4 text-orange-600" />}
                color="bg-orange-100 dark:bg-orange-900/30"
                description={formatCurrency(stats.total_outstanding)}
            />
            <StatCard
                label="Blacklisted"
                value={stats.blacklisted_customers}
                icon={<Ban className="h-4 w-4 text-red-600" />}
                color="bg-red-100 dark:bg-red-900/30"
            />
            <StatCard
                label="Inactive"
                value={stats.inactive_customers}
                icon={<XCircle className="h-4 w-4 text-gray-600" />}
                color="bg-gray-100 dark:bg-gray-900/30"
            />
        </div>
    );
}
