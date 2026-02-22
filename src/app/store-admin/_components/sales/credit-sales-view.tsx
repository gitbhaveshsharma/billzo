"use client";

import { useMemo } from "react";
import {
    CreditCard,
    AlertTriangle,
    Clock,
    Phone,
    User,
    Plus,
    Eye,
} from "lucide-react";
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
import type { Sale } from "@/types/sales.types";
import {
    getSaleStatusLabel,
    getSaleStatusColor,
    formatCurrency,
    formatDate,
    formatDateTime,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

export type CreditSaleAction = "view" | "add_payment";

interface CreditSalesViewProps {
    sales: Sale[];
    isLoading?: boolean;
    onAction: (action: CreditSaleAction, sale: Sale) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function isOverdue(sale: Sale): boolean {
    if (!sale.credit_due_date) return false;
    return new Date(sale.credit_due_date) < new Date();
}

function getDaysOverdue(sale: Sale): number {
    if (!sale.credit_due_date) return 0;
    const diff = new Date().getTime() - new Date(sale.credit_due_date).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// CREDIT SALES VIEW
// ============================================================================

export function CreditSalesView({
    sales,
    isLoading = false,
    onAction,
}: CreditSalesViewProps) {
    // Summary
    const summary = useMemo(() => {
        const totalDue = sales.reduce((s, sale) => s + sale.due_amount, 0);
        const overdueCount = sales.filter(isOverdue).length;
        const overdueDue = sales
            .filter(isOverdue)
            .reduce((s, sale) => s + sale.due_amount, 0);
        return { totalDue, overdueCount, overdueDue, total: sales.length };
    }, [sales]);

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Total Credit Sales</p>
                    <p className="text-lg font-bold">{summary.total}</p>
                </div>
                <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Total Outstanding</p>
                    <p className="text-lg font-bold text-red-600">
                        {formatCurrency(summary.totalDue)}
                    </p>
                </div>
                <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        Overdue
                    </p>
                    <p className="text-lg font-bold text-yellow-600">
                        {summary.overdueCount}
                    </p>
                </div>
                <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Overdue Amount</p>
                    <p className="text-lg font-bold text-yellow-600">
                        {formatCurrency(summary.overdueDue)}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">Invoice</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Customer</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs text-right">Paid</TableHead>
                            <TableHead className="text-xs text-right">Due</TableHead>
                            <TableHead className="text-xs">Due Date</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 9 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12">
                                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        No credit sales found
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => {
                                const overdue = isOverdue(sale);
                                const daysOver = getDaysOverdue(sale);

                                return (
                                    <TableRow
                                        key={sale.id}
                                        className={`cursor-pointer hover:bg-muted/50 ${
                                            overdue ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""
                                        }`}
                                        onClick={() => onAction("view", sale)}
                                    >
                                        <TableCell className="text-xs font-medium">
                                            {sale.invoice_number}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatDate(sale.sale_date)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {sale.customer_name || "Walk-in"}
                                            </div>
                                            {sale.customer_phone && (
                                                <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                                    <Phone className="h-2.5 w-2.5" />
                                                    {sale.customer_phone}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                            {formatCurrency(sale.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-xs text-right text-green-600">
                                            {formatCurrency(sale.paid_amount)}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-bold text-red-600">
                                            {formatCurrency(sale.due_amount)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {sale.credit_due_date ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span className={overdue ? "text-red-600 font-medium" : ""}>
                                                        {formatDate(sale.credit_due_date)}
                                                    </span>
                                                    {overdue && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[10px] px-1 py-0"
                                                        >
                                                            {daysOver}d
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`text-[10px] ${getSaleStatusColor(sale.status)}`}
                                            >
                                                {getSaleStatusLabel(sale.status)}
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
                                                        onAction("view", sale);
                                                    }}
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                                {sale.due_amount > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-green-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onAction("add_payment", sale);
                                                        }}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
