"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DollarSign } from "lucide-react";

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

import { openShiftSchema } from "@/validations/shifts.validation";
import type { OpenShiftFormData } from "@/validations/shifts.validation";
import type { OpenShiftRequest } from "@/types/shifts.types";

// ============================================================================
// TYPES
// ============================================================================

interface OpenShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: OpenShiftRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// OPEN SHIFT DIALOG
// ============================================================================

export function OpenShiftDialog({
    open,
    onOpenChange,
    onSubmit,
    isSaving,
}: OpenShiftDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<OpenShiftFormData>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            opening_cash: 0,
            terminal_id: "",
            terminal_name: "",
            opening_notes: "",
        },
    });

    const onFormSubmit = async (data: OpenShiftFormData) => {
        const request: OpenShiftRequest = {
            opening_cash: data.opening_cash,
            terminal_id: data.terminal_id || undefined,
            terminal_name: data.terminal_name || undefined,
            opening_notes: data.opening_notes || undefined,
        };

        const success = await onSubmit(request);
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
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Open New Shift
                    </DialogTitle>
                    <DialogDescription>
                        Start a new cash register shift. Enter the cash amount currently in the drawer.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    {/* Opening Cash */}
                    <div className="space-y-2">
                        <Label htmlFor="opening_cash">Opening Cash (₹) *</Label>
                        <Input
                            id="opening_cash"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...register("opening_cash", { valueAsNumber: true })}
                        />
                        {errors.opening_cash && (
                            <p className="text-sm text-red-500">{errors.opening_cash.message}</p>
                        )}
                    </div>

                    {/* Terminal Name */}
                    <div className="space-y-2">
                        <Label htmlFor="terminal_name">Terminal Name</Label>
                        <Input
                            id="terminal_name"
                            placeholder="e.g. Counter 1, POS-A"
                            {...register("terminal_name")}
                        />
                        {errors.terminal_name && (
                            <p className="text-sm text-red-500">{errors.terminal_name.message}</p>
                        )}
                    </div>

                    {/* Terminal ID */}
                    <div className="space-y-2">
                        <Label htmlFor="terminal_id">Terminal ID</Label>
                        <Input
                            id="terminal_id"
                            placeholder="Optional: T-001"
                            {...register("terminal_id")}
                        />
                    </div>

                    {/* Opening Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="opening_notes">Notes</Label>
                        <Textarea
                            id="opening_notes"
                            placeholder="Any notes about the shift opening..."
                            rows={2}
                            {...register("opening_notes")}
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
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Opening..." : "Open Shift"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
