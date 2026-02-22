"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Sale } from "@/types/sales.types";
import {
    cancelSaleSchema,
    type CancelSaleFormData,
} from "@/validations/sales.validation";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CancelSaleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sale: Sale | null;
    onConfirm: (saleId: string, reason: string) => void;
    isProcessing?: boolean;
}

// ============================================================================
// CANCEL SALE DIALOG
// ============================================================================

export function CancelSaleDialog({
    open,
    onOpenChange,
    sale,
    onConfirm,
    isProcessing = false,
}: CancelSaleDialogProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<CancelSaleFormData>({
        resolver: zodResolver(cancelSaleSchema),
        defaultValues: { cancellation_reason: "" },
    });

    const onSubmit = (data: CancelSaleFormData) => {
        if (!sale) return;
        onConfirm(sale.id, data.cancellation_reason);
        reset();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) reset();
                onOpenChange(v);
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancel Sale
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. The sale will be permanently
                        cancelled.
                    </DialogDescription>
                </DialogHeader>

                {sale && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md p-3 text-sm space-y-1">
                        <p>
                            <span className="text-muted-foreground">Invoice:</span>{" "}
                            <span className="font-medium">{sale.invoice_number}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-medium">
                                {formatCurrency(sale.total_amount)}
                            </span>
                        </p>
                        {sale.paid_amount > 0 && (
                            <p>
                                <span className="text-muted-foreground">Paid:</span>{" "}
                                <span className="font-medium text-red-600">
                                    {formatCurrency(sale.paid_amount)} will need to be refunded
                                </span>
                            </p>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
                        <Textarea
                            id="cancel-reason"
                            rows={3}
                            placeholder="Enter the reason for cancelling this sale..."
                            {...register("cancellation_reason")}
                        />
                        {errors.cancellation_reason && (
                            <p className="text-xs text-red-500">
                                {errors.cancellation_reason.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isProcessing}
                        >
                            Keep Sale
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Cancelling..." : "Cancel Sale"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
