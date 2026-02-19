"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
    Loader2,
    Package,
    ArrowUpDown,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { useProductStore } from "@/stores/product.store";
import { stockAdjustmentSchema } from "@/validations/product.validation";
import { TRANSACTION_TYPES } from "@/types/product.types";
import type { EnrichedProduct, TransactionType } from "@/types/product.types";
import {
    formatCurrency,
    formatQuantity,
    getStockStatusLabel,
    getStockStatusColor,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    isStockIncrease,
} from "@/utils/product.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryPanelProps {
    product: EnrichedProduct;
    storeId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InventoryPanel({ product, storeId }: InventoryPanelProps) {
    const { createStockAdjustment, isSaving } = useProductStore();
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

    const inventory = product.inventory;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(stockAdjustmentSchema) as any,
        defaultValues: {
            product_id: product.id,
            transaction_type: "ADJUSTMENT" as TransactionType,
            quantity: 1,
            unit_cost: undefined as number | undefined,
            reason: "",
            reference_number: "",
            batch_number: "",
            notes: "",
            from_location: "",
            to_location: "",
        },
    });

    const watchTxnType = watch("transaction_type");

    const openAdjustDialog = () => {
        reset({
            product_id: product.id,
            transaction_type: "ADJUSTMENT",
            quantity: 1,
            unit_cost: undefined,
            reason: "",
            reference_number: "",
            batch_number: "",
            notes: "",
            from_location: "",
            to_location: "",
        });
        setAdjustDialogOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        const toastId = toast.loading("Processing stock adjustment...");

        try {
            const success = await createStockAdjustment(storeId, data);
            if (success) {
                toast.success("Stock adjustment recorded", { id: toastId });
                setAdjustDialogOpen(false);
            } else {
                toast.error("Failed to process adjustment", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const stockLabel = inventory ? getStockStatusLabel(inventory) : "No inventory";
    const stockColor = inventory ? getStockStatusColor(inventory) : "";

    // Adjustment types for the select (most common ones)
    const adjustmentTypes: TransactionType[] = [
        "ADJUSTMENT",
        "PURCHASE",
        "SALE",
        "RETURN",
        "DAMAGE",
        "EXPIRY",
        "TRANSFER_IN",
        "TRANSFER_OUT",
    ];

    const isTransfer = watchTxnType === "TRANSFER_IN" || watchTxnType === "TRANSFER_OUT";

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Inventory</h4>
                <Button size="sm" variant="outline" onClick={openAdjustDialog}>
                    <ArrowUpDown className="mr-1 h-3 w-3" />
                    Stock Adjustment
                </Button>
            </div>

            {/* Stock Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card>
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">On Hand</p>
                        <p className="text-lg font-bold">
                            {formatQuantity(inventory?.quantity_on_hand ?? 0)}
                        </p>
                        <Badge className={cn("text-[10px] mt-1", stockColor)} variant="outline">
                            {stockLabel}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="text-lg font-bold">
                            {formatQuantity(inventory?.quantity_available ?? 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {formatQuantity(inventory?.quantity_committed ?? 0)} committed
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">In Transit</p>
                        <p className="text-lg font-bold">
                            {formatQuantity(inventory?.quantity_in_transit ?? 0)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Total Value</p>
                        <p className="text-lg font-bold">
                            {formatCurrency(inventory?.total_value)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Avg: {formatCurrency(inventory?.average_cost)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Location and Settings */}
            {inventory && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-xs text-muted-foreground">Location:</span>
                        <span className="ml-2">{inventory.location || "—"}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground">Warehouse:</span>
                        <span className="ml-2">{inventory.warehouse || "—"}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground">Reorder Point:</span>
                        <span className="ml-2">{inventory.reorder_point}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground">Max Stock:</span>
                        <span className="ml-2">{inventory.maximum_stock ?? "—"}</span>
                    </div>
                </div>
            )}

            {/* Stock Adjustment Dialog */}
            <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Stock Adjustment</DialogTitle>
                        <DialogDescription>
                            Record a stock change for {product.name}.
                            Current on hand: {formatQuantity(inventory?.quantity_on_hand ?? 0)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>
                                    Transaction Type <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={watchTxnType}
                                    onValueChange={(val) =>
                                        setValue("transaction_type", val as TransactionType, { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {adjustmentTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                <span className="flex items-center gap-2">
                                                    {isStockIncrease(type) ? (
                                                        <TrendingUp className="h-3 w-3 text-green-600" />
                                                    ) : (
                                                        <TrendingDown className="h-3 w-3 text-red-600" />
                                                    )}
                                                    {getTransactionTypeLabel(type)}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adj_quantity">
                                    Quantity <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="adj_quantity"
                                    type="number"
                                    min={1}
                                    {...register("quantity", { valueAsNumber: true })}
                                />
                                {errors.quantity && (
                                    <p className="text-xs text-destructive">{String(errors.quantity.message)}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adj_unit_cost">Unit Cost (₹)</Label>
                                <Input
                                    id="adj_unit_cost"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("unit_cost", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adj_ref_number">Reference Number</Label>
                                <Input
                                    id="adj_ref_number"
                                    placeholder="Invoice / PO number"
                                    {...register("reference_number")}
                                />
                            </div>
                        </div>

                        {product.is_batch_tracked && (
                            <div className="space-y-2">
                                <Label htmlFor="adj_batch">Batch Number</Label>
                                <Input id="adj_batch" {...register("batch_number")} />
                            </div>
                        )}

                        {isTransfer && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adj_from_location">From Location</Label>
                                    <Input id="adj_from_location" {...register("from_location")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adj_to_location">To Location</Label>
                                    <Input id="adj_to_location" {...register("to_location")} />
                                    {errors.to_location && (
                                        <p className="text-xs text-destructive">{String(errors.to_location.message)}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="adj_reason">
                                Reason {watchTxnType === "ADJUSTMENT" && <span className="text-destructive">*</span>}
                            </Label>
                            <Input
                                id="adj_reason"
                                placeholder="Reason for the adjustment"
                                {...register("reason")}
                            />
                            {errors.reason && (
                                <p className="text-xs text-destructive">{String(errors.reason.message)}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adj_notes">Notes</Label>
                            <Textarea
                                id="adj_notes"
                                rows={2}
                                placeholder="Additional notes..."
                                {...register("notes")}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit(onFormSubmit)} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Adjustment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
