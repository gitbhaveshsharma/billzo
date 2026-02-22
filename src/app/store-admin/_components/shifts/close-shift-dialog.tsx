"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { closeShiftSchema } from "@/validations/shifts.validation";
import type { CloseShiftFormData } from "@/validations/shifts.validation";
import type { CashShift, CloseShiftRequest } from "@/types/shifts.types";
import {
    formatCurrency,
    calculateExpectedClosingCash,
} from "@/utils/shifts.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CloseShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shift: CashShift | null;
    onSubmit: (shiftId: string, data: CloseShiftRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// CLOSE SHIFT DIALOG
// ============================================================================

export function CloseShiftDialog({
    open,
    onOpenChange,
    shift,
    onSubmit,
    isSaving,
}: CloseShiftDialogProps) {
    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<CloseShiftFormData>({
        resolver: zodResolver(closeShiftSchema),
        defaultValues: {
            closing_cash_actual: 0,
            closing_notes: "",
        },
    });

    // Reset when dialog opens
    useEffect(() => {
        if (open) {
            reset({ closing_cash_actual: 0, closing_notes: "" });
        }
    }, [open, reset]);

    const closingCashActual = watch("closing_cash_actual") ?? 0;

    const expectedCash = useMemo(() => {
        if (!shift) return 0;
        return calculateExpectedClosingCash(shift);
    }, [shift]);

    const difference = closingCashActual - expectedCash;
    const absDifference = Math.abs(difference);
    const isShortage = difference < 0;
    const isExcess = difference > 0;
    const isLargeDiscrepancy = absDifference > 500;

    const onFormSubmit = async (data: CloseShiftFormData) => {
        if (!shift) return;
        const request: CloseShiftRequest = {
            closing_cash_actual: data.closing_cash_actual,
            closing_notes: data.closing_notes || undefined,
        };

        const success = await onSubmit(shift.id, request);
        if (success) {
            reset();
            onOpenChange(false);
        }
    };

    if (!shift) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) reset();
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-red-600" />
                        Close Shift
                    </DialogTitle>
                    <DialogDescription>
                        Count the cash in your drawer and enter the actual amount below.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-4">
                    {/* Cash Breakdown (read-only) */}
                    <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                        <p className="text-sm font-medium">Expected Cash Breakdown</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Opening Cash</span>
                                <span>{formatCurrency(shift.opening_cash)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">+ Cash Sales</span>
                                <span>{formatCurrency(shift.cash_sales)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">+ Cash In</span>
                                <span>{formatCurrency(shift.cash_in)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">− Cash Out</span>
                                <span>{formatCurrency(shift.cash_out)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-medium">
                                <span>= Expected Total</span>
                                <span>{formatCurrency(expectedCash)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actual Cash */}
                    <div className="space-y-2">
                        <Label htmlFor="closing_cash_actual">Actual Cash Counted (₹) *</Label>
                        <Input
                            id="closing_cash_actual"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...register("closing_cash_actual", { valueAsNumber: true })}
                        />
                        {errors.closing_cash_actual && (
                            <p className="text-sm text-red-500">
                                {errors.closing_cash_actual.message}
                            </p>
                        )}
                    </div>

                    {/* Difference (live) */}
                    {closingCashActual > 0 && (
                        <div
                            className={`rounded-lg border p-3 text-center ${
                                isShortage
                                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                                    : isExcess
                                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                                    : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                            }`}
                        >
                            <p className="text-xs text-muted-foreground">Difference</p>
                            <p
                                className={`text-lg font-bold ${
                                    isShortage
                                        ? "text-red-600 dark:text-red-400"
                                        : isExcess
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {difference === 0
                                    ? "₹0.00 — Perfect match!"
                                    : `${isExcess ? "+" : "−"}${formatCurrency(absDifference)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {isShortage ? "Cash shortage" : isExcess ? "Cash excess" : ""}
                            </p>
                        </div>
                    )}

                    {/* Warning for large discrepancy */}
                    {isLargeDiscrepancy && closingCashActual > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            ⚠️ Large discrepancy detected ({formatCurrency(absDifference)}).
                            Please double-check the cash count before closing.
                        </div>
                    )}

                    {/* Closing Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="closing_notes">Closing Notes</Label>
                        <Textarea
                            id="closing_notes"
                            placeholder="Any notes about the shift closure..."
                            rows={2}
                            {...register("closing_notes")}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isSaving}
                        >
                            {isSaving ? "Closing..." : "Close Shift"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
