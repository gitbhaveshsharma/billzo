"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { updateProductSchema } from "@/validations/product.validation";
import { GST_RATES } from "@/types/product.types";
import type { Product, UpdateProductRequest, Category, UnitOfMeasure } from "@/types/product.types";

// ============================================================================
// TYPES
// ============================================================================

interface EditProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (productId: string, data: UpdateProductRequest) => Promise<boolean>;
    categories: Category[];
    units: UnitOfMeasure[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EditProductDialog({
    product,
    open,
    onOpenChange,
    onSubmit,
    categories,
    units,
}: EditProductDialogProps) {
    const [activeTab, setActiveTab] = useState("basic");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(updateProductSchema) as any,
    });

    // Populate form when product changes
    useEffect(() => {
        if (product && open) {
            reset({
                product_code: product.product_code,
                name: product.name,
                barcode: product.barcode ?? "",
                description: (product as unknown as { description?: string }).description ?? "",
                short_description: (product as unknown as { short_description?: string }).short_description ?? "",
                category_id: product.category_id ?? undefined,
                brand: product.brand ?? "",
                model: product.model ?? "",
                hsn_code: product.hsn_code ?? "",
                gst_percentage: product.gst_percentage,
                cess_percentage: product.cess_percentage,
                mrp: product.mrp,
                selling_price: product.selling_price,
                purchase_price: product.purchase_price ?? undefined,
                unit_id: product.unit_id ?? undefined,
                minimum_stock: product.minimum_stock,
                reorder_level: product.reorder_level,
                is_batch_tracked: product.is_batch_tracked,
                is_taxable: product.is_taxable,
                is_active: product.is_active,
                primary_image: product.primary_image ?? "",
            });
        }
    }, [product, open, reset]);

    const watchGst = watch("gst_percentage");
    const watchBatchTracked = watch("is_batch_tracked");
    const watchTaxable = watch("is_taxable");
    const watchActive = watch("is_active");
    const watchCategoryId = watch("category_id");
    const watchUnitId = watch("unit_id");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        if (!product) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Updating product...");

        try {
            const success = await onSubmit(product.id, data as UpdateProductRequest);
            if (success) {
                toast.success("Product updated successfully", { id: toastId });
                onOpenChange(false);
            } else {
                toast.error("Failed to update product", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setActiveTab("basic");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Edit Product</DialogTitle>
                    <DialogDescription>
                        Update product details for {product?.name ?? "this product"}.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col p-1">
                    <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing & Tax</TabsTrigger>
                        <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 min-h-0 p-4 overflow-x-auto">
                        {/* ================================ BASIC INFO ================================ */}
                        <TabsContent value="basic" className="space-y-4 mt-0 px-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_product_code">
                                        Product Code <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="edit_product_code"
                                        placeholder="e.g., PRD-001"
                                        {...register("product_code")}
                                    />
                                    {errors.product_code && (
                                        <p className="text-xs text-destructive">{String(errors.product_code.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_name">
                                        Product Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="edit_name"
                                        placeholder="Product name"
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{String(errors.name.message)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_barcode">Barcode</Label>
                                    <Input
                                        id="edit_barcode"
                                        placeholder="EAN-13 / UPC barcode"
                                        {...register("barcode")}
                                    />
                                    {errors.barcode && (
                                        <p className="text-xs text-destructive">{String(errors.barcode.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_brand">Brand</Label>
                                    <Input
                                        id="edit_brand"
                                        placeholder="Brand name"
                                        {...register("brand")}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={watchCategoryId || ""}
                                        onValueChange={(val) =>
                                            setValue("category_id", val || undefined, { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories
                                                .filter((c) => c.is_active)
                                                .map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit of Measure</Label>
                                    <Select
                                        value={watchUnitId || ""}
                                        onValueChange={(val) =>
                                            setValue("unit_id", val || undefined, { shouldValidate: true })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {units
                                                .filter((u) => u.is_active)
                                                .map((unit) => (
                                                    <SelectItem key={unit.id} value={unit.id}>
                                                        {unit.name} ({unit.code})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_model">Model</Label>
                                    <Input id="edit_model" {...register("model")} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_hsn_code">HSN Code</Label>
                                    <Input id="edit_hsn_code" {...register("hsn_code")} />
                                    {errors.hsn_code && (
                                        <p className="text-xs text-destructive">{String(errors.hsn_code.message)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_short_description">Short Description</Label>
                                <Input id="edit_short_description" {...register("short_description")} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_description">Full Description</Label>
                                <Textarea id="edit_description" rows={3} {...register("description")} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_primary_image">Image URL</Label>
                                <Input id="edit_primary_image" {...register("primary_image")} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    id="edit_is_active"
                                    checked={watchActive}
                                    onCheckedChange={(checked) => setValue("is_active", checked)}
                                />
                                <Label htmlFor="edit_is_active">Product is active</Label>
                            </div>
                        </TabsContent>

                        {/* ================================ PRICING & TAX ================================ */}
                        <TabsContent value="pricing" className="space-y-4 mt-0 px-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_mrp">MRP (₹)</Label>
                                    <Input
                                        id="edit_mrp"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        {...register("mrp", { valueAsNumber: true })}
                                    />
                                    {errors.mrp && (
                                        <p className="text-xs text-destructive">{String(errors.mrp.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_selling_price">Selling Price (₹)</Label>
                                    <Input
                                        id="edit_selling_price"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        {...register("selling_price", { valueAsNumber: true })}
                                    />
                                    {errors.selling_price && (
                                        <p className="text-xs text-destructive">{String(errors.selling_price.message)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_purchase_price">Purchase Price (₹)</Label>
                                    <Input
                                        id="edit_purchase_price"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        {...register("purchase_price", { valueAsNumber: true })}
                                    />
                                </div>
                                <div />
                            </div>

                            <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-medium text-muted-foreground">Tax Configuration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>GST Rate</Label>
                                        <Select
                                            value={String(watchGst ?? 18)}
                                            onValueChange={(val) =>
                                                setValue("gst_percentage", Number(val), { shouldValidate: true })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GST_RATES.map((rate) => (
                                                    <SelectItem key={rate} value={String(rate)}>
                                                        {rate === 0 ? "Exempt (0%)" : `${rate}%`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_cess">Cess (%)</Label>
                                        <Input
                                            id="edit_cess"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            {...register("cess_percentage", { valueAsNumber: true })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="edit_is_taxable"
                                        checked={watchTaxable}
                                        onCheckedChange={(checked) => setValue("is_taxable", checked)}
                                    />
                                    <Label htmlFor="edit_is_taxable">Product is taxable</Label>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ INVENTORY ================================ */}
                        <TabsContent value="inventory" className="space-y-4 mt-0 px-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_minimum_stock">Minimum Stock</Label>
                                    <Input
                                        id="edit_minimum_stock"
                                        type="number"
                                        min={0}
                                        {...register("minimum_stock", { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_reorder_level">Reorder Level</Label>
                                    <Input
                                        id="edit_reorder_level"
                                        type="number"
                                        min={0}
                                        {...register("reorder_level", { valueAsNumber: true })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    id="edit_is_batch_tracked"
                                    checked={watchBatchTracked}
                                    onCheckedChange={(checked) => setValue("is_batch_tracked", checked)}
                                />
                                <Label htmlFor="edit_is_batch_tracked">Enable batch & expiry tracking</Label>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <DialogFooter className="flex-shrink-0 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit(onFormSubmit)} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
