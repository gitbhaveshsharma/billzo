"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type {
    PurchaseOrder,
    PurchaseOrderItem,
    CreatePurchaseReturnRequest,
    CreatePurchaseReturnItemRequest,
} from "@/types/purchase.types";
import { RETURN_REASONS, type ReturnReason } from "@/types/purchase.types";
import { formatCurrency, formatQuantity, calculateItemTotals } from "@/utils/purchase.utils";
import { usePurchaseStore } from "@/stores/purchase.store";

// ============================================================================
// TYPES
// ============================================================================

interface CreateReturnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    order: PurchaseOrder | null;
    onSubmit: (data: CreatePurchaseReturnRequest) => Promise<boolean>;
    isSaving: boolean;
}

interface ReturnRow {
    item: PurchaseOrderItem;
    selected: boolean;
    return_quantity: number;
    reason: string;
}

const REASON_LABELS: Record<ReturnReason, string> = {
    damaged: "Damaged",
    expired: "Expired",
    wrong_product: "Wrong Product",
    quality_issue: "Quality Issue",
    excess_stock: "Excess Stock",
    other: "Other",
};

// ============================================================================
// CREATE RETURN DIALOG
// ============================================================================

export function CreateReturnDialog({
    open,
    onOpenChange,
    storeId,
    order,
    onSubmit,
    isSaving,
}: CreateReturnDialogProps) {
    const fetchItems = usePurchaseStore((s) => s.fetchItems);
    const [items, setItems] = useState<PurchaseOrderItem[]>([]);
    const [rows, setRows] = useState<ReturnRow[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
    const [debitNoteNumber, setDebitNoteNumber] = useState("");
    const [returnNotes, setReturnNotes] = useState("");

    // Fetch items when dialog opens
    useEffect(() => {
        if (open && order) {
            setIsLoadingItems(true);
            fetchItems(order.id, true).then((fetchedItems) => {
                setItems(fetchedItems);
                setIsLoadingItems(false);
            });
            setReturnReason("");
            setReturnDate(new Date().toISOString().split("T")[0]);
            setDebitNoteNumber("");
            setReturnNotes("");
        }
    }, [open, order, fetchItems]);

    // Initialize rows from received items
    useEffect(() => {
        const receivedItems = items.filter(
            (item) =>
                item.received_quantity > item.returned_quantity &&
                (item.item_status === "received" || item.item_status === "partially_received")
        );
        setRows(
            receivedItems.map((item) => ({
                item,
                selected: false,
                return_quantity: item.received_quantity - item.returned_quantity,
                reason: "",
            }))
        );
    }, [items]);

    // Toggle row
    const toggleRow = (index: number) => {
        setRows((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, selected: !row.selected } : row
            )
        );
    };

    // Update row
    const updateRow = (index: number, field: keyof ReturnRow, value: string | number) => {
        setRows((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        );
    };

    // Calculate return totals
    const returnTotal = useMemo(() => {
        return rows
            .filter((r) => r.selected)
            .reduce((sum, r) => {
                const calc = calculateItemTotals(
                    r.return_quantity,
                    r.item.unit_price,
                    r.item.discount_percentage,
                    r.item.gst_percentage,
                    r.item.cess_percentage,
                    order?.is_inter_state ?? false
                );
                return sum + calc.totalAmount;
            }, 0);
    }, [rows, order]);

    // Submit
    const handleSubmit = async () => {
        if (!order) return;

        const selectedRows = rows.filter((r) => r.selected);
        if (!selectedRows.length || !returnReason) return;

        const returnItems: CreatePurchaseReturnItemRequest[] = selectedRows.map((r) => ({
            purchase_order_item_id: r.item.id,
            product_id: r.item.product_id,
            variant_id: r.item.variant_id ?? undefined,
            product_name: r.item.product_name,
            product_code: r.item.product_code,
            hsn_code: r.item.hsn_code ?? undefined,
            return_quantity: r.return_quantity,
            unit_price: r.item.unit_price,
            gst_percentage: r.item.gst_percentage,
            cess_percentage: r.item.cess_percentage,
            batch_number: r.item.batch_number ?? undefined,
            reason: r.reason || undefined,
        }));

        const request: CreatePurchaseReturnRequest = {
            purchase_order_id: order.id,
            supplier_id: order.supplier_id,
            supplier_name: order.supplier_name,
            return_date: returnDate,
            reason: returnReason,
            debit_note_number: debitNoteNumber || undefined,
            notes: returnNotes || undefined,
            items: returnItems,
        };

        const success = await onSubmit(request);
        if (success) {
            onOpenChange(false);
        }
    };

    const selectedCount = rows.filter((r) => r.selected).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Undo2 className="h-5 w-5" />
                        Create Purchase Return
                    </DialogTitle>
                    <DialogDescription>
                        {order && <>Return items from {order.po_number}</>}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1" style={{ maxHeight: "calc(85vh - 200px)" }}>
                    <div className="space-y-4 pr-2">
                        {/* Return header */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Return Date *</Label>
                                <Input
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Debit Note Number</Label>
                                <Input
                                    value={debitNoteNumber}
                                    onChange={(e) => setDebitNoteNumber(e.target.value)}
                                    placeholder="DN-001"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Return Reason *</Label>
                            <Textarea
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                placeholder="Describe the reason for return..."
                                rows={2}
                            />
                        </div>

                        <Separator />

                        {/* Items */}
                        <h4 className="font-medium text-sm">Select Items to Return</h4>

                        {isLoadingItems ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">
                                Loading items...
                            </p>
                        ) : rows.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">
                                No items available for return
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {rows.map((row, index) => {
                                    const maxReturn = row.item.received_quantity - row.item.returned_quantity;
                                    return (
                                        <div
                                            key={row.item.id}
                                            className={`rounded-lg border p-3 space-y-3 transition-colors ${
                                                row.selected ? "border-primary/30 bg-primary/5" : "opacity-60"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={row.selected}
                                                    onCheckedChange={() => toggleRow(index)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm">{row.item.product_name}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {row.item.product_code} &middot; Received:{" "}
                                                        {formatQuantity(row.item.received_quantity)} &middot; Already
                                                        Returned: {formatQuantity(row.item.returned_quantity)}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-medium">
                                                    {formatCurrency(row.item.unit_price)}
                                                </p>
                                            </div>

                                            {row.selected && (
                                                <div className="grid grid-cols-2 gap-3 pl-8">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Return Qty *</Label>
                                                        <Input
                                                            type="number"
                                                            value={row.return_quantity}
                                                            onChange={(e) =>
                                                                updateRow(index, "return_quantity", Number(e.target.value))
                                                            }
                                                            min={1}
                                                            max={maxReturn}
                                                            className="h-8 text-sm"
                                                        />
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Max: {maxReturn}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Item Reason</Label>
                                                        <Select
                                                            value={row.reason}
                                                            onValueChange={(val) =>
                                                                updateRow(index, "reason", val)
                                                            }
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select reason" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {RETURN_REASONS.map((r) => (
                                                                    <SelectItem key={r} value={r}>
                                                                        {REASON_LABELS[r]}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <Separator />

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={returnNotes}
                                onChange={(e) => setReturnNotes(e.target.value)}
                                placeholder="Additional return notes..."
                                rows={2}
                            />
                        </div>

                        {/* Return total */}
                        {selectedCount > 0 && (
                            <div className="rounded-lg bg-muted/50 p-3">
                                <div className="flex justify-between font-bold text-sm">
                                    <span>Estimated Return Total</span>
                                    <span>{formatCurrency(returnTotal)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSaving || selectedCount === 0 || !returnReason}
                    >
                        {isSaving ? "Creating..." : "Create Return"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
