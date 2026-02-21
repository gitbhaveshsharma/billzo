"use client";

import { Users, AlertTriangle, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface PosCustomerStatsProps {
    totalCustomers: number;
    withOutstanding: number;
    totalOutstanding: number;
    myCustomersToday: number;
    isLoading: boolean;
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
    label,
    value,
    icon,
    variant = "default",
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    variant?: "default" | "warning" | "success";
}) {
    const borderColor =
        variant === "warning"
            ? "border-l-amber-500"
            : variant === "success"
              ? "border-l-emerald-500"
              : "border-l-blue-500";

    return (
        <Card className={`p-4 border-l-4 ${borderColor}`}>
            <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{icon}</div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{value}</p>
                </div>
            </div>
        </Card>
    );
}

// ============================================================================
// POS CUSTOMER STATS — 3-card strip for cashier
// ============================================================================

export function PosCustomerStats({
    totalCustomers,
    withOutstanding,
    totalOutstanding,
    myCustomersToday,
    isLoading,
}: PosCustomerStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-12" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
                label="Total Customers"
                value={totalCustomers}
                icon={<Users className="h-5 w-5" />}
            />
            <StatCard
                label="With Outstanding"
                value={`${withOutstanding} (${formatCurrency(totalOutstanding)})`}
                icon={<AlertTriangle className="h-5 w-5" />}
                variant="warning"
            />
            <StatCard
                label="My Customers Today"
                value={myCustomersToday}
                icon={<UserCheck className="h-5 w-5" />}
                variant="success"
            />
        </div>
    );
}
