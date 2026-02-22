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
    blacklistSupplierSchema,
    type BlacklistSupplierFormData,
} from "@/validations/supplier.validation";
import type { Supplier } from "@/types/supplier.types";

// ============================================================================
// BLACKLIST DIALOG
// ============================================================================

interface BlacklistSupplierDialogProps {
    supplier: Supplier | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (supplierId: string, reason: string) => Promise<boolean>;
}

export function BlacklistSupplierDialog({
    supplier,
    open,
    onOpenChange,
    onConfirm,
}: BlacklistSupplierDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<BlacklistSupplierFormData>({
        resolver: zodResolver(blacklistSupplierSchema),
    });

    const onFormSubmit = async (data: BlacklistSupplierFormData) => {
        if (!supplier) return;
        setIsSubmitting(true);
        const success = await onConfirm(supplier.id, data.reason);
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

    if (!supplier) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        Blacklist Supplier
                    </DialogTitle>
                    <DialogDescription>
                        You are about to blacklist <strong>{supplier.name}</strong> (#{supplier.supplier_code}).
                        This will flag the supplier and prevent new orders.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="space-y-2 py-2 p-4">
                        <Label htmlFor="blacklist_reason">
                            Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="blacklist_reason"
                            placeholder="Describe the reason for blacklisting..."
                            rows={3}
                            {...register("reason")}
                        />
                        {errors.reason && (
                            <p className="text-xs text-destructive">{errors.reason.message}</p>
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

interface DeleteSupplierDialogProps {
    supplier: Supplier | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (supplierId: string) => Promise<boolean>;
}

export function DeleteSupplierDialog({
    supplier,
    open,
    onOpenChange,
    onConfirm,
}: DeleteSupplierDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!supplier) return;
        setIsDeleting(true);
        const success = await onConfirm(supplier.id);
        if (success) {
            onOpenChange(false);
        }
        setIsDeleting(false);
    };

    if (!supplier) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Supplier
                    </DialogTitle>
                         <DialogDescription>
                        Are you sure you want to permanently delete{" "}
                        <strong>{supplier.name}</strong> (#{supplier.supplier_code})?
                        This action cannot be undone.
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
