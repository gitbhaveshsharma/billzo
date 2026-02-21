"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface DailyPaymentBreakdownProps {
    cash: number;
    card: number;
    upi: number;
    other: number;
    isLoading: boolean;
}

// ============================================================================
// BAR ROW
// ============================================================================

function PaymentRow({
    label,
    amount,
    total,
    color,
}: {
    label: string;
    amount: number;
    total: number;
    color: string;
}) {
    const pct = total > 0 ? (amount / total) * 100 : 0;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
                {pct.toFixed(1)}%
            </p>
        </div>
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DailyPaymentBreakdown({
    cash,
    card,
    upi,
    other,
    isLoading,
}: DailyPaymentBreakdownProps) {
    const total = cash + card + upi + other;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Payment Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-2 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                    <span>Payment Breakdown</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        Total: {formatCurrency(total)}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <PaymentRow
                    label="Cash"
                    amount={cash}
                    total={total}
                    color="bg-emerald-500"
                />
                <PaymentRow
                    label="Card"
                    amount={card}
                    total={total}
                    color="bg-blue-500"
                />
                <PaymentRow
                    label="UPI"
                    amount={upi}
                    total={total}
                    color="bg-violet-500"
                />
                <PaymentRow
                    label="Other"
                    amount={other}
                    total={total}
                    color="bg-amber-500"
                />
            </CardContent>
        </Card>
    );
}
