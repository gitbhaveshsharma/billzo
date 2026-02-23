"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { updateInventoryRecordSchema } from "@/validations/inventory.validation";
import type { UpdateInventoryRecordRequest, EnrichedInventoryRecord } from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface EditInventoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: EnrichedInventoryRecord | null;
    onSubmit: (inventoryId: string, data: UpdateInventoryRecordRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// EDIT INVENTORY DIALOG
// ============================================================================

export function EditInventoryDialog({
    open,
    onOpenChange,
    item,
    onSubmit,
    isSaving,
}: EditInventoryDialogProps) {
    const [reorderPoint, setReorderPoint] = useState<string>("");
    const [maximumStock, setMaximumStock] = useState<string>("");
    const [location, setLocation] = useState("");
    const [warehouse, setWarehouse] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open && item) {
            setReorderPoint(String(item.reorder_point ?? ""));
            setMaximumStock(String(item.maximum_stock ?? ""));
            setLocation(item.location ?? "");
            setWarehouse(item.warehouse ?? "");
            setErrors({});
        }
    }, [open, item]);

    const handleSubmit = async () => {
        if (!item) return;

        const formData = {
            reorder_point: reorderPoint ? Number(reorderPoint) : undefined,
            maximum_stock: maximumStock ? Number(maximumStock) : undefined,
            location: location || undefined,
            warehouse: warehouse || undefined,
        };

        const parsed = updateInventoryRecordSchema.safeParse(formData);
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
        const success = await onSubmit(item.id, parsed.data as UpdateInventoryRecordRequest);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Inventory Settings</DialogTitle>
                    <DialogDescription>
                        {item && (
                            <>
                                Update settings for <strong>{item.product?.name}</strong>
                                {item.variant?.name && ` (${item.variant.name})`}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Reorder Point</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                value={reorderPoint}
                                onChange={(e) => setReorderPoint(e.target.value)}
                                placeholder="e.g., 10"
                            />
                            {errors.reorder_point && (
                                <p className="text-sm text-red-500">{errors.reorder_point}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Maximum Stock</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                value={maximumStock}
                                onChange={(e) => setMaximumStock(e.target.value)}
                                placeholder="e.g., 100"
                            />
                            {errors.maximum_stock && (
                                <p className="text-sm text-red-500">{errors.maximum_stock}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Warehouse</Label>
                        <Input
                            value={warehouse}
                            onChange={(e) => setWarehouse(e.target.value)}
                            placeholder="e.g., Main Warehouse"
                        />
                        {errors.warehouse && (
                            <p className="text-sm text-red-500">{errors.warehouse}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g., Aisle 3, Shelf B"
                        />
                        {errors.location && (
                            <p className="text-sm text-red-500">{errors.location}</p>
                        )}
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
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
