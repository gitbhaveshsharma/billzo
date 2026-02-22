"use client";

import { RotateCcw, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { SaleReturn, ReturnStatus } from "@/types/sales.types";
import {
    getReturnStatusLabel,
    getReturnStatusColor,
    getPaymentMethodLabel,
    formatCurrency,
    formatDate,
    formatDateTime,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

export type ReturnAction = "view" | "approve" | "complete";

interface ReturnsTableProps {
    returns: SaleReturn[];
    isLoading?: boolean;
    onAction: (action: ReturnAction, saleReturn: SaleReturn) => void;
}

// ============================================================================
// SKELETON ROWS
// ============================================================================

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

// ============================================================================
// RETURNS TABLE
// ============================================================================

export function ReturnsTable({
    returns,
    isLoading = false,
    onAction,
}: ReturnsTableProps) {
    return (
        <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">Return #</TableHead>
                        <TableHead className="text-xs">Invoice</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <SkeletonRows />
                    ) : returns.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={7}
                                className="text-center py-12"
                            >
                                <RotateCcw className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    No returns found
                                </p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        returns.map((ret) => (
                            <TableRow
                                key={ret.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => onAction("view", ret)}
                            >
                                <TableCell className="text-xs font-medium">
                                    {ret.return_number}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {ret.original_invoice_number}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {formatDate(ret.return_date)}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {ret.customer_name || "Walk-in"}
                                </TableCell>
                                <TableCell className="text-xs text-right font-medium">
                                    {formatCurrency(ret.total_returned)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="secondary"
                                        className={`text-[10px] ${getReturnStatusColor(ret.status)}`}
                                    >
                                        {getReturnStatusLabel(ret.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAction("view", ret);
                                            }}
                                        >
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                        {ret.status === "INITIATED" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-green-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAction("approve", ret);
                                                }}
                                            >
                                                <CheckCircle className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {ret.status === "APPROVED" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-blue-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAction("complete", ret);
                                                }}
                                            >
                                                <CheckCircle className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
