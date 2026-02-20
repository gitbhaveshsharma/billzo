"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, Plus, Minus } from "lucide-react";
import {
    adjustLoyaltyPointsSchema,
    type AdjustLoyaltyPointsFormData,
} from "@/validations/customers.validation";
import type { Customer, AdjustLoyaltyPointsRequest } from "@/types/customers.types";
import { formatPoints } from "@/utils/customers.utils";

// ============================================================================
// TYPES
// ============================================================================

interface AdjustLoyaltyPointsDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (customerId: string, data: AdjustLoyaltyPointsRequest) => Promise<boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdjustLoyaltyPointsDialog({
    customer,
    open,
    onOpenChange,
    onSubmit,
}: AdjustLoyaltyPointsDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState<"add" | "deduct">("add");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AdjustLoyaltyPointsFormData>({
        resolver: zodResolver(adjustLoyaltyPointsSchema),
        defaultValues: {
            points: undefined as unknown as number,
            reason: "",
        },
    });

    const onFormSubmit = async (data: AdjustLoyaltyPointsFormData) => {
        if (!customer) return;
        setIsSubmitting(true);
        const toastId = toast.loading(mode === "add" ? "Adding points..." : "Deducting points...");

        try {
            const adjustedPoints = mode === "deduct" ? -Math.abs(data.points) : Math.abs(data.points);
            const success = await onSubmit(customer.id, {
                points: adjustedPoints,
                reason: data.reason,
            });
            if (success) {
                toast.success(
                    mode === "add"
                        ? `Added ${Math.abs(data.points)} points`
                        : `Deducted ${Math.abs(data.points)} points`,
                    { id: toastId }
                );
                reset();
                setMode("add");
                onOpenChange(false);
            } else {
                toast.error("Failed to adjust loyalty points", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            reset();
            setMode("add");
        }
        onOpenChange(isOpen);
    };

    if (!customer) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Adjust Loyalty Points
                    </DialogTitle>
                    <DialogDescription>
                        Adjust loyalty points for <strong>{customer.name}</strong>.
                        Current balance: <strong>{formatPoints(customer.loyalty_points)}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    {/* Add / Deduct toggle */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={mode === "add" ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setMode("add")}
                        >
                            <Plus className="mr-1 h-4 w-4" />
                            Add Points
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "deduct" ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setMode("deduct")}
                        >
                            <Minus className="mr-1 h-4 w-4" />
                            Deduct Points
                        </Button>
                    </div>

                    {/* Points amount */}
                    <div className="space-y-2">
                        <Label htmlFor="loyalty_points">
                            Points <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="loyalty_points"
                            type="number"
                            min={1}
                            placeholder="Enter points amount"
                            {...register("points", { valueAsNumber: true })}
                        />
                        {errors.points && (
                            <p className="text-xs text-destructive">{errors.points.message}</p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label htmlFor="loyalty_reason">
                            Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="loyalty_reason"
                            rows={2}
                            placeholder="Reason for adjustment..."
                            {...register("reason")}
                        />
                        {errors.reason && (
                            <p className="text-xs text-destructive">{errors.reason.message}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === "add" ? "Add Points" : "Deduct Points"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
