"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { stockCountSchema } from "@/validations/inventory.validation";
import { getInventoryUnitLabel } from "@/utils/inventory.utils";
import type { StockCountItem, EnrichedInventoryRecord } from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface StockCountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventoryItems: EnrichedInventoryRecord[];
    onSubmit: (items: StockCountItem[], notes: string) => Promise<boolean>;
    isSaving: boolean;
}

interface CountEntry {
    inventory_id: string;
    product_id: string;
    variant_id?: string;
    counted_quantity: string;
    notes: string;
    productName: string;
    currentQuantity: number;
    unitLabel: string;
}

// ============================================================================
// STOCK COUNT DIALOG
// ============================================================================

export function StockCountDialog({
    open,
    onOpenChange,
    inventoryItems,
    onSubmit,
    isSaving,
}: StockCountDialogProps) {
    const [entries, setEntries] = useState<CountEntry[]>([]);
    const [generalNotes, setGeneralNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            // Pre-fill with a single empty entry
            setEntries([createEmptyEntry()]);
            setGeneralNotes("");
            setErrors({});
        }
    }, [open]);

    function createEmptyEntry(): CountEntry {
        return {
            inventory_id: "",
            product_id: "",
            variant_id: undefined,
            counted_quantity: "",
            notes: "",
            productName: "",
            currentQuantity: 0,
            unitLabel: "units",
        };
    }

    const handleSelectProduct = (index: number, inventoryId: string) => {
        const item = inventoryItems.find((i) => i.id === inventoryId);
        if (!item) return;

        setEntries((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                inventory_id: item.id,
                product_id: item.product_id,
                variant_id: item.variant_id ?? undefined,
                productName: item.product?.name ?? "Unknown Product",
                currentQuantity: item.quantity_on_hand,
                unitLabel: getInventoryUnitLabel(item),
            };
            return updated;
        });
    };

    const handleQuantityChange = (index: number, value: string) => {
        setEntries((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], counted_quantity: value };
            return updated;
        });
    };

    const handleEntryNotesChange = (index: number, value: string) => {
        setEntries((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], notes: value };
            return updated;
        });
    };

    const addEntry = () => {
        setEntries((prev) => [...prev, createEmptyEntry()]);
    };

    const removeEntry = (index: number) => {
        if (entries.length <= 1) return;
        setEntries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const items: StockCountItem[] = entries
            .filter((e) => e.inventory_id && e.counted_quantity)
            .map((e) => ({
                inventory_id: e.inventory_id,
                product_id: e.product_id,
                variant_id: e.variant_id,
                counted_quantity: Number(e.counted_quantity),
                notes: e.notes || undefined,
            }));

        const formData = {
            items,
            notes: generalNotes || undefined,
        };

        const parsed = stockCountSchema.safeParse(formData);
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
        const success = await onSubmit(items, generalNotes);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Physical Stock Count</DialogTitle>
                    <DialogDescription>
                        Record physical counts for inventory reconciliation. Discrepancies
                        will generate adjustment transactions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                    {entries.map((entry, index) => (
                        <div key={index} className="space-y-3 p-3 border rounded-md relative">
                            {entries.length > 1 && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2 h-7 w-7"
                                    onClick={() => removeEntry(index)}
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Product *</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={entry.inventory_id}
                                        onChange={(e) =>
                                            handleSelectProduct(index, e.target.value)
                                        }
                                    >
                                        <option value="">Select product...</option>
                                        {inventoryItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.product?.name ?? item.product_id} (On hand:{" "}
                                                {item.quantity_on_hand} {getInventoryUnitLabel(item)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Counted Quantity ({entry.unitLabel}) *</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={entry.counted_quantity}
                                        onChange={(e) =>
                                            handleQuantityChange(index, e.target.value)
                                        }
                                        placeholder={`Physical count (${entry.unitLabel})`}
                                    />
                                    {entry.inventory_id && entry.counted_quantity && (
                                        <p className="text-xs text-muted-foreground">
                                            System: {entry.currentQuantity} {entry.unitLabel} | Diff:{" "}
                                            <span
                                                className={
                                                    Number(entry.counted_quantity) -
                                                        entry.currentQuantity !==
                                                    0
                                                        ? "text-orange-600 font-medium"
                                                        : "text-green-600"
                                                }
                                            >
                                                {Number(entry.counted_quantity) -
                                                    entry.currentQuantity >
                                                0
                                                    ? "+"
                                                    : ""}
                                                {(
                                                    Number(entry.counted_quantity) -
                                                    entry.currentQuantity
                                                ).toFixed(2)} {entry.unitLabel}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input
                                    value={entry.notes}
                                    onChange={(e) =>
                                        handleEntryNotesChange(index, e.target.value)
                                    }
                                    placeholder="Count notes (optional)"
                                />
                            </div>
                        </div>
                    ))}

                    {errors.items && (
                        <p className="text-sm text-red-500">{errors.items}</p>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEntry}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Another Item
                    </Button>

                    <Separator />

                    <div className="space-y-2">
                        <Label>General Notes</Label>
                        <Textarea
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            placeholder="Overall stock count notes"
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
                        {isSaving ? "Submitting..." : "Submit Count"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
