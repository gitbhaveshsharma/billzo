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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useProductStore } from "@/stores/product.store";
import { createProductBarcodeSchema } from "@/validations/product.validation";
import { BARCODE_TYPES, PRICE_TYPES } from "@/types/product.types";
import type {
    EnrichedProduct,
    ProductBarcode,
    BarcodeType,
    PriceType,
} from "@/types/product.types";
import { getBarcodeTypeLabel, getPriceTypeLabel } from "@/utils/product.utils";

// ============================================================================
// TYPES
// ============================================================================

interface BarcodeManagerProps {
    product: EnrichedProduct;
    storeId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BarcodeManager({ product, storeId }: BarcodeManagerProps) {
    const {
        fetchBarcodes,
        createBarcode,
        updateBarcode,
        deleteBarcode,
        isSaving,
    } = useProductStore();

    const [barcodes, setBarcodes] = useState<ProductBarcode[]>(product.barcodes ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editingBarcode, setEditingBarcode] = useState<ProductBarcode | null>(null);

    // Load barcodes
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            const data = await fetchBarcodes(product.id);
            if (mounted) {
                setBarcodes(data);
                setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [product.id, fetchBarcodes]);

    useEffect(() => {
        if (product.barcodes) {
            setBarcodes(product.barcodes);
        }
    }, [product.barcodes]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createProductBarcodeSchema) as any,
        defaultValues: {
            product_id: product.id,
            barcode: "",
            barcode_type: "EAN13" as BarcodeType,
            price_type: "selling" as PriceType,
            is_primary: false,
        },
    });

    const watchBarcodeType = watch("barcode_type");
    const watchPriceType = watch("price_type");
    const watchIsPrimary = watch("is_primary");

    const openAddDialog = () => {
        reset({
            product_id: product.id,
            barcode: "",
            barcode_type: "EAN13",
            price_type: "selling",
            is_primary: false,
        });
        setEditingBarcode(null);
        setAddDialogOpen(true);
    };

    const openEditDialog = (bc: ProductBarcode) => {
        setEditingBarcode(bc);
        reset({
            product_id: product.id,
            barcode: bc.barcode,
            barcode_type: bc.barcode_type,
            price_type: bc.price_type,
            is_primary: bc.is_primary,
        });
        setAddDialogOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        const toastId = toast.loading(editingBarcode ? "Updating barcode..." : "Creating barcode...");

        try {
            if (editingBarcode) {
                const { product_id, ...updateData } = data;
                const success = await updateBarcode(storeId, editingBarcode.id, updateData, product.id);
                if (success) {
                    toast.success("Barcode updated", { id: toastId });
                    setAddDialogOpen(false);
                    const refreshed = await fetchBarcodes(product.id, true);
                    setBarcodes(refreshed);
                } else {
                    toast.error("Failed to update barcode", { id: toastId });
                }
            } else {
                const result = await createBarcode(storeId, data);
                if (result) {
                    toast.success("Barcode created", { id: toastId });
                    setAddDialogOpen(false);
                    const refreshed = await fetchBarcodes(product.id, true);
                    setBarcodes(refreshed);
                } else {
                    toast.error("Failed to create barcode", { id: toastId });
                }
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const handleDelete = async (bc: ProductBarcode) => {
        const toastId = toast.loading("Deleting barcode...");
        const success = await deleteBarcode(storeId, bc.id, product.id);
        if (success) {
            toast.success("Barcode deleted", { id: toastId });
            setBarcodes((prev) => prev.filter((b) => b.id !== bc.id));
        } else {
            toast.error("Failed to delete barcode", { id: toastId });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                    Barcodes
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                        {barcodes.length}
                    </Badge>
                </h4>
                <Button size="sm" variant="outline" onClick={openAddDialog}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Barcode
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : barcodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No additional barcodes. Add barcodes for different packaging or pricing.
                </p>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Barcode</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Price Type</TableHead>
                                <TableHead>Primary</TableHead>
                                <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {barcodes.map((bc) => (
                                <TableRow key={bc.id}>
                                    <TableCell className="font-mono text-sm">{bc.barcode}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {getBarcodeTypeLabel(bc.barcode_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {getPriceTypeLabel(bc.price_type)}
                                    </TableCell>
                                    <TableCell>
                                        {bc.is_primary && (
                                            <Badge variant="success" className="text-[10px]">Primary</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openEditDialog(bc)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(bc)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Add/Edit Barcode Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingBarcode ? "Edit Barcode" : "Add Barcode"}</DialogTitle>
                        <DialogDescription>
                            {editingBarcode
                                ? "Update barcode details."
                                : "Add a new barcode for this product."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 p-4">
                        <div className="space-y-2">
                            <Label htmlFor="bc_barcode">
                                Barcode <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="bc_barcode"
                                placeholder="Enter barcode value"
                                className="font-mono"
                                {...register("barcode")}
                            />
                            {errors.barcode && (
                                <p className="text-xs text-destructive">{String(errors.barcode.message)}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Barcode Type</Label>
                                <Select
                                    value={watchBarcodeType}
                                    onValueChange={(val) =>
                                        setValue("barcode_type", val as BarcodeType, { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BARCODE_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {getBarcodeTypeLabel(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Price Type</Label>
                                <Select
                                    value={watchPriceType}
                                    onValueChange={(val) =>
                                        setValue("price_type", val as PriceType, { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRICE_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {getPriceTypeLabel(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch
                                id="bc_is_primary"
                                checked={watchIsPrimary}
                                onCheckedChange={(checked) => setValue("is_primary", checked)}
                            />
                            <Label htmlFor="bc_is_primary">Set as primary barcode</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit(onFormSubmit)} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingBarcode ? "Update Barcode" : "Create Barcode"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
