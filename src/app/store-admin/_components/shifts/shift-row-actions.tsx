"use client";

import {
    MoreHorizontal,
    Eye,
    XCircle,
    PlayCircle,
    PauseCircle,
    Banknote,
    ArrowDownToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CashShift } from "@/types/shifts.types";
import {
    canCloseShift,
    canSuspendShift,
    canResumeShift,
    canAddCashMovement,
} from "@/utils/shifts.utils";
// ============================================================================
// TYPES
// ============================================================================

export type ShiftAction =
    | "view"
    | "close"
    | "suspend"
    | "resume"
    | "cash_in"
    | "cash_out";
// ============================================================================

interface ShiftRowActionsProps {
    shift: CashShift;
    onAction: (action: ShiftAction, shift: CashShift) => void;
}

// ============================================================================
// SHIFT ROW ACTIONS
// ============================================================================

export function ShiftRowActions({ shift, onAction }: ShiftRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onAction("view", shift)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>

                {canAddCashMovement(shift) && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAction("cash_in", shift)}>
                            <Banknote className="mr-2 h-4 w-4" />
                            Cash In
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("cash_out", shift)}>
                            <ArrowDownToLine className="mr-2 h-4 w-4" />
                            Cash Out / Safe Drop
                        </DropdownMenuItem>
                    </>
                )}

                {(canCloseShift(shift) || canSuspendShift(shift) || canResumeShift(shift)) && (
                    <DropdownMenuSeparator />
                )}

                {canResumeShift(shift) && (
                    <DropdownMenuItem onClick={() => onAction("resume", shift)}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Resume Shift
                    </DropdownMenuItem>
                )}

                {canSuspendShift(shift) && (
                    <DropdownMenuItem
                        onClick={() => onAction("suspend", shift)}
                        className="text-amber-600 focus:text-amber-600"
                    >
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Suspend Shift
                    </DropdownMenuItem>
                )}

                {canCloseShift(shift) && (
                    <DropdownMenuItem
                        onClick={() => onAction("close", shift)}
                        className="text-red-600 focus:text-red-600"
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Close Shift
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
