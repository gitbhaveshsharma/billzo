"use client";

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
import type { SaleReturn, ReturnStatus } from "@/types/sales.types";

// ============================================================================
// TYPES
// ============================================================================

interface DailyReturnsListProps {
    returns: SaleReturn[];
    isLoading: boolean;
}

// ============================================================================
// RETURN STATUS BADGE
// ============================================================================

const RETURN_STATUS_MAP: Record<
    ReturnStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
    INITIATED: { label: "Initiated", variant: "outline" },
    APPROVED: { label: "Approved", variant: "default" },
    REJECTED: { label: "Rejected", variant: "destructive" },
    COMPLETED: { label: "Completed", variant: "default" },
    REFUND_PENDING: { label: "Refund Pending", variant: "secondary" },
    REFUND_COMPLETED: { label: "Refunded", variant: "default" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DailyReturnsList({ returns, isLoading }: DailyReturnsListProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Returns</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
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
                    <span>Returns</span>
                    {returns.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {returns.length}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {returns.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6 text-sm">
                        No returns today
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Return #</TableHead>
                                    <TableHead className="w-[120px]">Orig. Invoice</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="w-[100px] text-right">Amount</TableHead>
                                    <TableHead className="w-[90px]">Refund</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.map((ret) => {
                                    const sv = RETURN_STATUS_MAP[ret.status] ?? {
                                        label: ret.status,
                                        variant: "secondary" as const,
                                    };
                                    return (
                                        <TableRow key={ret.id}>
                                            <TableCell className="font-mono text-xs">
                                                {ret.return_number}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {ret.original_invoice_number}
                                            </TableCell>
                                            <TableCell className="text-sm truncate max-w-[160px]">
                                                {ret.customer_name || "Walk-in"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm">
                                                {formatCurrency(ret.total_returned)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {ret.refund_method ?? "—"}
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
