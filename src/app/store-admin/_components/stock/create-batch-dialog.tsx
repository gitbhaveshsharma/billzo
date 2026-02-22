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
import { createProductBatchSchema } from "@/validations/inventory.validation";
import type { CreateProductBatchRequest } from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface CreateBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    onSubmit: (data: CreateProductBatchRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// CREATE BATCH DIALOG
// ============================================================================

export function CreateBatchDialog({
    open,
    onOpenChange,
    storeId,
    onSubmit,
    isSaving,
}: CreateBatchDialogProps) {
    const [productId, setProductId] = useState("");
    const [batchNumber, setBatchNumber] = useState("");
    const [initialQty, setInitialQty] = useState<string>("");
    const [currentQty, setCurrentQty] = useState<string>("");
    const [costPrice, setCostPrice] = useState<string>("");
    const [sellingPrice, setSellingPrice] = useState<string>("");
    const [manufacturingDate, setManufacturingDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setProductId("");
            setBatchNumber("");
            setInitialQty("");
            setCurrentQty("");
            setCostPrice("");
            setSellingPrice("");
            setManufacturingDate("");
            setExpiryDate("");
            setNotes("");
            setErrors({});
        }
    }, [open]);

    const handleSubmit = async () => {
        const formData = {
            product_id: productId,
            batch_number: batchNumber,
            initial_quantity: Number(initialQty),
            current_quantity: currentQty ? Number(currentQty) : Number(initialQty),
            cost_price: costPrice ? Number(costPrice) : undefined,
            selling_price: sellingPrice ? Number(sellingPrice) : undefined,
            manufacturing_date: manufacturingDate || undefined,
            expiry_date: expiryDate || undefined,
            notes: notes || undefined,
        };

        const parsed = createProductBatchSchema.safeParse(formData);
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
        const success = await onSubmit(parsed.data as CreateProductBatchRequest);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Product Batch</DialogTitle>
                    <DialogDescription>
                        Add a new batch for tracking lot numbers and expiry dates.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                    <div className="space-y-2">
                        <Label>Product ID *</Label>
                        <Input
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            placeholder="Product UUID"
                        />
                        {errors.product_id && (
                            <p className="text-sm text-red-500">{errors.product_id}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Batch Number *</Label>
                        <Input
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            placeholder="e.g., BATCH-001"
                        />
                        {errors.batch_number && (
                            <p className="text-sm text-red-500">{errors.batch_number}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Initial Quantity *</Label>
                            <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={initialQty}
                                onChange={(e) => setInitialQty(e.target.value)}
                            />
                            {errors.initial_quantity && (
                                <p className="text-sm text-red-500">{errors.initial_quantity}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Current Quantity</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={currentQty}
                                onChange={(e) => setCurrentQty(e.target.value)}
                                placeholder="Same as initial if empty"
                            />
                            {errors.current_quantity && (
                                <p className="text-sm text-red-500">{errors.current_quantity}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Cost Price</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={costPrice}
                                onChange={(e) => setCostPrice(e.target.value)}
                                placeholder="₹"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Selling Price</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                placeholder="₹"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Manufacturing Date</Label>
                            <Input
                                type="date"
                                value={manufacturingDate}
                                onChange={(e) => setManufacturingDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Expiry Date</Label>
                            <Input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                            />
                            {errors.expiry_date && (
                                <p className="text-sm text-red-500">{errors.expiry_date}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes"
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
                        {isSaving ? "Creating..." : "Create Batch"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
