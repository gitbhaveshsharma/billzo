"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ShoppingCart } from "lucide-react";
import type { Sale } from "@/types/sales.types";
import {
    getSaleStatusLabel,
    getSaleStatusColor,
    formatCurrency,
    formatDateTime,
} from "@/utils/sales.utils";
import { SalesRowActions } from "./sales-row-actions";
import type { SaleAction } from "./sales-row-actions";

export type { SaleAction };

interface SalesTableProps {
    sales: Sale[];
    isLoading: boolean;
    onAction: (action: SaleAction, sale: Sale) => void;
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
    return (
        <TableRow>
            <TableCell colSpan={10} className="h-48">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="bg-muted rounded-full p-3">
                        <ShoppingCart className="text-muted-foreground h-6 w-6" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">
                        No sales found
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Sales will appear here once transactions are made.
                    </p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// SALE ROW
// ============================================================================

function SaleRow({
    sale,
    onAction,
}: {
    sale: Sale;
    onAction: (action: SaleAction, sale: Sale) => void;
}) {
    const hasDue = sale.due_amount > 0;

    return (
        <TableRow
            className="cursor-pointer"
            onClick={() => onAction("view", sale)}
        >
            <TableCell className="text-sm font-medium">
                {sale.invoice_number || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {formatDateTime(sale.sale_time)}
            </TableCell>
            <TableCell className="max-w-[120px] truncate text-sm">
                {sale.customer_name ?? "Walk-in"}
            </TableCell>
            <TableCell className="text-right text-sm font-medium">
                {formatCurrency(sale.total_amount)}
            </TableCell>
            <TableCell className="text-right text-sm">
                {formatCurrency(sale.paid_amount)}
            </TableCell>
            <TableCell className="text-right text-sm">
                <span className={hasDue ? "text-red-600 font-medium" : "text-muted-foreground"}>
                    {hasDue ? formatCurrency(sale.due_amount) : "—"}
                </span>
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
                {formatCurrency(sale.tax_amount)}
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
                {formatCurrency(sale.discount_total)}
            </TableCell>
            <TableCell>
                <Badge
                    variant="secondary"
                    className={`text-xs ${getSaleStatusColor(sale.status)}`}
                >
                    {getSaleStatusLabel(sale.status)}
                </Badge>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <SalesRowActions sale={sale} onAction={onAction} />
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// SALES TABLE
// ============================================================================

export function SalesTable({
    sales,
    isLoading,
    onAction,
}: SalesTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : sales.length === 0 ? (
                        <EmptyState />
                    ) : (
                        sales.map((sale) => (
                            <SaleRow
                                key={sale.id}
                                sale={sale}
                                onAction={onAction}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
