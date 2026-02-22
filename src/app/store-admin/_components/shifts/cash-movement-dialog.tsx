"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { createCashMovementSchema } from "@/validations/shifts.validation";
import type { CreateCashMovementFormData } from "@/validations/shifts.validation";
import { CASH_MOVEMENT_TYPES } from "@/types/shifts.types";
import type { CreateCashMovementRequest, CashMovementType } from "@/types/shifts.types";
import { getCashMovementTypeLabel } from "@/utils/shifts.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CashMovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shiftId: string | null;
    /** Pre-select a movement type (e.g. "CASH_IN" from quick action) */
    defaultType?: CashMovementType;
    onSubmit: (shiftId: string, data: CreateCashMovementRequest) => Promise<boolean>;
    isSaving: boolean;
}

// Exclude OPENING/CLOSING from user-selectable types
const USER_MOVEMENT_TYPES = CASH_MOVEMENT_TYPES.filter(
    (t) => t !== "OPENING" && t !== "CLOSING"
);

// ============================================================================
// CASH MOVEMENT DIALOG
// ============================================================================

export function CashMovementDialog({
    open,
    onOpenChange,
    shiftId,
    defaultType,
    onSubmit,
    isSaving,
}: CashMovementDialogProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CreateCashMovementFormData>({
        resolver: zodResolver(createCashMovementSchema),
        defaultValues: {
            movement_type: defaultType ?? "CASH_IN",
            amount: 0,
            reason: "",
            authorized_by: "",
        },
    });

    // Reset form when dialog opens with default type
    useEffect(() => {
        if (open) {
            reset({
                movement_type: defaultType ?? "CASH_IN",
                amount: 0,
                reason: "",
                authorized_by: "",
            });
        }
    }, [open, defaultType, reset]);

    const movementType = watch("movement_type");
    const isSafeDrop = movementType === "SAFE_DROP";

    const onFormSubmit = async (data: CreateCashMovementFormData) => {
        if (!shiftId) return;

        const request: CreateCashMovementRequest = {
            movement_type: data.movement_type as CashMovementType,
            amount: data.amount,
            reason: data.reason,
            authorized_by: data.authorized_by || undefined,
        };

        const success = await onSubmit(shiftId, request);
        if (success) {
            reset();
            onOpenChange(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) reset();
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-blue-600" />
                        Cash Movement
                    </DialogTitle>
                    <DialogDescription>
                        Record a cash movement for this shift. All movements are logged for reconciliation.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-4">
                    {/* Movement Type */}
                    <div className="space-y-2">
                        <Label>Movement Type *</Label>
                        <Select
                            value={movementType}
                            onValueChange={(val) =>
                                setValue("movement_type", val as CashMovementType, {
                                    shouldValidate: true,
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {USER_MOVEMENT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {getCashMovementTypeLabel(type)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.movement_type && (
                            <p className="text-sm text-red-500">
                                {errors.movement_type.message}
                            </p>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="movement_amount">Amount (₹) *</Label>
                        <Input
                            id="movement_amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            {...register("amount", { valueAsNumber: true })}
                        />
                        {errors.amount && (
                            <p className="text-sm text-red-500">{errors.amount.message}</p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label htmlFor="movement_reason">Reason *</Label>
                        <Textarea
                            id="movement_reason"
                            placeholder="Describe the reason for this movement..."
                            rows={2}
                            {...register("reason")}
                        />
                        {errors.reason && (
                            <p className="text-sm text-red-500">{errors.reason.message}</p>
                        )}
                    </div>

                    {/* Authorized By (required for SAFE_DROP) */}
                    {isSafeDrop && (
                        <div className="space-y-2">
                            <Label htmlFor="authorized_by">
                                Authorized By (Manager ID) *
                            </Label>
                            <Input
                                id="authorized_by"
                                placeholder="Manager user ID for authorization"
                                {...register("authorized_by")}
                            />
                            {errors.authorized_by && (
                                <p className="text-sm text-red-500">
                                    {errors.authorized_by.message}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Safe drops require manager authorization for security.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Recording..." : "Record Movement"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
