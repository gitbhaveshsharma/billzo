"use client";

import { useRef, useState } from "react";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Loader2 } from "lucide-react";
import { createProductSchema } from "@/validations/product.validation";
import { GST_RATES } from "@/types/product.types";
import type { CreateProductRequest, Category, UnitOfMeasure } from "@/types/product.types";
import { useProductStore } from "@/stores/product.store";
import { ImageUploadField } from "./image-upload-field";

// ============================================================================
// TYPES
// ============================================================================

interface AddProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    onSubmit: (data: CreateProductRequest) => Promise<boolean>;
    categories: Category[];
    units: UnitOfMeasure[];
}

// ============================================================================
// DROPDOWN TRIGGER
// ============================================================================

function DropdownTriggerButton({ label, placeholder }: { label?: string; placeholder: string }) {
    return (
        <DropdownMenuTrigger asChild>
            <Button
                variant="outline"
                className="w-full justify-between font-normal text-left"
                type="button"
            >
                <span className={label ? "text-foreground" : "text-muted-foreground"}>
                    {label ?? placeholder}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </DropdownMenuTrigger>
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddProductDialog({
    open,
    onOpenChange,
    storeId,
    onSubmit,
    categories,
    units,
}: AddProductDialogProps) {
    const [activeTab, setActiveTab] = useState("basic");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const uploadProductImage = useProductStore((s) => s.uploadProductImage);

    // Stable temp ID used as the storage path prefix for new product images
    const tempProductIdRef = useRef(crypto.randomUUID());

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createProductSchema) as any,
        defaultValues: {
            product_code: "",
            name: "",
            barcode: "",
            description: "",
            short_description: "",
            category_id: undefined as string | undefined,
            brand: "",
            model: "",
            hsn_code: "",
            gst_percentage: 18,
            cess_percentage: 0,
            mrp: 0,
            selling_price: 0,
            purchase_price: undefined as number | undefined,
            unit_id: undefined as string | undefined,
            minimum_stock: 0,
            reorder_level: 0,
            is_batch_tracked: false,
            is_taxable: true,
            primary_image: "",
        },
    });

    const watchGst = watch("gst_percentage");
    const watchBatchTracked = watch("is_batch_tracked");
    const watchTaxable = watch("is_taxable");
    const watchCategoryId = watch("category_id");
    const watchUnitId = watch("unit_id");
    const watchPrimaryImage = watch("primary_image");

    // Upload handler — uses a stable temp ID so the path survives re-renders
    const handleImageUpload = async (file: File): Promise<string | null> => {
        return uploadProductImage(storeId, tempProductIdRef.current, file);
    };

    // Derived display labels
    const selectedCategory = categories.find((c) => c.id === watchCategoryId);
    const selectedUnit = units.find((u) => u.id === watchUnitId);
    const selectedGstLabel =
        watchGst === 0 ? "Exempt (0%)" : watchGst != null ? `${watchGst}%` : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Creating product...");

        try {
            const success = await onSubmit(data as CreateProductRequest);
            if (success) {
                toast.success("Product created successfully", { id: toastId });
                // Reset the temp image folder ID for next new product
                tempProductIdRef.current = crypto.randomUUID();
                reset();
                setActiveTab("basic");
                onOpenChange(false);
            } else {
                toast.error("Failed to create product", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            reset();
            setActiveTab("basic");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                        Create a new product. Fill in required fields and any additional details.
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
                                    <Label htmlFor="product_code">
                                        Product Code <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="product_code"
                                        placeholder="e.g., PRD-001"
                                        {...register("product_code")}
                                    />
                                    {errors.product_code && (
                                        <p className="text-xs text-destructive">{String(errors.product_code.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Product Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Premium Basmati Rice 5kg"
                                        {...register("name")}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">{String(errors.name.message)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="barcode">Barcode</Label>
                                    <Input
                                        id="barcode"
                                        placeholder="EAN-13 / UPC barcode"
                                        {...register("barcode")}
                                    />
                                    {errors.barcode && (
                                        <p className="text-xs text-destructive">{String(errors.barcode.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Brand</Label>
                                    <Input
                                        id="brand"
                                        placeholder="e.g., Daawat"
                                        {...register("brand")}
                                    />
                                    {errors.brand && (
                                        <p className="text-xs text-destructive">{String(errors.brand.message)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Category + Unit Dropdowns */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <DropdownMenu>
                                        <DropdownTriggerButton
                                            label={selectedCategory?.name}
                                            placeholder="Select category"
                                        />
                                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                            {categories
                                                .filter((c) => c.is_active)
                                                .map((cat) => (
                                                    <DropdownMenuItem
                                                        key={cat.id}
                                                        onSelect={() =>
                                                            setValue("category_id", cat.id, { shouldValidate: true })
                                                        }
                                                        className={watchCategoryId === cat.id ? "bg-accent" : ""}
                                                    >
                                                        {cat.name}
                                                    </DropdownMenuItem>
                                                ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit of Measure</Label>
                                    <DropdownMenu>
                                        <DropdownTriggerButton
                                            label={selectedUnit ? `${selectedUnit.name} (${selectedUnit.code})` : undefined}
                                            placeholder="Select unit"
                                        />
                                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                            {units
                                                .filter((u) => u.is_active)
                                                .map((unit) => (
                                                    <DropdownMenuItem
                                                        key={unit.id}
                                                        onSelect={() =>
                                                            setValue("unit_id", unit.id, { shouldValidate: true })
                                                        }
                                                        className={watchUnitId === unit.id ? "bg-accent" : ""}
                                                    >
                                                        {unit.name} ({unit.code})
                                                    </DropdownMenuItem>
                                                ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model</Label>
                                    <Input
                                        id="model"
                                        placeholder="Model number"
                                        {...register("model")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hsn_code">HSN Code</Label>
                                    <Input
                                        id="hsn_code"
                                        placeholder="e.g., 10063020"
                                        {...register("hsn_code")}
                                    />
                                    {errors.hsn_code && (
                                        <p className="text-xs text-destructive">{String(errors.hsn_code.message)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="short_description">Short Description</Label>
                                <Input
                                    id="short_description"
                                    placeholder="Brief product description (max 200 chars)"
                                    {...register("short_description")}
                                />
                                {errors.short_description && (
                                    <p className="text-xs text-destructive">{String(errors.short_description.message)}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Full Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Detailed product description..."
                                    rows={3}
                                    {...register("description")}
                                />
                                {errors.description && (
                                    <p className="text-xs text-destructive">{String(errors.description.message)}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Product Image</Label>
                                <ImageUploadField
                                    value={watchPrimaryImage || ""}
                                    onChange={(url) => setValue("primary_image", url)}
                                    onUpload={handleImageUpload}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </TabsContent>

                        {/* ================================ PRICING & TAX ================================ */}
                        <TabsContent value="pricing" className="space-y-4 mt-0 px-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mrp">
                                        MRP (₹) <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="mrp"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                        {...register("mrp", { valueAsNumber: true })}
                                    />
                                    {errors.mrp && (
                                        <p className="text-xs text-destructive">{String(errors.mrp.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="selling_price">
                                        Selling Price (₹) <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="selling_price"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                        {...register("selling_price", { valueAsNumber: true })}
                                    />
                                    {errors.selling_price && (
                                        <p className="text-xs text-destructive">{String(errors.selling_price.message)}</p>
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
                                        placeholder="0.00"
                                        {...register("purchase_price", { valueAsNumber: true })}
                                    />
                                    {errors.purchase_price && (
                                        <p className="text-xs text-destructive">{String(errors.purchase_price.message)}</p>
                                    )}
                                </div>
                                <div />
                            </div>

                            <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-medium text-muted-foreground">Tax Configuration</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* GST Rate Dropdown */}
                                    <div className="space-y-2">
                                        <Label>
                                            GST Rate <span className="text-destructive">*</span>
                                        </Label>
                                        <DropdownMenu>
                                            <DropdownTriggerButton
                                                label={selectedGstLabel}
                                                placeholder="Select GST rate"
                                            />
                                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                                {GST_RATES.map((rate) => (
                                                    <DropdownMenuItem
                                                        key={rate}
                                                        onSelect={() =>
                                                            setValue("gst_percentage", rate, { shouldValidate: true })
                                                        }
                                                        className={watchGst === rate ? "bg-accent" : ""}
                                                    >
                                                        {rate === 0 ? "Exempt (0%)" : `${rate}%`}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cess_percentage">Cess (%)</Label>
                                        <Input
                                            id="cess_percentage"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            {...register("cess_percentage", { valueAsNumber: true })}
                                        />
                                        {errors.cess_percentage && (
                                            <p className="text-xs text-destructive">{String(errors.cess_percentage.message)}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="is_taxable"
                                        checked={watchTaxable}
                                        onCheckedChange={(checked) => setValue("is_taxable", checked)}
                                    />
                                    <Label htmlFor="is_taxable">Product is taxable</Label>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ================================ INVENTORY ================================ */}
                        <TabsContent value="inventory" className="space-y-4 mt-0 px-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="minimum_stock">Minimum Stock</Label>
                                    <Input
                                        id="minimum_stock"
                                        type="number"
                                        min={0}
                                        {...register("minimum_stock", { valueAsNumber: true })}
                                    />
                                    {errors.minimum_stock && (
                                        <p className="text-xs text-destructive">{String(errors.minimum_stock.message)}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reorder_level">Reorder Level</Label>
                                    <Input
                                        id="reorder_level"
                                        type="number"
                                        min={0}
                                        {...register("reorder_level", { valueAsNumber: true })}
                                    />
                                    {errors.reorder_level && (
                                        <p className="text-xs text-destructive">{String(errors.reorder_level.message)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    id="is_batch_tracked"
                                    checked={watchBatchTracked}
                                    onCheckedChange={(checked) => setValue("is_batch_tracked", checked)}
                                />
                                <Label htmlFor="is_batch_tracked">Enable batch & expiry tracking</Label>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                When batch tracking is enabled, you can record manufacturing dates,
                                expiry dates, and batch numbers for this product.
                            </p>
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
                        Create Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}