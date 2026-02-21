"use client";

import { useEffect, useMemo } from "react";
import {
    Clock,
    AlertCircle,
    PlayCircle,
    PauseCircle,
    Banknote,
    ArrowUpRight,
    ArrowDownRight,
    XCircle,
    ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { CashShift, ShiftStatus } from "@/types/shifts.types";
import {
    getShiftStatusLabel,
    getShiftStatusColor,
    formatCurrency,
    formatTime,
    formatShiftDuration,
    canCloseShift,
    canSuspendShift,
    canAddCashMovement,
} from "@/utils/shifts.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ShiftStatusBannerProps {
    /** Currently active shift (OPEN or SUSPENDED), null if none */
    shift: CashShift | null;
    isLoading: boolean;
    /** Show a compact version (POS toolbar) */
    compact?: boolean;
    onOpenShift: () => void;
    onCloseShift: (shiftId: string) => void;
    onSuspendShift: (shiftId: string) => void;
    onCashIn: (shiftId: string) => void;
    onCashOut: (shiftId: string) => void;
}

// ============================================================================
// NO SHIFT BANNER
// ============================================================================

function NoShiftBanner({
    onOpenShift,
    compact,
}: {
    onOpenShift: () => void;
    compact?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                    No Active Shift
                </p>
                {!compact && (
                    <p className="text-xs text-amber-700">
                        Open a shift to start processing sales and managing cash.
                    </p>
                )}
            </div>
            <Button size="sm" onClick={onOpenShift}>
                <PlayCircle className="h-3.5 w-3.5 mr-1" />
                Open Shift
            </Button>
        </div>
    );
}

// ============================================================================
// ACTIVE SHIFT BANNER
// ============================================================================

function ActiveShiftBanner({
    shift,
    compact,
    onCloseShift,
    onSuspendShift,
    onCashIn,
    onCashOut,
}: {
    shift: CashShift;
    compact?: boolean;
    onCloseShift: (id: string) => void;
    onSuspendShift: (id: string) => void;
    onCashIn: (id: string) => void;
    onCashOut: (id: string) => void;
}) {
    const isSuspended = shift.status === "SUSPENDED";
    const borderColor = isSuspended ? "border-amber-200" : "border-green-200";
    const bgColor = isSuspended ? "bg-amber-50" : "bg-green-50";

    const canClose = canCloseShift(shift);
    const canSuspend = canSuspendShift(shift);
    const canMovement = canAddCashMovement(shift);

    return (
        <div className={`flex items-center gap-3 rounded-lg border ${borderColor} ${bgColor} px-4 py-3`}>
            {/* Status Indicator */}
            <div className="flex items-center gap-2 shrink-0">
                <Badge
                    variant="secondary"
                    className={`text-xs ${getShiftStatusColor(shift.status)}`}
                >
                    {getShiftStatusLabel(shift.status)}
                </Badge>
            </div>

            {/* Shift Info */}
            <div className="flex-1 min-w-0 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatShiftDuration(shift)}
                </span>
                {shift.terminal_name && (
                    <span className="text-muted-foreground text-xs hidden sm:inline">
                        {shift.terminal_name}
                    </span>
                )}
                {!compact && (
                    <>
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <ShoppingCart className="h-3.5 w-3.5" />
                            {shift.total_sales_count} sales
                        </span>
                        <span className="font-medium">
                            {formatCurrency(shift.total_sales_amount)}
                        </span>
                    </>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
                {canMovement && (
                    <>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-green-700 hover:bg-green-100"
                            onClick={() => onCashIn(shift.id)}
                            title="Cash In"
                        >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            {!compact && <span className="ml-1 hidden md:inline">In</span>}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-red-700 hover:bg-red-100"
                            onClick={() => onCashOut(shift.id)}
                            title="Cash Out"
                        >
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            {!compact && <span className="ml-1 hidden md:inline">Out</span>}
                        </Button>
                    </>
                )}
                {canSuspend && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-amber-700 hover:bg-amber-100"
                        onClick={() => onSuspendShift(shift.id)}
                        title="Suspend Shift"
                    >
                        <PauseCircle className="h-3.5 w-3.5" />
                    </Button>
                )}
                {canClose && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => onCloseShift(shift.id)}
                    >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Close
                    </Button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// BANNER SKELETON
// ============================================================================

function BannerSkeleton() {
    return (
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
        </div>
    );
}

// ============================================================================
// SHIFT STATUS BANNER (EXPORT)
// ============================================================================

export function ShiftStatusBanner({
    shift,
    isLoading,
    compact,
    onOpenShift,
    onCloseShift,
    onSuspendShift,
    onCashIn,
    onCashOut,
}: ShiftStatusBannerProps) {
    if (isLoading) return <BannerSkeleton />;

    if (!shift) {
        return <NoShiftBanner onOpenShift={onOpenShift} compact={compact} />;
    }

    return (
        <ActiveShiftBanner
            shift={shift}
            compact={compact}
            onCloseShift={onCloseShift}
            onSuspendShift={onSuspendShift}
            onCashIn={onCashIn}
            onCashOut={onCashOut}
        />
    );
}
