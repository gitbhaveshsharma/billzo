"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { useProductStore } from "@/stores/product.store";
import { createProductVariantSchema } from "@/validations/product.validation";
import type { EnrichedProduct, ProductVariant } from "@/types/product.types";
import {
    formatCurrency,
    formatVariantAttributes,
    getVariantDisplayName,
} from "@/utils/product.utils";

// ============================================================================
// TYPES
// ============================================================================

interface VariantManagerProps {
    product: EnrichedProduct;
    storeId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VariantManager({ product, storeId }: VariantManagerProps) {
    const {
        fetchVariants,
        createVariant,
        updateVariant,
        deleteVariant,
        isSaving,
    } = useProductStore();

    const [variants, setVariants] = useState<ProductVariant[]>(product.variants ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);

    // Attribute key-value pairs for the form
    const [attrPairs, setAttrPairs] = useState<Array<{ key: string; value: string }>>([
        { key: "", value: "" },
    ]);

    // Load variants
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            const data = await fetchVariants(product.id);
            if (mounted) {
                setVariants(data);
                setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [product.id, fetchVariants]);

    // Sync from store when product.variants changes
    useEffect(() => {
        if (product.variants) {
            setVariants(product.variants);
        }
    }, [product.variants]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createProductVariantSchema) as any,
        defaultValues: {
            product_id: product.id,
            variant_code: "",
            barcode: "",
            name: "",
            attributes: {} as Record<string, string>,
            mrp: undefined as number | undefined,
            selling_price: undefined as number | undefined,
            is_default: false,
            image_url: "",
        },
    });

    const watchIsDefault = watch("is_default");

    const openAddDialog = () => {
        reset({
            product_id: product.id,
            variant_code: "",
            barcode: "",
            name: "",
            attributes: {},
            mrp: undefined,
            selling_price: undefined,
            is_default: false,
            image_url: "",
        });
        setAttrPairs([{ key: "", value: "" }]);
        setEditingVariant(null);
        setAddDialogOpen(true);
    };

    const openEditDialog = (variant: ProductVariant) => {
        setEditingVariant(variant);
        const pairs = Object.entries(variant.attributes).map(([key, value]) => ({
            key,
            value,
        }));
        setAttrPairs(pairs.length > 0 ? pairs : [{ key: "", value: "" }]);
        reset({
            product_id: product.id,
            variant_code: variant.variant_code,
            barcode: variant.barcode ?? "",
            name: variant.name ?? "",
            attributes: variant.attributes,
            mrp: variant.mrp ?? undefined,
            selling_price: variant.selling_price ?? undefined,
            is_default: variant.is_default,
            image_url: variant.image_url ?? "",
        });
        setAddDialogOpen(true);
    };

    // Sync attribute pairs → form field
    const updateAttrPairs = (pairs: Array<{ key: string; value: string }>) => {
        setAttrPairs(pairs);
        const attrs: Record<string, string> = {};
        pairs.forEach(({ key, value }) => {
            if (key.trim()) attrs[key.trim()] = value;
        });
        setValue("attributes", attrs, { shouldValidate: true });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        const toastId = toast.loading(editingVariant ? "Updating variant..." : "Creating variant...");

        try {
            if (editingVariant) {
                const { product_id, ...updateData } = data;
                const success = await updateVariant(storeId, editingVariant.id, updateData, product.id);
                if (success) {
                    toast.success("Variant updated", { id: toastId });
                    setAddDialogOpen(false);
                    const refreshed = await fetchVariants(product.id, true);
                    setVariants(refreshed);
                } else {
                    toast.error("Failed to update variant", { id: toastId });
                }
            } else {
                const result = await createVariant(storeId, data);
                if (result) {
                    toast.success("Variant created", { id: toastId });
                    setAddDialogOpen(false);
                    const refreshed = await fetchVariants(product.id, true);
                    setVariants(refreshed);
                } else {
                    toast.error("Failed to create variant", { id: toastId });
                }
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const handleDelete = async (variant: ProductVariant) => {
        const toastId = toast.loading("Deleting variant...");
        const success = await deleteVariant(storeId, variant.id, product.id);
        if (success) {
            toast.success("Variant deleted", { id: toastId });
            setVariants((prev) => prev.filter((v) => v.id !== variant.id));
        } else {
            toast.error("Failed to delete variant", { id: toastId });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                    Variants
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                        {variants.length}
                    </Badge>
                </h4>
                <Button size="sm" variant="outline" onClick={openAddDialog}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Variant
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : variants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No variants yet. Add variants to offer different sizes, colors, etc.
                </p>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Variant</TableHead>
                                <TableHead>Attributes</TableHead>
                                <TableHead>MRP</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {variants.map((variant) => (
                                <TableRow key={variant.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{getVariantDisplayName(variant)}</span>
                                            {variant.is_default && (
                                                <Badge variant="secondary" className="text-[10px]">Default</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">#{variant.variant_code}</p>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {formatVariantAttributes(variant.attributes)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm">{formatCurrency(variant.mrp)}</TableCell>
                                    <TableCell className="text-sm">{formatCurrency(variant.selling_price)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openEditDialog(variant)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(variant)}
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

            {/* Add/Edit Variant Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingVariant ? "Edit Variant" : "Add Variant"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingVariant
                                ? `Update details for variant ${editingVariant.variant_code}`
                                : "Create a new product variant with specific attributes."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="variant_code">
                                    Variant Code <span className="text-destructive">*</span>
                                </Label>
                                <Input id="variant_code" {...register("variant_code")} />
                                {errors.variant_code && (
                                    <p className="text-xs text-destructive">{String(errors.variant_code.message)}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant_name">Name</Label>
                                <Input id="variant_name" {...register("name")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="variant_barcode">Barcode</Label>
                                <Input id="variant_barcode" {...register("barcode")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant_image">Image URL</Label>
                                <Input id="variant_image" {...register("image_url")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="variant_mrp">MRP (₹)</Label>
                                <Input
                                    id="variant_mrp"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("mrp", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant_selling_price">Selling Price (₹)</Label>
                                <Input
                                    id="variant_selling_price"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("selling_price", { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        {/* Attributes */}
                        <div className="space-y-2">
                            <Label>
                                Attributes <span className="text-destructive">*</span>
                            </Label>
                            {attrPairs.map((pair, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        placeholder="Key (e.g., Color)"
                                        value={pair.key}
                                        onChange={(e) => {
                                            const newPairs = [...attrPairs];
                                            newPairs[index].key = e.target.value;
                                            updateAttrPairs(newPairs);
                                        }}
                                        className="flex-1"
                                    />
                                    <Input
                                        placeholder="Value (e.g., Red)"
                                        value={pair.value}
                                        onChange={(e) => {
                                            const newPairs = [...attrPairs];
                                            newPairs[index].value = e.target.value;
                                            updateAttrPairs(newPairs);
                                        }}
                                        className="flex-1"
                                    />
                                    {attrPairs.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onClick={() => {
                                                const newPairs = attrPairs.filter((_, i) => i !== index);
                                                updateAttrPairs(newPairs);
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    updateAttrPairs([...attrPairs, { key: "", value: "" }])
                                }
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Attribute
                            </Button>
                            {errors.attributes && (
                                <p className="text-xs text-destructive">{String(errors.attributes.message)}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch
                                id="variant_is_default"
                                checked={watchIsDefault}
                                onCheckedChange={(checked) => setValue("is_default", checked)}
                            />
                            <Label htmlFor="variant_is_default">Set as default variant</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit(onFormSubmit)} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingVariant ? "Update Variant" : "Create Variant"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
