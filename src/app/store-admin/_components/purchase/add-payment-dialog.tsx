"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";

import { createPurchasePaymentSchema } from "@/validations/purchase.validation";
import type { CreatePurchasePaymentFormData } from "@/validations/purchase.validation";
import type { PurchaseOrder, CreatePurchasePaymentRequest } from "@/types/purchase.types";
import { PAYMENT_METHODS } from "@/types/purchase.types";
import { getPaymentMethodLabel, formatCurrency } from "@/utils/purchase.utils";

// ============================================================================
// TYPES
// ============================================================================

interface AddPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: PurchaseOrder | null;
    onSubmit: (poId: string, data: CreatePurchasePaymentRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// ADD PAYMENT DIALOG
// ============================================================================

export function AddPaymentDialog({
    open,
    onOpenChange,
    order,
    onSubmit,
    isSaving,
}: AddPaymentDialogProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CreatePurchasePaymentFormData>({
        resolver: zodResolver(createPurchasePaymentSchema),
        defaultValues: {
            payment_date: new Date().toISOString().split("T")[0],
            amount: 0,
            payment_method: "cash",
            transaction_reference: "",
            bank_name: "",
            cheque_number: "",
            cheque_date: "",
            notes: "",
        },
    });

    const paymentMethod = watch("payment_method");

    // Reset form and set default amount to due amount
    useEffect(() => {
        if (open && order) {
            reset({
                payment_date: new Date().toISOString().split("T")[0],
                amount: order.due_amount > 0 ? order.due_amount : 0,
                payment_method: "cash",
                transaction_reference: "",
                bank_name: "",
                cheque_number: "",
                cheque_date: "",
                notes: "",
            });
        }
    }, [open, order, reset]);

    const onFormSubmit = async (data: CreatePurchasePaymentFormData) => {
        if (!order) return;

        const request: CreatePurchasePaymentRequest = {
            payment_date: data.payment_date,
            amount: data.amount,
            payment_method: data.payment_method,
            transaction_reference: data.transaction_reference || undefined,
            bank_name: data.bank_name || undefined,
            cheque_number: data.cheque_number || undefined,
            cheque_date: data.cheque_date || undefined,
            notes: data.notes || undefined,
        };

        const success = await onSubmit(order.id, request);
        if (success) {
            reset();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Add Payment
                    </DialogTitle>
                    <DialogDescription>
                        {order && (
                            <>
                                {order.po_number} &middot; Due: {formatCurrency(order.due_amount)}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0 p-4 overflow-x-auto">

                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 mt-0 px-4">
                        {/* Amount */}
                        <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input
                                type="number"
                                {...register("amount", { valueAsNumber: true })}
                                min={0.01}
                                max={order?.due_amount ?? 999999999}
                                step="0.01"
                            />
                            {errors.amount && (
                                <p className="text-sm text-red-500">{errors.amount.message}</p>
                            )}
                            {order && (
                                <p className="text-xs text-muted-foreground">
                                    Max: {formatCurrency(order.due_amount)}
                                </p>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label>Payment Method *</Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={(val) => setValue("payment_method", val as typeof paymentMethod)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((method) => (
                                        <SelectItem key={method} value={method}>
                                            {getPaymentMethodLabel(method)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.payment_method && (
                                <p className="text-sm text-red-500">{errors.payment_method.message}</p>
                            )}
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-2">
                            <Label>Payment Date *</Label>
                            <Input type="date" {...register("payment_date")} />
                            {errors.payment_date && (
                                <p className="text-sm text-red-500">{errors.payment_date.message}</p>
                            )}
                        </div>

                        {/* Conditional: Bank Transfer */}
                        {paymentMethod === "bank_transfer" && (
                            <>
                                <div className="space-y-2">
                                    <Label>Transaction Reference *</Label>
                                    <Input
                                        {...register("transaction_reference")}
                                        placeholder="e.g. UTR number"
                                    />
                                    {errors.transaction_reference && (
                                        <p className="text-sm text-red-500">
                                            {errors.transaction_reference.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input {...register("bank_name")} placeholder="e.g. SBI" />
                                </div>
                            </>
                        )}

                        {/* Conditional: UPI */}
                        {paymentMethod === "upi" && (
                            <div className="space-y-2">
                                <Label>Transaction Reference</Label>
                                <Input
                                    {...register("transaction_reference")}
                                    placeholder="UPI Transaction ID"
                                />
                            </div>
                        )}

                        {/* Conditional: Cheque */}
                        {paymentMethod === "cheque" && (
                            <>
                                <div className="space-y-2">
                                    <Label>Cheque Number *</Label>
                                    <Input
                                        {...register("cheque_number")}
                                        placeholder="Cheque number"
                                    />
                                    {errors.cheque_number && (
                                        <p className="text-sm text-red-500">{errors.cheque_number.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Cheque Date</Label>
                                    <Input type="date" {...register("cheque_date")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input {...register("bank_name")} placeholder="Bank name" />
                                </div>
                            </>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                {...register("notes")}
                                placeholder="Payment notes..."
                                rows={2}
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
                                {isSaving ? "Recording..." : "Record Payment"}
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
