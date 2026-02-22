"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import {
    blacklistCustomerSchema,
    type BlacklistCustomerFormData,
} from "@/validations/customers.validation";
import type { Customer } from "@/types/customers.types";

// ============================================================================
// BLACKLIST DIALOG
// ============================================================================

interface BlacklistCustomerDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (customerId: string, reason: string) => Promise<boolean>;
}

export function BlacklistCustomerDialog({
    customer,
    open,
    onOpenChange,
    onConfirm,
}: BlacklistCustomerDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<BlacklistCustomerFormData>({
        resolver: zodResolver(blacklistCustomerSchema),
        defaultValues: {
            is_blacklisted: true,
            blacklist_reason: "",
        },
    });

    const onFormSubmit = async (data: BlacklistCustomerFormData) => {
        if (!customer) return;
        setIsSubmitting(true);
        const success = await onConfirm(customer.id, data.blacklist_reason ?? "");
        if (success) {
            reset();
            onOpenChange(false);
        }
        setIsSubmitting(false);
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
                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        Blacklist Customer
                    </DialogTitle>
                    <DialogDescription>
                        You are about to blacklist <strong>{customer.name}</strong> ({customer.customer_code}).
                        This will flag the customer and prevent credit sales.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="blacklist_reason">
                            Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="blacklist_reason"
                            placeholder="Describe the reason for blacklisting..."
                            rows={3}
                            {...register("blacklist_reason")}
                        />
                        {errors.blacklist_reason && (
                            <p className="text-xs text-destructive">{errors.blacklist_reason.message}</p>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isSubmitting}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Blacklist
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// DELETE DIALOG
// ============================================================================

interface DeleteCustomerDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (customerId: string) => Promise<boolean>;
}

export function DeleteCustomerDialog({
    customer,
    open,
    onOpenChange,
    onConfirm,
}: DeleteCustomerDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!customer) return;
        setIsDeleting(true);
        const success = await onConfirm(customer.id);
        if (success) {
            onOpenChange(false);
        }
        setIsDeleting(false);
    };

    if (!customer) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Customer
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to permanently delete{" "}
                        <strong>{customer.name}</strong> ({customer.customer_code})?
                        This action cannot be undone. Customers with ledger entries cannot be deleted.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
