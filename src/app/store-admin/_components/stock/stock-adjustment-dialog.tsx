"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { createStockAdjustmentSchema } from "@/validations/inventory.validation";
import type { CreateStockAdjustmentRequest, EnrichedInventoryRecord } from "@/types/inventory.types";
import { TRANSACTION_TYPES } from "@/types/inventory.types";
import { getTransactionTypeLabel, formatQuantity, getInventoryUnitLabel } from "@/utils/inventory.utils";

// ============================================================================
// TYPES
// ============================================================================

const ADJUSTMENT_TYPES = ["ADJUSTMENT", "DAMAGE", "EXPIRY"] as const;

interface StockAdjustmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: EnrichedInventoryRecord | null;
    onSubmit: (data: CreateStockAdjustmentRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// STOCK ADJUSTMENT DIALOG
// ============================================================================

export function StockAdjustmentDialog({
    open,
    onOpenChange,
    item,
    onSubmit,
    isSaving,
}: StockAdjustmentDialogProps) {
    const [adjustmentType, setAdjustmentType] = useState<string>("ADJUSTMENT");
    const [newQuantity, setNewQuantity] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get unit label from the item
    const unitLabel = useMemo(() => getInventoryUnitLabel(item), [item]);

    // Reset form on open
    useEffect(() => {
        if (open) {
            setAdjustmentType("ADJUSTMENT");
            setNewQuantity(item ? String(item.quantity_on_hand) : "");
            setQuantity("");
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
            adjustment_type: adjustmentType,
            new_quantity: adjustmentType === "ADJUSTMENT" ? Number(newQuantity) : undefined,
            // Schema expects quantity for all types; ADJUSTMENT flow ignores it in service logic.
            quantity: adjustmentType !== "ADJUSTMENT" ? Number(quantity) : 0,
            reason,
            notes: notes || undefined,
        };

        const parsed = createStockAdjustmentSchema.safeParse(formData);
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
        const success = await onSubmit(parsed.data as CreateStockAdjustmentRequest);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Stock Adjustment</DialogTitle>
                    <DialogDescription>
                        {item && (
                            <>
                                Adjust stock for <strong>{item.product?.name}</strong>
                                {item.variant?.name && ` (${item.variant.name})`}
                                . Current stock: <strong>{formatQuantity(item.quantity_on_hand)} {unitLabel}</strong>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-4">
                    {/* Adjustment Type */}
                    <div className="space-y-2">
                        <Label>Adjustment Type *</Label>
                        <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ADJUSTMENT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {getTransactionTypeLabel(type)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.adjustment_type && (
                            <p className="text-sm text-red-500">{errors.adjustment_type}</p>
                        )}
                    </div>

                    {/* ADJUSTMENT: New Quantity */}
                    {adjustmentType === "ADJUSTMENT" && (
                        <div className="space-y-2">
                            <Label>New Quantity ({unitLabel}) *</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                placeholder={`Enter new quantity (${unitLabel})`}
                            />
                            {errors.new_quantity && (
                                <p className="text-sm text-red-500">{errors.new_quantity}</p>
                            )}
                        </div>
                    )}

                    {/* DAMAGE/EXPIRY: Quantity to remove */}
                    {adjustmentType !== "ADJUSTMENT" && (
                        <div className="space-y-2">
                            <Label>Quantity to Remove ({unitLabel}) *</Label>
                            <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder={`Enter quantity (${unitLabel})`}
                            />
                            {errors.quantity && (
                                <p className="text-sm text-red-500">{errors.quantity}</p>
                            )}
                        </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Physical count correction"
                        />
                        {errors.reason && (
                            <p className="text-sm text-red-500">{errors.reason}</p>
                        )}
                    </div>

                    {/* Notes */}
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
                        {isSaving ? "Adjusting..." : "Apply Adjustment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
