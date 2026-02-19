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
    Link2,
    Star,
} from "lucide-react";
import { useProductStore } from "@/stores/product.store";
import { useSupplierStore } from "@/stores/supplier.store";
import { createSupplierProductSchema } from "@/validations/product.validation";
import type { SupplierProduct } from "@/types/product.types";
import { formatCurrency, formatPercentage } from "@/utils/product.utils";

// ============================================================================
// TYPES
// ============================================================================

interface SupplierProductMapperProps {
    productId: string;
    storeId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierProductMapper({
    productId,
    storeId,
}: SupplierProductMapperProps) {
    const {
        fetchSupplierProducts,
        createSupplierProduct,
        updateSupplierProduct,
        deleteSupplierProduct,
        isSaving,
    } = useProductStore();

    const { suppliers, fetchSuppliers } = useSupplierStore();

    const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SupplierProduct | null>(null);

    // Load supplier products + supplier list
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            await fetchSuppliers(storeId);
            const result = await fetchSupplierProducts(storeId, productId);
            if (!cancelled) {
                setSupplierProducts(result ?? []);
                setIsLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [storeId, productId, fetchSupplierProducts, fetchSuppliers]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createSupplierProductSchema) as any,
        defaultValues: {
            supplier_id: "",
            product_id: productId,
            supplier_product_code: "",
            supplier_product_name: "",
            purchase_price: 0,
            mrp: undefined as number | undefined,
            discount_percentage: 0,
            lead_time_days: undefined as number | undefined,
            minimum_order_quantity: 1,
            is_preferred: false,
        },
    });

    const watchSupplierId = watch("supplier_id");
    const watchIsPreferred = watch("is_preferred");

    // Supplier lookup map
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    // Suppliers already mapped (exclude from add dialog, except when editing)
    const mappedSupplierIds = new Set(supplierProducts.map((sp) => sp.supplier_id));

    const openAddDialog = () => {
        setEditingItem(null);
        reset({
            supplier_id: "",
            product_id: productId,
            supplier_product_code: "",
            supplier_product_name: "",
            purchase_price: 0,
            mrp: undefined,
            discount_percentage: 0,
            lead_time_days: undefined,
            minimum_order_quantity: 1,
            is_preferred: false,
        });
        setDialogOpen(true);
    };

    const openEditDialog = (sp: SupplierProduct) => {
        setEditingItem(sp);
        reset({
            supplier_id: sp.supplier_id,
            product_id: productId,
            supplier_product_code: sp.supplier_product_code ?? "",
            supplier_product_name: sp.supplier_product_name ?? "",
            purchase_price: sp.purchase_price,
            mrp: sp.mrp ?? undefined,
            discount_percentage: sp.discount_percentage,
            lead_time_days: sp.lead_time_days ?? undefined,
            minimum_order_quantity: sp.minimum_order_quantity,
            is_preferred: sp.is_preferred,
        });
        setDialogOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFormSubmit = async (data: any) => {
        const toastId = toast.loading(
            editingItem ? "Updating supplier mapping..." : "Adding supplier mapping..."
        );

        try {
            let success = false;
            if (editingItem) {
                const { supplier_id: _sid, product_id: _pid, ...updateData } = data;
                const cacheKey = `${productId}_${editingItem.supplier_id}`;
                success = await updateSupplierProduct(storeId, editingItem.id, updateData, cacheKey);
            } else {
                const result = await createSupplierProduct(storeId, data);
                success = !!result;
            }

            if (success) {
                toast.success(
                    editingItem ? "Supplier mapping updated" : "Supplier mapping added",
                    { id: toastId }
                );
                setDialogOpen(false);
                const updated = await fetchSupplierProducts(storeId, productId, undefined, true);
                setSupplierProducts(updated ?? []);
            } else {
                toast.error("Operation failed", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const handleDelete = async (sp: SupplierProduct) => {
        const toastId = toast.loading("Removing supplier mapping...");
        try {
            const cacheKey = `${productId}_${sp.supplier_id}`;
            const success = await deleteSupplierProduct(storeId, sp.id, cacheKey);
            if (success) {
                toast.success("Supplier mapping removed", { id: toastId });
                setSupplierProducts((prev) => prev.filter((item) => item.id !== sp.id));
            } else {
                toast.error("Failed to remove mapping", { id: toastId });
            }
        } catch {
            toast.error("An unexpected error occurred", { id: toastId });
        }
    };

    const isEdit = !!editingItem;
    const availableSuppliers = suppliers.filter(
        (s) => s.is_active && (!mappedSupplierIds.has(s.id) || (editingItem && s.id === editingItem.supplier_id))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Supplier Mappings</h4>
                <Button size="sm" variant="outline" onClick={openAddDialog}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Supplier
                </Button>
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Loading supplier mappings...
                </p>
            ) : supplierProducts.length === 0 ? (
                <div className="text-center py-6">
                    <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        No supplier mappings yet
                    </p>
                </div>
            ) : (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                <TableHead className="text-right">Lead Time</TableHead>
                                <TableHead className="text-right">MOQ</TableHead>
                                <TableHead className="w-[50px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {supplierProducts.map((sp) => {
                                const supplier = supplierMap.get(sp.supplier_id);

                                return (
                                    <TableRow key={sp.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {supplier?.name ?? sp.supplier_id.slice(0, 8)}
                                                </span>
                                                {sp.is_preferred && (
                                                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {sp.supplier_product_code || "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {formatCurrency(sp.purchase_price)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {sp.discount_percentage > 0
                                                ? formatPercentage(sp.discount_percentage)
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {sp.lead_time_days != null
                                                ? `${sp.lead_time_days} days`
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {sp.minimum_order_quantity}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                    >
                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(sp)}>
                                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(sp)}
                                                    >
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                        Remove
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
                        <DialogTitle>
                            {isEdit ? "Edit Supplier Mapping" : "Add Supplier Mapping"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Update supplier product details."
                                : "Link a supplier to this product."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>
                                Supplier <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchSupplierId}
                                onValueChange={(val) =>
                                    setValue("supplier_id", val, { shouldValidate: true })
                                }
                                disabled={isEdit}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSuppliers.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.supplier_id && (
                                <p className="text-xs text-destructive">
                                    {String(errors.supplier_id.message)}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sp_code">Supplier Product Code</Label>
                                <Input
                                    id="sp_code"
                                    placeholder="Supplier SKU"
                                    {...register("supplier_product_code")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sp_name">Supplier Product Name</Label>
                                <Input
                                    id="sp_name"
                                    placeholder="Name at supplier"
                                    {...register("supplier_product_name")}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sp_purchase_price">
                                    Purchase Price (₹) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="sp_purchase_price"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("purchase_price", { valueAsNumber: true })}
                                />
                                {errors.purchase_price && (
                                    <p className="text-xs text-destructive">
                                        {String(errors.purchase_price.message)}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sp_mrp">MRP (₹)</Label>
                                <Input
                                    id="sp_mrp"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    {...register("mrp", { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sp_discount">Discount %</Label>
                                <Input
                                    id="sp_discount"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    {...register("discount_percentage", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sp_lead_time">Lead Time (days)</Label>
                                <Input
                                    id="sp_lead_time"
                                    type="number"
                                    min={0}
                                    max={365}
                                    {...register("lead_time_days", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sp_moq">MOQ</Label>
                                <Input
                                    id="sp_moq"
                                    type="number"
                                    min={1}
                                    {...register("minimum_order_quantity", {
                                        valueAsNumber: true,
                                    })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                checked={watchIsPreferred}
                                onCheckedChange={(val) =>
                                    setValue("is_preferred", val, { shouldValidate: true })
                                }
                            />
                            <Label>Preferred Supplier</Label>
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
                            {isEdit ? "Update Mapping" : "Add Mapping"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
