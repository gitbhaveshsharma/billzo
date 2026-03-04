"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, XCircle } from "lucide-react";
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
import type { SaleReturn } from "@/types/sales.types";
import {
    approveReturnSchema,
    type ApproveReturnFormData,
} from "@/validations/sales.validation";
import { formatCurrency, formatDate } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ReturnApprovalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleReturn: SaleReturn | null;
    onConfirm: (returnId: string, approved: boolean, rejectionReason?: string) => void;
    isProcessing?: boolean;
}

// ============================================================================
// RETURN APPROVAL DIALOG
// ============================================================================

export function ReturnApprovalDialog({
    open,
    onOpenChange,
    saleReturn,
    onConfirm,
    isProcessing = false,
}: ReturnApprovalDialogProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<ApproveReturnFormData>({
        resolver: zodResolver(approveReturnSchema),
        defaultValues: { approved: true, rejection_reason: "" },
    });

    const approved = watch("approved");

    const onSubmit = (data: ApproveReturnFormData) => {
        if (!saleReturn) return;
        onConfirm(saleReturn.id, data.approved, data.rejection_reason ?? undefined);
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Approve/Reject Return</DialogTitle>
                    <DialogDescription> 
                        {saleReturn
                            ? `Return #${saleReturn.return_number} · ${formatCurrency(saleReturn.total_returned)}`
                            : "Loading..."}
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                {saleReturn && (
                    <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                        <p>
                            <span className="text-muted-foreground">Original Invoice:</span>{" "}
                            <span className="font-medium">{saleReturn.original_invoice_number}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Return Date:</span>{" "}
                            <span className="font-medium">{formatDate(saleReturn.return_date)}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-medium">{formatCurrency(saleReturn.total_returned)}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Reason:</span>{" "}
                            <span>{saleReturn.return_reason}</span>
                        </p>
                    </div>
                )}
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Approve / Reject toggle */}
                    <div className="flex gap-2 p-4">
                        <Button
                            type="button"
                            variant={approved ? "default" : "outline"}
                            className="flex-1 gap-1"
                            size="sm"
                            onClick={() => setValue("approved", true)}
                        >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                        </Button>
                        <Button
                            type="button"
                            variant={!approved ? "destructive" : "outline"}
                            className="flex-1 gap-1"
                            size="sm"
                            onClick={() => setValue("approved", false)}
                        >
                            <XCircle className="h-4 w-4" />
                            Reject
                        </Button>
                    </div>

                    {/* Rejection reason (only when rejecting) */}
                    {!approved && (
                        <div className="space-y-1 p-4">
                            <Label htmlFor="reject-reason">Rejection Reason *</Label>
                            <Textarea
                                id="reject-reason"
                                rows={3}
                                placeholder="Why is this return being rejected?"
                                {...register("rejection_reason")}
                            />
                            {errors.rejection_reason && (
                                <p className="text-xs text-red-500">
                                    {errors.rejection_reason.message}
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant={approved ? "default" : "destructive"}
                            disabled={isProcessing}
                        >
                            {isProcessing
                                ? "Processing..."
                                : approved
                                ? "Approve Return"
                                : "Reject Return"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
