"use client";

import { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/sales.utils";
import type { SaleSummaryView, SaleStatus } from "@/types/sales.types";

// ============================================================================
// TYPES
// ============================================================================

interface DailySalesTableProps {
    /** Today's sale summaries — pre-filtered to cashier's own */
    sales: SaleSummaryView[];
    isLoading: boolean;
}

// ============================================================================
// STATUS BADGE MAP
// ============================================================================

const STATUS_VARIANTS: Record<
    SaleStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    COMPLETED: { label: "Completed", variant: "default" },
    DRAFT: { label: "Draft", variant: "secondary" },
    HOLD: { label: "Hold", variant: "outline" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
    PARTIAL_RETURN: { label: "Partial Return", variant: "outline" },
    FULLY_RETURNED: { label: "Returned", variant: "destructive" },
    CREDIT: { label: "Credit", variant: "outline" },
    PARTIAL_PAID: { label: "Partial Paid", variant: "secondary" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DailySalesTable({ sales, isLoading }: DailySalesTableProps) {
    /** Sort from latest to earliest */
    const sorted = useMemo(
        () =>
            [...sales].sort((a, b) => {
                const ta = `${a.sale_date}T${a.sale_time}`;
                const tb = `${b.sale_date}T${b.sale_time}`;
                return tb.localeCompare(ta);
            }),
        [sales]
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Today&apos;s Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                    <span>Today&apos;s Invoices</span>
                    <Badge variant="secondary" className="text-xs">
                        {sales.length} bills
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {sorted.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                        No sales recorded today
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Invoice</TableHead>
                                    <TableHead className="w-[80px]">Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="w-[60px] text-center">Items</TableHead>
                                    <TableHead className="w-[100px] text-right">Amount</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sorted.map((sale) => {
                                    const sv = STATUS_VARIANTS[sale.status] ?? {
                                        label: sale.status,
                                        variant: "secondary" as const,
                                    };
                                    return (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-mono text-xs">
                                                {sale.invoice_number}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {sale.sale_time?.slice(0, 5) ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-sm truncate max-w-[180px]">
                                                {sale.customer_name || "Walk-in"}
                                            </TableCell>
                                            <TableCell className="text-center text-xs">
                                                {sale.item_count}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm">
                                                {formatCurrency(sale.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={sv.variant} className="text-[10px]">
                                                    {sv.label}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
