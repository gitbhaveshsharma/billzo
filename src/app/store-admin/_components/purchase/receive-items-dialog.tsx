"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import type { PurchaseOrderItem, ReceiveItemRequest } from "@/types/purchase.types";
import { formatQuantity, getPOItemStatusLabel, getPOItemStatusColor } from "@/utils/purchase.utils";
import { usePurchaseStore } from "@/stores/purchase.store";

// ============================================================================
// TYPES
// ============================================================================

interface ReceiveItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    orderId: string | null;
    onSubmit: (poId: string, items: ReceiveItemRequest[]) => Promise<boolean>;
    isSaving: boolean;
}

interface ReceiveRow {
    item: PurchaseOrderItem;
    selected: boolean;
    received_quantity: number;
    batch_number: string;
    manufacturing_date: string;
    expiry_date: string;
    notes: string;
}

// ============================================================================
// RECEIVE ITEMS DIALOG
// ============================================================================

export function ReceiveItemsDialog({
    open,
    onOpenChange,
    storeId,
    orderId,
    onSubmit,
    isSaving,
}: ReceiveItemsDialogProps) {
    const fetchItems = usePurchaseStore((s) => s.fetchItems);
    const [items, setItems] = useState<PurchaseOrderItem[]>([]);
    const [rows, setRows] = useState<ReceiveRow[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // Fetch items when dialog opens
    useEffect(() => {
        if (open && orderId) {
            setIsLoadingItems(true);
            fetchItems(orderId, true).then((fetchedItems) => {
                setItems(fetchedItems);
                setIsLoadingItems(false);
            });
        }
    }, [open, orderId, fetchItems]);

    // Initialize rows from pending items
    useEffect(() => {
        const pendingItems = items.filter(
            (item) => item.pending_quantity > 0 && item.item_status !== "cancelled"
        );
        setRows(
            pendingItems.map((item) => ({
                item,
                selected: true,
                received_quantity: item.pending_quantity,
                batch_number: item.batch_number ?? "",
                manufacturing_date: "",
                expiry_date: "",
                notes: "",
            }))
        );
    }, [items]);

    // Toggle row selection
    const toggleRow = (index: number) => {
        setRows((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, selected: !row.selected } : row
            )
        );
    };

    // Update row field
    const updateRow = (index: number, field: keyof ReceiveRow, value: string | number) => {
        setRows((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        );
    };

    // Validate and submit
    const handleSubmit = async () => {
        if (!orderId) return;

        const selectedRows = rows.filter((r) => r.selected);
        if (!selectedRows.length) return;

        // Validate quantities
        const invalid = selectedRows.find(
            (r) => r.received_quantity <= 0 || r.received_quantity > r.item.pending_quantity
        );
        if (invalid) return;

        const receiveItems: ReceiveItemRequest[] = selectedRows.map((r) => ({
            item_id: r.item.id,
            received_quantity: r.received_quantity,
            batch_number: r.batch_number || undefined,
            manufacturing_date: r.manufacturing_date || undefined,
            expiry_date: r.expiry_date || undefined,
            notes: r.notes || undefined,
        }));

        const success = await onSubmit(orderId, receiveItems);
        if (success) {
            onOpenChange(false);
        }
    };

    const selectedCount = rows.filter((r) => r.selected).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5" />
                        Receive Items
                    </DialogTitle>
                    <DialogDescription>
                        Select items and enter received quantities. Partial receiving is supported.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 overflow-x-hidden">
                    {isLoadingItems ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-muted-foreground text-sm">Loading items...</p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-muted-foreground text-sm">No pending items to receive</p>
                        </div>
                    ) : (
                        <div className="space-y-3 pr-2 p-4">
                            {rows.map((row, index) => (
                                <div
                                    key={row.item.id}
                                    className={`rounded-lg border p-3 space-y-3 transition-colors ${
                                        row.selected ? "border-primary/30 bg-primary/5" : "opacity-50"
                                    }`}
                                >
                                    {/* Item header */}
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={row.selected}
                                            onCheckedChange={() => toggleRow(index)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{row.item.product_name}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {row.item.product_code}
                                                {row.item.hsn_code ? ` | HSN: ${row.item.hsn_code}` : ""}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Badge
                                                variant="secondary"
                                                className={`text-xs ${getPOItemStatusColor(row.item.item_status)}`}
                                            >
                                                {getPOItemStatusLabel(row.item.item_status)}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Pending: {formatQuantity(row.item.pending_quantity, row.item.unit_code)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Receive fields */}
                                    {row.selected && (
                                        <div className="grid grid-cols-2 gap-3 pl-8">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Received Qty *</Label>
                                                <Input
                                                    type="number"
                                                    value={row.received_quantity}
                                                    onChange={(e) =>
                                                        updateRow(index, "received_quantity", Number(e.target.value))
                                                    }
                                                    min={1}
                                                    max={row.item.pending_quantity}
                                                    className="h-8 text-sm"
                                                />
                                                {row.received_quantity > row.item.pending_quantity && (
                                                    <p className="text-red-500 text-[10px]">
                                                        Cannot exceed pending: {row.item.pending_quantity}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Batch Number</Label>
                                                <Input
                                                    value={row.batch_number}
                                                    onChange={(e) =>
                                                        updateRow(index, "batch_number", e.target.value)
                                                    }
                                                    placeholder="Batch no."
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Mfg Date</Label>
                                                <Input
                                                    type="date"
                                                    value={row.manufacturing_date}
                                                    onChange={(e) =>
                                                        updateRow(index, "manufacturing_date", e.target.value)
                                                    }
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Expiry Date</Label>
                                                <Input
                                                    type="date"
                                                    value={row.expiry_date}
                                                    onChange={(e) =>
                                                        updateRow(index, "expiry_date", e.target.value)
                                                    }
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSaving || selectedCount === 0}
                    >
                        {isSaving
                            ? "Receiving..."
                            : `Receive ${selectedCount} Item${selectedCount !== 1 ? "s" : ""}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
