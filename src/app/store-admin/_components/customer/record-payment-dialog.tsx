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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, CreditCard } from "lucide-react";
import {
    recordPaymentSchema,
    type RecordPaymentFormData,
} from "@/validations/customers.validation";
import { PAYMENT_METHODS } from "@/types/customers.types";
import type { Customer, RecordPaymentRequest, PaymentMethod } from "@/types/customers.types";
import { formatCurrency, getPaymentMethodLabel } from "@/utils/customers.utils";

// ============================================================================
// TYPES
// ============================================================================

interface RecordPaymentDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: RecordPaymentRequest) => Promise<boolean>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RecordPaymentDialog({
    customer,
    open,
    onOpenChange,
    onSubmit,
}: RecordPaymentDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<RecordPaymentFormData>({
        resolver: zodResolver(recordPaymentSchema),
        defaultValues: {
            customer_id: customer?.id ?? "",
            amount: undefined as unknown as number,
            payment_method: "CASH" as PaymentMethod,
            payment_reference: "",
            notes: "",
        },
    });

    // Update customer_id when customer changes
    const watchPaymentMethod = watch("payment_method");

    const onFormSubmit = async (data: RecordPaymentFormData) => {
        if (!customer) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Recording payment...");

        try {
            const success = await onSubmit({
                ...data,
                customer_id: customer.id,
            } as RecordPaymentRequest);
            if (success) {
                toast.success("Payment recorded successfully", { id: toastId });
                reset();
                onOpenChange(false);
            } else {
                toast.error("Failed to record payment", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
    };

    if (!customer) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Record Payment
                    </DialogTitle>
                    <DialogDescription>
                        Record a payment from <strong>{customer.name}</strong>.
                        Outstanding balance: <strong>{formatCurrency(customer.outstanding_balance)}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    <input type="hidden" {...register("customer_id")} value={customer.id} />

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_amount">
                            Amount (₹) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="payment_amount"
                            type="number"
                            min={1}
                            step="0.01"
                            placeholder="Enter amount"
                            {...register("amount", { valueAsNumber: true })}
                        />
                        {errors.amount && (
                            <p className="text-xs text-destructive">{errors.amount.message}</p>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label>
                            Payment Method <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={watchPaymentMethod}
                            onValueChange={(val) =>
                                setValue("payment_method", val as PaymentMethod, { shouldValidate: true })
                            }
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
                            <p className="text-xs text-destructive">{errors.payment_method.message}</p>
                        )}
                    </div>

                    {/* Payment Reference */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_reference">Transaction / Reference ID</Label>
                        <Input
                            id="payment_reference"
                            placeholder="e.g., cheque number, UPI ref"
                            {...register("payment_reference")}
                        />
                        {errors.payment_reference && (
                            <p className="text-xs text-destructive">{errors.payment_reference.message}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_notes">Notes</Label>
                        <Textarea
                            id="payment_notes"
                            rows={2}
                            placeholder="Optional notes"
                            {...register("notes")}
                        />
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
                            Record Payment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
