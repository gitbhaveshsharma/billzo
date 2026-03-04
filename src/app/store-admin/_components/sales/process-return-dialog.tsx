"use client";

import { useState, useMemo, useCallback } from "react";
import {
    RotateCcw,
    Package,
    Check,
    Minus,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    EnrichedSale,
    SaleItem,
    PaymentMethod,
    CreateSaleReturnItemRequest,
    RestockCondition,
} from "@/types/sales.types";
import {
    PAYMENT_METHODS,
    RESTOCK_CONDITIONS,
} from "@/types/sales.types";
import {
    formatCurrency,
    getPaymentMethodLabel,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProcessReturnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sale: EnrichedSale | null;
    onConfirm: (data: {
        sale_id: string;
        return_reason: string;
        return_notes?: string;
        refund_method?: PaymentMethod;
        refund_tax?: boolean;
        items: CreateSaleReturnItemRequest[];
    }) => void;
    isProcessing?: boolean;
}

interface ReturnItemState {
    selected: boolean;
    return_quantity: number;
    max_quantity: number;
    item_return_reason: string;
    restock: boolean;
    restock_condition: RestockCondition;
    saleItem: SaleItem;
}

// ============================================================================
// RETURN ITEM ROW
// ============================================================================

function ReturnItemRow({
    state,
    onChange,
}: {
    state: ReturnItemState;
    onChange: (updates: Partial<ReturnItemState>) => void;
}) {
    return (
        <div className={`border rounded-md p-3 space-y-2 ${state.selected ? "border-primary bg-primary/5" : "opacity-60"}`}>
            <div className="flex items-start gap-2">
                <Checkbox
                    checked={state.selected}
                    onCheckedChange={(checked) =>
                        onChange({ selected: Boolean(checked) })
                    }
                    className="mt-1"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {state.saleItem.product_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {state.saleItem.product_code} · {formatCurrency(state.saleItem.unit_price)} each
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Sold: {state.saleItem.quantity} · Already returned: {state.saleItem.returned_quantity}
                        · Returnable: {state.max_quantity}
                    </p>
                </div>
            </div>

            {state.selected && (
                <div className="pl-6 space-y-2">
                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs w-16">Qty</Label>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                    onChange({
                                        return_quantity: Math.max(1, state.return_quantity - 1),
                                    })
                                }
                                disabled={state.return_quantity <= 1}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                                type="number"
                                min={1}
                                max={state.max_quantity}
                                value={state.return_quantity}
                                onChange={(e) => {
                                    const val = Math.min(
                                        Math.max(1, Number(e.target.value) || 1),
                                        state.max_quantity
                                    );
                                    onChange({ return_quantity: val });
                                }}
                                className="w-16 h-6 text-xs text-center"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                    onChange({
                                        return_quantity: Math.min(
                                            state.max_quantity,
                                            state.return_quantity + 1
                                        ),
                                    })
                                }
                                disabled={state.return_quantity >= state.max_quantity}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            = {formatCurrency(state.return_quantity * state.saleItem.unit_price)}
                        </span>
                    </div>

                    {/* Reason */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs w-16">Reason</Label>
                        <Input
                            value={state.item_return_reason}
                            onChange={(e) =>
                                onChange({ item_return_reason: e.target.value })
                            }
                            placeholder="Item reason (optional)"
                            className="h-7 text-xs"
                        />
                    </div>

                    {/* Restock */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs w-16">Restock</Label>
                        <Switch
                            checked={state.restock}
                            onCheckedChange={(checked) =>
                                onChange({ restock: checked })
                            }
                        />
                        {state.restock && (
                            <Select
                                value={state.restock_condition}
                                onValueChange={(v) =>
                                    onChange({ restock_condition: v as RestockCondition })
                                }
                            >
                                <SelectTrigger className="w-[100px] h-7 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RESTOCK_CONDITIONS.map((c) => (
                                        <SelectItem key={c} value={c} className="text-xs">
                                            {c.charAt(0).toUpperCase() + c.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PROCESS RETURN DIALOG
// ============================================================================

export function ProcessReturnDialog({
    open,
    onOpenChange,
    sale,
    onConfirm,
    isProcessing = false,
}: ProcessReturnDialogProps) {
    const [returnReason, setReturnReason] = useState("");
    const [returnNotes, setReturnNotes] = useState("");
    const [refundMethod, setRefundMethod] = useState<PaymentMethod | "">("CASH");
    const [refundTax, setRefundTax] = useState(false);
    const [itemStates, setItemStates] = useState<Map<string, ReturnItemState>>(
        new Map()
    );

    // Initialize item states when sale changes
    const initializeItems = useCallback(() => {
        if (!sale?.items) return;
        const states = new Map<string, ReturnItemState>();
        sale.items.forEach((item) => {
            const maxQty = item.quantity - item.returned_quantity;
            if (maxQty > 0 && !item.is_void) {
                states.set(item.id, {
                    selected: false,
                    return_quantity: 1,
                    max_quantity: maxQty,
                    item_return_reason: "",
                    restock: true,
                    restock_condition: "good",
                    saleItem: item,
                });
            }
        });
        setItemStates(states);
        setReturnReason("");
        setReturnNotes("");
        setRefundMethod("CASH");
    }, [sale]);

    // Reset on open
    useState(() => {
        if (open) initializeItems();
    });

    // Re-init when sale changes
    useMemo(() => {
        if (open && sale) initializeItems();
        if (open) setRefundTax(false);
    }, [open, sale, initializeItems]);

    // Update a single item
    const updateItem = useCallback(
        (itemId: string, updates: Partial<ReturnItemState>) => {
            setItemStates((prev) => {
                const next = new Map(prev);
                const current = next.get(itemId);
                if (current) {
                    next.set(itemId, { ...current, ...updates });
                }
                return next;
            });
        },
        []
    );

    // Selected items
    const selectedItems = useMemo(
        () => Array.from(itemStates.values()).filter((s) => s.selected),
        [itemStates]
    );

    // Total base return amount (no tax)
    const totalBaseAmount = useMemo(
        () =>
            selectedItems.reduce(
                (sum, s) => sum + s.return_quantity * s.saleItem.unit_price,
                0
            ),
        [selectedItems]
    );

    // Total GST to refund (pro-rated by return_quantity)
    const totalGstAmount = useMemo(
        () =>
            selectedItems.reduce((sum, s) => {
                const item = s.saleItem;
                const perUnitTax =
                    item.quantity > 0 ? item.tax_amount / item.quantity : 0;
                return sum + perUnitTax * s.return_quantity;
            }, 0),
        [selectedItems]
    );

    // Total refund amount shown to cashier
    const totalReturnAmount = refundTax
        ? totalBaseAmount + totalGstAmount
        : totalBaseAmount;

    // Handle confirm
    const handleConfirm = useCallback(() => {
        if (!sale) return;
        if (selectedItems.length === 0) return;
        if (!returnReason.trim()) return;

        const items: CreateSaleReturnItemRequest[] = selectedItems.map((s) => ({
            sale_item_id: s.saleItem.id,
            product_id: s.saleItem.product_id,
            variant_id: s.saleItem.variant_id ?? undefined,
            batch_id: s.saleItem.batch_id ?? undefined,
            product_name: s.saleItem.product_name,
            product_code: s.saleItem.product_code,
            unit_price: s.saleItem.unit_price,
            unit_cost: s.saleItem.unit_cost ?? undefined,
            return_quantity: s.return_quantity,
            item_return_reason: s.item_return_reason || undefined,
            restock: s.restock,
            restock_condition: s.restock_condition,
        }));

        onConfirm({
            sale_id: sale.id,
            return_reason: returnReason.trim(),
            return_notes: returnNotes.trim() || undefined,
            refund_method: refundMethod || undefined,
            refund_tax: refundTax,
            items,
        });
    }, [sale, selectedItems, returnReason, returnNotes, refundMethod, refundTax, onConfirm]);

    const returnableItems = useMemo(
        () => Array.from(itemStates.entries()),
        [itemStates]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[95vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5" />
                        Process Return
                    </DialogTitle>
                    <DialogDescription>
                        {sale
                            ? `Invoice: ${sale.invoice_number} · Total: ${formatCurrency(sale.total_amount)}`
                            : "Loading..."}
                    </DialogDescription>
                </DialogHeader>

                    <ScrollArea className="max-h-[95vh] overflow-y-auto">
                    <div className="space-y-4 p-4">
                        {/* Return reason */}
                        <div className="space-y-1">
                            <Label className="text-sm">Return Reason *</Label>
                            <Textarea
                                rows={2}
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                placeholder="Why is this being returned?"
                            />
                        </div>

                        {/* Refund method */}
                        <div className="space-y-1">
                            <Label className="text-sm">Refund Method</Label>
                            <Select
                                value={refundMethod}
                                onValueChange={(v) =>
                                    setRefundMethod(v as PaymentMethod)
                                }
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select refund method" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((m) => (
                                        <SelectItem key={m} value={m} className="text-xs">
                                            {getPaymentMethodLabel(m)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        {/* Items to return */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    Select Items to Return
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {selectedItems.length} selected
                                </span>
                            </div>

                            {returnableItems.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground">
                                    <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                    No returnable items
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {returnableItems.map(([itemId, state]) => (
                                        <ReturnItemRow
                                            key={itemId}
                                            state={state}
                                            onChange={(updates) =>
                                                updateItem(itemId, updates)
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Return notes */}
                        <div className="space-y-1">
                            <Label className="text-sm">Notes (optional)</Label>
                            <Textarea
                                rows={2}
                                value={returnNotes}
                                onChange={(e) => setReturnNotes(e.target.value)}
                                placeholder="Any additional notes..."
                            />
                        </div>

                        {/* Refund GST Toggle */}
                        <div className="flex flex-col gap-1.5 py-1">
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="refund-gst-switch"
                                    checked={refundTax}
                                    onCheckedChange={setRefundTax}
                                />
                                <Label
                                    htmlFor="refund-gst-switch"
                                    className="text-sm font-medium cursor-pointer"
                                >
                                    Refund GST (SGST + CGST)
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground ml-[52px]">
                                Turn on to include GST in the refund amount.
                            </p>
                        </div>

                        {/* Summary */}
                        {selectedItems.length > 0 && (
                            <div className="bg-muted/50 rounded-md p-3 space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Items to Return
                                    </span>
                                    <span className="font-medium">{selectedItems.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Total Quantity
                                    </span>
                                    <span className="font-medium">
                                        {selectedItems.reduce(
                                            (sum, s) => sum + s.return_quantity,
                                            0
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Base Amount</span>
                                    <span>{formatCurrency(totalBaseAmount)}</span>
                                </div>
                                {refundTax && totalGstAmount > 0 && (
                                    <div className="flex justify-between text-green-700 dark:text-green-400">
                                        <span>GST Refund (CGST + SGST)</span>
                                        <span>+{formatCurrency(totalGstAmount)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold text-sm">
                                    <span>Refund Amount</span>
                                    <span>{formatCurrency(totalReturnAmount)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={
                            isProcessing ||
                            selectedItems.length === 0 ||
                            !returnReason.trim()
                        }
                        className="gap-1"
                    >
                        {isProcessing ? (
                            "Processing..."
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                Process Return
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
