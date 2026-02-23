"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { ChevronDown, Loader2, ScanLine } from "lucide-react";
import { updateProductSchema } from "@/validations/product.validation";
import { GST_RATES } from "@/types/product.types";
import type { Product, UpdateProductRequest, Category, UnitOfMeasure } from "@/types/product.types";
import { useProductStore } from "@/stores/product.store";
import { ImageUploadField } from "./image-upload-field";

// ============================================================================
// TYPES
// ============================================================================

interface EditProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    onSubmit: (productId: string, data: UpdateProductRequest) => Promise<boolean>;
    categories: Category[];
    units: UnitOfMeasure[];
}

// ============================================================================
// DROPDOWN TRIGGER
// A styled button that mimics a select trigger using shadcn DropdownMenu
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

export function EditProductDialog({
    product,
    open,
    onOpenChange,
    storeId,
    onSubmit,
    categories,
    units,
}: EditProductDialogProps) {
    const [activeTab, setActiveTab] = useState("basic");
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Local state for image URL — more reliable than watch() for pre-filled values
    const [primaryImageUrl, setPrimaryImageUrl] = useState<string>("");

    // ── Barcode scanner state ──
    const [barcodeScanReady, setBarcodeScanReady] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement | null>(null);

    const uploadProductImage = useProductStore((s) => s.uploadProductImage);

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
            const imageUrl = product.primary_image ?? "";
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
                primary_image: imageUrl,
            });
            // Explicitly set local image state so the preview renders immediately
            setPrimaryImageUrl(imageUrl);
        }
    }, [product, open, reset]);

    const watchGst = watch("gst_percentage");
    const watchBatchTracked = watch("is_batch_tracked");
    const watchTaxable = watch("is_taxable");
    const watchActive = watch("is_active");
    const watchCategoryId = watch("category_id");
    const watchUnitId = watch("unit_id");

    // ── Barcode scanner handlers ──
    const handleBarcodeKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                const val = (e.currentTarget.value ?? "").trim();
                if (val) {
                    setValue("barcode", val, { shouldValidate: true });
                    barcodeInputRef.current?.blur();
                }
            }
        },
        [setValue]
    );

    // Merge react-hook-form's ref with our local ref
    const { ref: rhfBarcodeRef, ...rhfBarcodeProps } = register("barcode");

    // Upload handler — uses the known product.id for the storage path
    const handleImageUpload = async (file: File): Promise<string | null> => {
        if (!product) return null;
        return uploadProductImage(storeId, product.id, file);
    };

    // Derived display labels for dropdown triggers
    const selectedCategory = categories.find((c) => c.id === watchCategoryId);
    const selectedUnit = units.find((u) => u.id === watchUnitId);
    const selectedGstLabel =
        watchGst === 0 ? "Exempt (0%)" : watchGst != null ? `${watchGst}%` : undefined;

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
            setPrimaryImageUrl("");
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
                                    <div className="relative">
                                        <Input
                                            id="edit_barcode"
                                            {...rhfBarcodeProps}
                                            ref={(el) => {
                                                rhfBarcodeRef(el);
                                                barcodeInputRef.current = el;
                                            }}
                                            placeholder="Click here, then scan…"
                                            onKeyDown={handleBarcodeKeyDown}
                                            onFocus={() => setBarcodeScanReady(true)}
                                            onBlur={() => setBarcodeScanReady(false)}
                                            className={barcodeScanReady
                                                ? "pr-20 ring-2 ring-blue-500 border-blue-400 focus-visible:ring-blue-500"
                                                : "pr-20"
                                            }
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                            {barcodeScanReady ? (
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                                                    <ScanLine className="h-3 w-3" />
                                                    Scan ready
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <ScanLine className="h-3 w-3" />
                                                    Scanner
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {barcodeScanReady && (
                                        <p className="text-[11px] text-blue-600 dark:text-blue-400">
                                            Scanner active — scan a barcode or type manually.
                                        </p>
                                    )}
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
                                {/* Category Dropdown */}
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

                                {/* Unit of Measure Dropdown */}
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
                                <Label>Product Image</Label>
                                <ImageUploadField
                                    value={primaryImageUrl}
                                    onChange={(url) => {
                                        setPrimaryImageUrl(url);
                                        setValue("primary_image", url);
                                    }}
                                    onUpload={handleImageUpload}
                                    disabled={isSubmitting}
                                />
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
                                    {/* GST Rate Dropdown */}
                                    <div className="space-y-2">
                                        <Label>GST Rate</Label>
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