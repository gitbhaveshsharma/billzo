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
import { Clock } from "lucide-react";
import type { CashShift } from "@/types/shifts.types";
import {
    getShiftStatusLabel,
    getShiftStatusColor,
    formatCurrency,
    formatDate,
    formatTime,
    formatShiftDuration,
} from "@/utils/shifts.utils";
import { ShiftRowActions } from "./shift-row-actions";
import type { ShiftAction } from "./shift-row-actions";

export type { ShiftAction };

interface ShiftTableProps {
    shifts: CashShift[];
    isLoading: boolean;
    onAction: (action: ShiftAction, shift: CashShift) => void;
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
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
                        <Clock className="text-muted-foreground h-6 w-6" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">
                        No shifts found
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Open a shift to start recording sales.
                    </p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// SHIFT ROW
// ============================================================================

function ShiftRow({
    shift,
    onAction,
}: {
    shift: CashShift;
    onAction: (action: ShiftAction, shift: CashShift) => void;
}) {
    const difference = shift.cash_difference ?? 0;
    const hasDiff = shift.status === "CLOSED" && difference !== 0;

    return (
        <TableRow
            className="cursor-pointer"
            onClick={() => onAction("view", shift)}
        >
            <TableCell className="text-muted-foreground text-sm">
                {formatDate(shift.shift_date)}
            </TableCell>
            <TableCell className="max-w-[120px] truncate text-sm">
                {shift.terminal_name ?? shift.terminal_id ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {formatTime(shift.opened_at)}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {shift.closed_at ? formatTime(shift.closed_at) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {formatShiftDuration(shift)}
            </TableCell>
            <TableCell className="text-right text-sm">
                {shift.total_sales_count}
            </TableCell>
            <TableCell className="text-right font-medium text-sm">
                {formatCurrency(shift.total_sales_amount)}
            </TableCell>
            <TableCell>
                {shift.status === "CLOSED" ? (
                    <span
                        className={`text-xs font-medium ${
                            hasDiff
                                ? difference > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                        }`}
                    >
                        {hasDiff
                            ? `${difference > 0 ? "+" : ""}${formatCurrency(difference)}`
                            : "—"}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )}
            </TableCell>
            <TableCell>
                <Badge
                    variant="secondary"
                    className={`text-xs ${getShiftStatusColor(shift.status)}`}
                >
                    {getShiftStatusLabel(shift.status)}
                </Badge>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <ShiftRowActions shift={shift} onAction={onAction} />
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// SHIFT TABLE
// ============================================================================

export function ShiftTable({
    shifts,
    isLoading,
    onAction,
}: ShiftTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Terminal</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Closed</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : shifts.length === 0 ? (
                        <EmptyState />
                    ) : (
                        shifts.map((shift) => (
                            <ShiftRow
                                key={shift.id}
                                shift={shift}
                                onAction={onAction}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
