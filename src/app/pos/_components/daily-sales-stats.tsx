"use client";

import {
    Receipt,
    IndianRupee,
    RotateCcw,
    Banknote,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface DailySalesStatsProps {
    billsCount: number;
    totalAmount: number;
    returnsCount: number;
    returnsAmount: number;
    cashCollected: number;
    isLoading: boolean;
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
    label,
    value,
    subValue,
    icon,
    variant = "default",
}: {
    label: string;
    value: string | number;
    subValue?: string;
    icon: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger";
}) {
    const borderColors: Record<string, string> = {
        default: "border-l-blue-500",
        success: "border-l-emerald-500",
        warning: "border-l-amber-500",
        danger: "border-l-red-500",
    };

    return (
        <Card className={`p-4 border-l-4 ${borderColors[variant]}`}>
            <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{icon}</div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{value}</p>
                    {subValue && (
                        <p className="text-xs text-muted-foreground">{subValue}</p>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ============================================================================
// DAILY SALES STATS — 4 cards for cashier daily report
// ============================================================================

export function DailySalesStats({
    billsCount,
    totalAmount,
    returnsCount,
    returnsAmount,
    cashCollected,
    isLoading,
}: DailySalesStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Bills Today"
                value={billsCount}
                subValue={`${formatCurrency(totalAmount)} total`}
                icon={<Receipt className="h-5 w-5" />}
            />
            <StatCard
                label="Amount Collected"
                value={formatCurrency(totalAmount)}
                icon={<IndianRupee className="h-5 w-5" />}
                variant="success"
            />
            <StatCard
                label="Returns"
                value={returnsCount}
                subValue={returnsAmount > 0 ? formatCurrency(returnsAmount) : undefined}
                icon={<RotateCcw className="h-5 w-5" />}
                variant={returnsCount > 0 ? "warning" : "default"}
            />
            <StatCard
                label="Cash Collected"
                value={formatCurrency(cashCollected)}
                icon={<Banknote className="h-5 w-5" />}
                variant="success"
            />
        </div>
    );
}
