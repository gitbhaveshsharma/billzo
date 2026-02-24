"use client";

import { useState, useEffect } from "react";
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
import { createStockTransferSchema } from "@/validations/inventory.validation";
import type { CreateStockTransferRequest, EnrichedInventoryRecord } from "@/types/inventory.types";
import { formatQuantity } from "@/utils/inventory.utils";

// ============================================================================
// TYPES
// ============================================================================

interface StockTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: EnrichedInventoryRecord | null;
    onSubmit: (data: CreateStockTransferRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// STOCK TRANSFER DIALOG
// ============================================================================

export function StockTransferDialog({
    open,
    onOpenChange,
    item,
    onSubmit,
    isSaving,
}: StockTransferDialogProps) {
    const [transferQuantity, setTransferQuantity] = useState<string>("");
    const [fromLocation, setFromLocation] = useState("");
    const [toLocation, setToLocation] = useState("");
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open && item) {
            setTransferQuantity("");
            setFromLocation(item.warehouse ?? item.location ?? "");
            setToLocation("");
            setReason("");
            setNotes("");
            setErrors({});
        }
    }, [open, item]);

    const handleSubmit = async () => {
        if (!item) return;

        const formData = {
            product_id: item.product_id,
            variant_id: item.variant_id ?? undefined,
            quantity: Number(transferQuantity),
            from_location: fromLocation,
            to_location: toLocation,
            reason,
            notes: notes || undefined,
        };

        const parsed = createStockTransferSchema.safeParse(formData);
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                const field = issue.path.join(".");
                if (!fieldErrors[field]) fieldErrors[field] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setErrors({});
        const success = await onSubmit(parsed.data as CreateStockTransferRequest);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Stock Transfer</DialogTitle>
                    <DialogDescription>
                        {item && (
                            <>
                                Transfer stock for <strong>{item.product?.name}</strong>
                                {item.variant?.name && ` (${item.variant.name})`}
                                . Available: <strong>{formatQuantity(item.quantity_available)}</strong>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-4">
                    <div className="space-y-2">
                        <Label>Quantity to Transfer *</Label>
                        <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={transferQuantity}
                            onChange={(e) => setTransferQuantity(e.target.value)}
                            placeholder="Enter quantity"
                        />
                        {errors.quantity && (
                            <p className="text-sm text-red-500">{errors.quantity}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>From Location *</Label>
                            <Input
                                value={fromLocation}
                                onChange={(e) => setFromLocation(e.target.value)}
                                placeholder="Source location"
                            />
                            {errors.from_location && (
                                <p className="text-sm text-red-500">{errors.from_location}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>To Location *</Label>
                            <Input
                                value={toLocation}
                                onChange={(e) => setToLocation(e.target.value)}
                                placeholder="Destination"
                            />
                            {errors.to_location && (
                                <p className="text-sm text-red-500">{errors.to_location}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Rebalance stock"
                        />
                        {errors.reason && (
                            <p className="text-sm text-red-500">{errors.reason}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional details..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "Transferring..." : "Transfer Stock"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
