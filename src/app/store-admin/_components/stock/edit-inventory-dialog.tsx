"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { updateInventoryRecordSchema } from "@/validations/inventory.validation";
import { getInventoryUnitLabel } from "@/utils/inventory.utils";
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
// HELPER COMPONENTS
// ============================================================================

interface FieldWithTooltipProps {
    label: string;
    tooltip: string;
    children: React.ReactNode;
    error?: string;
}

function FieldWithTooltip({ label, tooltip, children, error }: FieldWithTooltipProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Label>{label}</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {children}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
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

    // Get the unit label from the item's unit data
    const unitLabel = useMemo(() => getInventoryUnitLabel(item), [item]);

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

    // Tooltip content explaining each field in POS context
    const tooltips = {
        reorderPoint: "When stock falls below this number, the system will automatically suggest a reorder. Essential for preventing out-of-stock situations during peak sales hours.",
        maximumStock: "The maximum quantity you can store. Helps prevent overstocking and ensures you don't tie up capital in excess inventory. Consider your shelf space and sales velocity.",
        warehouse: "The physical storage location (e.g., 'Main Store', 'Backroom', 'Warehouse A'). Important for multi-location businesses and transfer management.",
        location: "Specific bin or shelf location (e.g., 'Aisle 3, Shelf B2'). Speeds up picking process when fulfilling orders or restocking the sales floor.",
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
                        <FieldWithTooltip
                            label={`Reorder Point (${unitLabel})`}
                            tooltip={tooltips.reorderPoint}
                            error={errors.reorder_point}
                        >
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                value={reorderPoint}
                                onChange={(e) => setReorderPoint(e.target.value)}
                                placeholder={`e.g., 10 ${unitLabel}`}
                            />
                        </FieldWithTooltip>

                        <FieldWithTooltip
                            label={`Maximum Stock (${unitLabel})`}
                            tooltip={tooltips.maximumStock}
                            error={errors.maximum_stock}
                        >
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                value={maximumStock}
                                onChange={(e) => setMaximumStock(e.target.value)}
                                placeholder={`e.g., 100 ${unitLabel}`}
                            />
                        </FieldWithTooltip>
                    </div>

                    <FieldWithTooltip
                        label="Warehouse"
                        tooltip={tooltips.warehouse}
                        error={errors.warehouse}
                    >
                        <Input
                            value={warehouse}
                            onChange={(e) => setWarehouse(e.target.value)}
                            placeholder="e.g., Main Warehouse"
                        />
                    </FieldWithTooltip>

                    <FieldWithTooltip
                        label="Location"
                        tooltip={tooltips.location}
                        error={errors.location}
                    >
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g., Aisle 3, Shelf B"
                        />
                    </FieldWithTooltip>

                    {/* POS-specific summary section */}
                    {(reorderPoint || maximumStock || warehouse || location) && (
                        <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                            <p className="font-medium mb-1">📋 POS Inventory Summary</p>
                            <ul className="space-y-1 text-muted-foreground">
                                {reorderPoint && (
                                    <li>• Auto-reorder when stock reaches {reorderPoint} {unitLabel}</li>
                                )}
                                {maximumStock && (
                                    <li>• Maximum storage capacity: {maximumStock} {unitLabel}</li>
                                )}
                                {warehouse && (
                                    <li>• Storage facility: {warehouse}</li>
                                )}
                                {location && (
                                    <li>• Exact location: {location}</li>
                                )}
                            </ul>
                        </div>
                    )}
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