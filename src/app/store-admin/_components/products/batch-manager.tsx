"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Loader2,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Package,
} from "lucide-react";
import { useProductStore } from "@/stores/product.store";
import { createProductBatchSchema } from "@/validations/product.validation";
import type { ProductBatch } from "@/types/product.types";
import {
    formatCurrency,
    formatDate,
    formatQuantity,
    getExpiryStatusLabel,
    getExpiryStatusColor,
    getDaysUntilExpiry,
} from "@/utils/product.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface BatchManagerProps {
    productId: string;
    storeId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BatchManager({ productId, storeId }: BatchManagerProps) {
    const { fetchBatches, createBatch, updateBatch, deleteBatch, isSaving } =
        useProductStore();

    const [batches, setBatches] = useState<ProductBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);

    // Load batches
    useEffect(() => {
        let cancelled = false;
        const loadBatches = async () => {
            setIsLoading(true);
            const result = await fetchBatches(storeId, productId);
            if (!cancelled) {
                setBatches(result ?? []);
                setIsLoading(false);
            }
        };
        loadBatches();
        return () => {
            cancelled = true;
        };
    }, [storeId, productId, fetchBatches]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createProductBatchSchema) as any,
        defaultValues: {
            product_id: productId,
            batch_number: "",
            manufacturing_date: "",
            expiry_date: "",
            mrp: undefined as number | undefined,
            initial_quantity: 1,
            current_quantity: 1,
            purchase_date: "",
            purchase_price: undefined as number | undefined,
            supplier_id: undefined as string | undefined,
            purchase_invoice: "",
        },
    });

    const openAddDialog = () => {
        setEditingBatch(null);
        reset({
            product_id: productId,
            batch_number: "",
            manufacturing_date: "",
            expiry_date: "",
            mrp: undefined,
            initial_quantity: 1,
            current_quantity: 1,
            purchase_date: "",
            purchase_price: undefined,
            supplier_id: undefined,
            purchase_invoice: "",
        });
        setDialogOpen(true);
    };

    const openEditDialog = (batch: ProductBatch) => {
        setEditingBatch(batch);
        reset({
            product_id: productId,
            batch_number: batch.batch_number,
            manufacturing_date: batch.manufacturing_date ?? "",
            expiry_date: batch.expiry_date,
            mrp: batch.mrp ?? undefined,
            initial_quantity: batch.initial_quantity,
            current_quantity: batch.current_quantity,
            purchase_date: batch.purchase_date ?? "",
            purchase_price: batch.purchase_price ?? undefined,
            supplier_id: batch.supplier_id ?? undefined,
            purchase_invoice: batch.purchase_invoice ?? "",
        });
        setDialogOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        const toastId = toast.loading(
            editingBatch ? "Updating batch..." : "Adding batch..."
        );

        try {
            let success = false;
            if (editingBatch) {
                const { product_id: _pid, batch_number: _bn, initial_quantity: _iq, ...updateData } = data;
                success = await updateBatch(storeId, editingBatch.id, updateData, productId);
            } else {
                const result = await createBatch(storeId, data);
                success = !!result;
            }

            if (success) {
                toast.success(
                    editingBatch ? "Batch updated" : "Batch added",
                    { id: toastId }
                );
                setDialogOpen(false);
                // Refresh batches
                const updated = await fetchBatches(storeId, productId);
                setBatches(updated ?? []);
            } else {
                toast.error("Operation failed", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const handleDelete = async (batch: ProductBatch) => {
        const toastId = toast.loading("Deleting batch...");
        try {
            const success = await deleteBatch(storeId, batch.id, productId);
            if (success) {
                toast.success("Batch deleted", { id: toastId });
                setBatches((prev) => prev.filter((b) => b.id !== batch.id));
            } else {
                toast.error("Failed to delete batch", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const isEdit = !!editingBatch;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Batch & Expiry</h4>
                <Button size="sm" variant="outline" onClick={openAddDialog}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Batch
                </Button>
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Loading batches...
                </p>
            ) : batches.length === 0 ? (
                <div className="text-center py-6">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No batches recorded</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Batch #</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.map((batch) => {
                                const daysUntil = getDaysUntilExpiry(batch.expiry_date);
                                const expiryLabel = getExpiryStatusLabel(batch.expiry_date);
                                const expiryColor = getExpiryStatusColor(batch.expiry_date);

                                return (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-mono text-xs">
                                            {batch.batch_number}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div>{formatDate(batch.expiry_date)}</div>
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[10px] mt-0.5", expiryColor)}
                                            >
                                                {expiryLabel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {formatQuantity(batch.current_quantity)} /{" "}
                                            {formatQuantity(batch.initial_quantity)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {batch.purchase_price != null
                                                ? formatCurrency(batch.purchase_price)
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={batch.is_active ? "default" : "secondary"}>
                                                {batch.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(batch)}
                                                    >
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Edit Batch" : "Add Batch"}</DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Update the batch details below."
                                : "Enter the details for the new batch."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="batch_number">
                                    Batch Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="batch_number"
                                    {...register("batch_number")}
                                    disabled={isEdit}
                                />
                                {errors.batch_number && (
                                    <p className="text-xs text-destructive">
                                        {String(errors.batch_number.message)}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expiry_date">
                                    Expiry Date <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="expiry_date"
                                    type="date"
                                    {...register("expiry_date")}
                                />
                                {errors.expiry_date && (
                                    <p className="text-xs text-destructive">
                                        {String(errors.expiry_date.message)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
                                <Input
                                    id="manufacturing_date"
                                    type="date"
                                    {...register("manufacturing_date")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="batch_mrp">MRP (₹)</Label>
                                <Input
                                    id="batch_mrp"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("mrp", { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="initial_quantity">
                                    Initial Qty <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="initial_quantity"
                                    type="number"
                                    min={1}
                                    {...register("initial_quantity", { valueAsNumber: true })}
                                    disabled={isEdit}
                                />
                                {errors.initial_quantity && (
                                    <p className="text-xs text-destructive">
                                        {String(errors.initial_quantity.message)}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="current_quantity">
                                    Current Qty <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="current_quantity"
                                    type="number"
                                    min={0}
                                    {...register("current_quantity", { valueAsNumber: true })}
                                />
                                {errors.current_quantity && (
                                    <p className="text-xs text-destructive">
                                        {String(errors.current_quantity.message)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="purchase_price">Purchase Price (₹)</Label>
                                <Input
                                    id="purchase_price"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("purchase_price", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="purchase_date">Purchase Date</Label>
                                <Input
                                    id="purchase_date"
                                    type="date"
                                    {...register("purchase_date")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchase_invoice">Purchase Invoice</Label>
                            <Input
                                id="purchase_invoice"
                                placeholder="Invoice reference"
                                {...register("purchase_invoice")}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit(onFormSubmit)} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? "Update Batch" : "Add Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
