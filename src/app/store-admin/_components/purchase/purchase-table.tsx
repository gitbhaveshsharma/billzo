"use client";

import { Checkbox } from "@/components/ui/checkbox";
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
import type { PurchaseOrder } from "@/types/purchase.types";
import {
    getPOStatusLabel,
    getPOStatusColor,
    getPaymentStatusLabel,
    getPaymentStatusColor,
    formatCurrency,
    formatDate,
} from "@/utils/purchase.utils";
import { PurchaseRowActions } from "./purchase-row-actions";

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseAction =
    | "view"
    | "edit"
    | "confirm"
    | "cancel"
    | "receive"
    | "payment"
    | "return"
    | "delete";

interface PurchaseTableProps {
    orders: PurchaseOrder[];
    selectedIds: string[];
    isLoading: boolean;
    onToggleSelect: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
    onAction: (action: PurchaseAction, order: PurchaseOrder) => void;
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
                        No purchase orders found
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Create your first purchase order to get started.
                    </p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// ORDER ROW
// ============================================================================

function OrderRow({
    order,
    isSelected,
    onToggleSelect,
    onAction,
}: {
    order: PurchaseOrder;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onAction: (action: PurchaseAction, order: PurchaseOrder) => void;
}) {
    return (
        <TableRow
            className="cursor-pointer"
            onClick={() => onAction("view", order)}
        >
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(order.id)}
                />
            </TableCell>
            <TableCell className="font-medium">{order.po_number}</TableCell>
            <TableCell className="max-w-[160px] truncate">
                {order.supplier_name}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {formatDate(order.order_date)}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {formatDate(order.expected_delivery_date)}
            </TableCell>
            <TableCell>
                <Badge variant="secondary" className={getPOStatusColor(order.status)}>
                    {getPOStatusLabel(order.status)}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge variant="secondary" className={getPaymentStatusColor(order.payment_status)}>
                    {getPaymentStatusLabel(order.payment_status)}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
                {formatCurrency(order.grand_total)}
            </TableCell>
            <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                {order.due_amount > 0 ? formatCurrency(order.due_amount) : "—"}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <PurchaseRowActions order={order} onAction={onAction} />
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// PURCHASE TABLE
// ============================================================================

export function PurchaseTable({
    orders,
    selectedIds,
    isLoading,
    onToggleSelect,
    onSelectAll,
    onAction,
}: PurchaseTableProps) {
    const allSelected = orders.length > 0 && selectedIds.length === orders.length;

    const handleSelectAll = () => {
        if (allSelected) {
            onSelectAll([]);
        } else {
            onSelectAll(orders.map((o) => o.id));
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                disabled={isLoading || !orders.length}
                            />
                        </TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Grand Total</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : orders.length === 0 ? (
                        <EmptyState />
                    ) : (
                        orders.map((order) => (
                            <OrderRow
                                key={order.id}
                                order={order}
                                isSelected={selectedIds.includes(order.id)}
                                onToggleSelect={onToggleSelect}
                                onAction={onAction}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
