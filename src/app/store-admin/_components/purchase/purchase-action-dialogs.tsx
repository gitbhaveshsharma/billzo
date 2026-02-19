"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

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

import type { PurchaseOrder } from "@/types/purchase.types";

// ============================================================================
// CANCEL PO DIALOG
// ============================================================================

interface CancelPODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: PurchaseOrder | null;
    onConfirm: (poId: string, reason: string) => Promise<boolean>;
    isSaving: boolean;
}

export function CancelPODialog({
    open,
    onOpenChange,
    order,
    onConfirm,
    isSaving,
}: CancelPODialogProps) {
    const [reason, setReason] = useState("");

    const handleConfirm = async () => {
        if (!order || reason.length < 5) return;
        const success = await onConfirm(order.id, reason);
        if (success) {
            setReason("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) setReason("");
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancel Purchase Order
                    </DialogTitle>
                    <DialogDescription>
                        {order && (
                            <>
                                Are you sure you want to cancel <strong>{order.po_number}</strong>?
                                This action cannot be undone.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label>Cancellation Reason *</Label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter the reason for cancellation (min 5 characters)..."
                        rows={3}
                    />
                    {reason.length > 0 && reason.length < 5 && (
                        <p className="text-sm text-red-500">
                            Reason must be at least 5 characters
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Keep Order
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isSaving || reason.length < 5}
                    >
                        {isSaving ? "Cancelling..." : "Cancel Order"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// DELETE PO DIALOG
// ============================================================================

interface DeletePODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: PurchaseOrder | null;
    onConfirm: (poId: string) => Promise<boolean>;
    isSaving: boolean;
}

export function DeletePODialog({
    open,
    onOpenChange,
    order,
    onConfirm,
    isSaving,
}: DeletePODialogProps) {
    const [confirmText, setConfirmText] = useState("");

    const handleConfirm = async () => {
        if (!order || confirmText !== "DELETE") return;
        const success = await onConfirm(order.id);
        if (success) {
            setConfirmText("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) setConfirmText("");
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" />
                        Delete Purchase Order
                    </DialogTitle>
                    <DialogDescription>
                        {order && (
                            <>
                                This will permanently delete <strong>{order.po_number}</strong> and
                                all its items. This action cannot be undone.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label>
                        Type <strong>DELETE</strong> to confirm
                    </Label>
                    <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isSaving || confirmText !== "DELETE"}
                    >
                        {isSaving ? "Deleting..." : "Delete Permanently"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
