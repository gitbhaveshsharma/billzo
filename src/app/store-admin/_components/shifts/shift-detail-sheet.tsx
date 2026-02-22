"use client";

import { useEffect, useCallback } from "react";
import {
    Clock,
    Calendar,
    Monitor,
    User,
    Banknote,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Smartphone,
    Receipt,
    TrendingUp,
    AlertTriangle,
    PauseCircle,
    PlayCircle,
    XCircle,
    DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { EnrichedCashShift, CashMovement, ShiftStatus } from "@/types/shifts.types";
import {
    getShiftStatusLabel,
    getShiftStatusColor,
    getCashMovementTypeLabel,
    getCashMovementTypeColor,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTime,
    formatShiftDuration,
    calculateExpectedClosingCash,
    hasDiscrepancy,
    getDiscrepancyAmount,
    canCloseShift,
    canSuspendShift,
    canResumeShift,
    canAddCashMovement,
} from "@/utils/shifts.utils";
import { useShiftsStore } from "@/stores/shifts.store";

// ============================================================================
// TYPES
// ============================================================================

interface ShiftDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    shiftId: string | null;
    onClose: (shiftId: string) => void;
    onSuspend: (shiftId: string) => void;
    onResume: (shiftId: string) => void;
    onCashIn: (shiftId: string) => void;
    onCashOut: (shiftId: string) => void;
}

// ============================================================================
// INFO ROW
// ============================================================================

function InfoRow({
    label,
    value,
    icon,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2 py-1.5">
            {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
            <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="text-sm font-medium truncate">{value || "—"}</p>
            </div>
        </div>
    );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ shift }: { shift: EnrichedCashShift }) {
    const expectedCash = calculateExpectedClosingCash(shift);
    const isDiscrepant = hasDiscrepancy(shift);
    const discrepancy = getDiscrepancyAmount(shift);

    return (
        <div className="space-y-5">
            {/* Shift Info */}
            <div className="grid grid-cols-2 gap-x-4">
                <InfoRow
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Shift Date"
                    value={formatDate(shift.shift_date)}
                />
                <InfoRow
                    icon={<Monitor className="h-3.5 w-3.5" />}
                    label="Terminal"
                    value={shift.terminal_name ?? "Main"}
                />
                <InfoRow
                    icon={<User className="h-3.5 w-3.5" />}
                    label="Opened By"
                    value={shift.cashier_name ?? shift.opened_by.slice(0, 8)}
                />
                <InfoRow
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Opened At"
                    value={formatDateTime(shift.opened_at)}
                />
                {shift.closed_at && (
                    <>
                        <InfoRow
                            icon={<User className="h-3.5 w-3.5" />}
                            label="Closed By"
                            value={shift.closed_by_name ?? shift.closed_by?.slice(0, 8) ?? "—"}
                        />
                        <InfoRow
                            icon={<Clock className="h-3.5 w-3.5" />}
                            label="Closed At"
                            value={formatDateTime(shift.closed_at)}
                        />
                    </>
                )}
                <InfoRow
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Duration"
                    value={formatShiftDuration(shift)}
                />
            </div>

            {shift.opening_notes && (
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Opening Notes</p>
                    <p className="text-sm bg-muted/50 p-2 rounded">{shift.opening_notes}</p>
                </div>
            )}

            <Separator />

            {/* Cash Reconciliation */}
            <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <Banknote className="h-4 w-4" />
                    Cash Reconciliation
                </h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Opening Cash</span>
                        <span className="font-medium">{formatCurrency(shift.opening_cash)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                        <span>+ Cash Sales</span>
                        <span>{formatCurrency(shift.cash_sales)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                        <span>+ Cash In</span>
                        <span>{formatCurrency(shift.cash_in)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                        <span>− Cash Out</span>
                        <span>{formatCurrency(shift.cash_out)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                        <span>Expected in Drawer</span>
                        <span>{formatCurrency(expectedCash)}</span>
                    </div>
                    {shift.closing_cash_actual != null && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Actual Cash</span>
                                <span className="font-medium">
                                    {formatCurrency(shift.closing_cash_actual)}
                                </span>
                            </div>
                            <div
                                className={`flex justify-between font-semibold ${
                                    isDiscrepant ? "text-red-600" : "text-green-600"
                                }`}
                            >
                                <span>Difference</span>
                                <span>
                                    {discrepancy > 0 ? "+" : ""}
                                    {formatCurrency(discrepancy)}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {shift.closing_notes && (
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Closing Notes</p>
                    <p className="text-sm bg-muted/50 p-2 rounded">{shift.closing_notes}</p>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SALES TAB
// ============================================================================

function SalesTab({ shift }: { shift: EnrichedCashShift }) {
    const paymentRows = [
        { label: "Cash", icon: <Banknote className="h-3.5 w-3.5" />, amount: shift.cash_sales },
        { label: "Card", icon: <CreditCard className="h-3.5 w-3.5" />, amount: shift.card_sales },
        { label: "UPI", icon: <Smartphone className="h-3.5 w-3.5" />, amount: shift.upi_sales },
        { label: "Other", icon: <DollarSign className="h-3.5 w-3.5" />, amount: shift.other_sales },
    ];

    return (
        <div className="space-y-5">
            {/* Sales Summary */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-lg font-bold">{shift.total_sales_count}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold">{formatCurrency(shift.total_sales_amount)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Returns</p>
                    <p className="text-lg font-bold text-red-600">{shift.total_returns_count}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(shift.total_returns_amount)}
                    </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Tax Collected</p>
                    <p className="text-lg font-bold">{formatCurrency(shift.total_tax_collected)}</p>
                </div>
            </div>

            {shift.total_discount_given > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Discounts Given</p>
                        <p className="text-xs text-amber-700">
                            {formatCurrency(shift.total_discount_given)}
                        </p>
                    </div>
                </div>
            )}

            <Separator />

            {/* Payment Breakdown */}
            <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4" />
                    Payment Breakdown
                </h4>
                <div className="space-y-2">
                    {paymentRows.map((row) => {
                        const pct =
                            shift.total_sales_amount > 0
                                ? ((row.amount / shift.total_sales_amount) * 100).toFixed(1)
                                : "0.0";
                        return (
                            <div
                                key={row.label}
                                className="flex items-center justify-between rounded-lg border p-2.5"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{row.icon}</span>
                                    <span className="text-sm font-medium">{row.label}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{formatCurrency(row.amount)}</p>
                                    <p className="text-xs text-muted-foreground">{pct}%</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MOVEMENTS TAB
// ============================================================================

function MovementsTab({ movements }: { movements: CashMovement[] }) {
    if (!movements.length) {
        return (
            <p className="text-muted-foreground text-sm py-6 text-center">
                No cash movements recorded for this shift.
            </p>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movements.map((mv) => {
                        const isInflow =
                            mv.movement_type === "CASH_IN" || mv.movement_type === "OPENING";
                        return (
                            <TableRow key={mv.id}>
                                <TableCell>
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs ${getCashMovementTypeColor(mv.movement_type)}`}
                                    >
                                        {getCashMovementTypeLabel(mv.movement_type)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm truncate max-w-[150px]">{mv.reason}</p>
                                    {mv.authorized_by && (
                                        <p className="text-xs text-muted-foreground">
                                            Auth: {mv.authorized_by.slice(0, 8)}…
                                        </p>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span
                                        className={`text-sm font-medium ${
                                            isInflow ? "text-green-600" : "text-red-600"
                                        }`}
                                    >
                                        {isInflow ? "+" : "−"}
                                        {formatCurrency(mv.amount)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTime(mv.created_at)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

// ============================================================================
// DETAIL SHEET SKELETON
// ============================================================================

function DetailSkeleton() {
    return (
        <div className="space-y-4 p-1">
            <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// SHIFT DETAIL SHEET
// ============================================================================

export function ShiftDetailSheet({
    open,
    onOpenChange,
    storeId,
    shiftId,
    onClose,
    onSuspend,
    onResume,
    onCashIn,
    onCashOut,
}: ShiftDetailSheetProps) {
    const { currentShift, fetchShiftById, isLoading } = useShiftsStore();

    const shift = shiftId && currentShift?.id === shiftId ? currentShift : null;

    const loadShift = useCallback(async () => {
        if (!shiftId || !storeId) return;
        await fetchShiftById(storeId, shiftId);
    }, [shiftId, storeId, fetchShiftById]);

    useEffect(() => {
        if (open && shiftId) {
            loadShift();
        }
    }, [open, shiftId, loadShift]);

    const status: ShiftStatus | undefined = shift?.status;
    const canDoClose = shift ? canCloseShift(shift) : false;
    const canDoSuspend = shift ? canSuspendShift(shift) : false;
    const canDoResume = shift ? canResumeShift(shift) : false;
    const canDoMovement = shift ? canAddCashMovement(shift) : false;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
                <SheetHeader className="px-6 pt-6 pb-2">
                    <div className="flex items-center gap-3">
                        <SheetTitle className="text-lg">Shift Details</SheetTitle>
                        {status && (
                            <Badge
                                variant="secondary"
                                className={`text-xs ${getShiftStatusColor(status)}`}
                            >
                                {getShiftStatusLabel(status)}
                            </Badge>
                        )}
                    </div>
                    <SheetDescription>
                        {shift
                            ? `${shift.terminal_name ?? "Main"} · ${formatDate(shift.shift_date)}`
                            : "Loading shift details..."}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6">
                    {(isLoading && !shift) || !shift ? (
                        <DetailSkeleton />
                    ) : (
                        <Tabs defaultValue="overview" className="pb-4">
                            <TabsList className="w-full grid grid-cols-3 mb-4">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="sales">Sales</TabsTrigger>
                                <TabsTrigger value="movements">
                                    Movements
                                    {shift.movements.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-1.5 text-xs px-1.5 py-0"
                                        >
                                            {shift.movements.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <OverviewTab shift={shift} />
                            </TabsContent>

                            <TabsContent value="sales">
                                <SalesTab shift={shift} />
                            </TabsContent>

                            <TabsContent value="movements">
                                <MovementsTab movements={shift.movements} />
                            </TabsContent>
                        </Tabs>
                    )}
                </ScrollArea>

                {/* Actions */}
                {shift && status !== "CLOSED" && (
                    <>
                        <Separator />
                        <div className="flex flex-wrap gap-2 px-6 py-4">
                            {canDoMovement && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onCashIn(shift.id)}
                                    >
                                        <ArrowUpRight className="h-3.5 w-3.5 mr-1 text-green-600" />
                                        Cash In
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onCashOut(shift.id)}
                                    >
                                        <ArrowDownRight className="h-3.5 w-3.5 mr-1 text-red-600" />
                                        Cash Out
                                    </Button>
                                </>
                            )}
                            {canDoSuspend && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                    onClick={() => onSuspend(shift.id)}
                                >
                                    <PauseCircle className="h-3.5 w-3.5 mr-1" />
                                    Suspend
                                </Button>
                            )}
                            {canDoResume && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => onResume(shift.id)}
                                >
                                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                    Resume
                                </Button>
                            )}
                            {canDoClose && (
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="ml-auto"
                                    onClick={() => onClose(shift.id)}
                                >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Close Shift
                                </Button>
                            )}
                        </div>
                    </>
                )}

                {/* Discrepancy warning */}
                {shift && hasDiscrepancy(shift) && (
                    <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Discrepancy Detected</p>
                            <p className="text-xs text-red-700">
                                Cash difference of {formatCurrency(getDiscrepancyAmount(shift))} was recorded on this shift.
                            </p>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
