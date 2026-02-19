"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { createPurchaseOrderSchema } from "@/validations/purchase.validation";
import type { CreatePurchaseOrderFormData } from "@/validations/purchase.validation";
import type { PurchaseOrder, CreatePurchaseOrderRequest } from "@/types/purchase.types";
import { calculateItemTotals, calculatePOTotals, formatCurrency } from "@/utils/purchase.utils";
import { useSupplierStore } from "@/stores/supplier.store";

// ============================================================================
// TYPES
// ============================================================================

interface CreatePODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    editOrder?: PurchaseOrder | null;
    onSubmit: (data: CreatePurchaseOrderRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// DEFAULT ITEM
// ============================================================================

const DEFAULT_ITEM = {
    product_id: crypto.randomUUID(),
    product_name: "",
    product_code: "",
    hsn_code: "",
    ordered_quantity: 1,
    unit_price: 0,
    mrp: undefined as number | undefined,
    discount_percentage: 0,
    discount_amount: 0,
    gst_percentage: 18,
    cess_percentage: 0,
    batch_number: "",
    notes: "",
};

// ============================================================================
// CREATE PO DIALOG
// ============================================================================

export function CreatePODialog({
    open,
    onOpenChange,
    storeId,
    editOrder,
    onSubmit,
    isSaving,
}: CreatePODialogProps) {
    const [activeTab, setActiveTab] = useState("details");
    const suppliers = useSupplierStore((s) => s.suppliers);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CreatePurchaseOrderFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createPurchaseOrderSchema) as any,
        defaultValues: {
            supplier_id: "",
            supplier_name: "",
            supplier_gstin: "",
            order_date: new Date().toISOString().split("T")[0],
            expected_delivery_date: "",
            invoice_number: "",
            reference_number: "",
            invoice_date: "",
            discount_amount: 0,
            discount_percentage: 0,
            shipping_charges: 0,
            other_charges: 0,
            round_off: 0,
            is_inter_state: false,
            place_of_supply: "",
            receiving_warehouse: "",
            notes: "",
            terms_and_conditions: "",
            internal_notes: "",
            tags: [],
            items: [{ ...DEFAULT_ITEM }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const watchedItems = watch("items");
    const isInterState = watch("is_inter_state");
    const orderDiscount = watch("discount_amount") ?? 0;
    const shippingCharges = watch("shipping_charges") ?? 0;
    const otherCharges = watch("other_charges") ?? 0;
    const roundOff = watch("round_off") ?? 0;

    // Calculate totals
    const { itemTotals, poTotals } = useMemo(() => {
        const itemTotals = (watchedItems ?? []).map((item) =>
            calculateItemTotals(
                item.ordered_quantity || 0,
                item.unit_price || 0,
                item.discount_percentage || 0,
                item.gst_percentage || 0,
                item.cess_percentage || 0,
                isInterState
            )
        );

        const poTotals = calculatePOTotals(
            itemTotals,
            orderDiscount,
            shippingCharges,
            otherCharges,
            roundOff
        );

        return { itemTotals, poTotals };
    }, [watchedItems, isInterState, orderDiscount, shippingCharges, otherCharges, roundOff]);

    // Select supplier handler
    const handleSupplierChange = useCallback(
        (supplierId: string) => {
            const supplier = suppliers.find((s) => s.id === supplierId);
            if (supplier) {
                setValue("supplier_id", supplier.id);
                setValue("supplier_name", supplier.name);
                setValue("supplier_gstin", supplier.gstin ?? "");
            }
        },
        [suppliers, setValue]
    );

    // Form submit
    const onFormSubmit = async (data: CreatePurchaseOrderFormData) => {
        const request: CreatePurchaseOrderRequest = {
            supplier_id: data.supplier_id,
            supplier_name: data.supplier_name,
            order_date: data.order_date,
            supplier_gstin: data.supplier_gstin || undefined,
            invoice_number: data.invoice_number || undefined,
            reference_number: data.reference_number || undefined,
            expected_delivery_date: data.expected_delivery_date || undefined,
            invoice_date: data.invoice_date || undefined,
            discount_amount: data.discount_amount,
            discount_percentage: data.discount_percentage,
            shipping_charges: data.shipping_charges,
            other_charges: data.other_charges,
            round_off: data.round_off,
            is_inter_state: data.is_inter_state,
            place_of_supply: data.place_of_supply || undefined,
            receiving_warehouse: data.receiving_warehouse || undefined,
            notes: data.notes || undefined,
            terms_and_conditions: data.terms_and_conditions || undefined,
            internal_notes: data.internal_notes || undefined,
            tags: data.tags?.length ? data.tags : undefined,
            items: data.items.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                product_code: item.product_code,
                hsn_code: item.hsn_code || undefined,
                ordered_quantity: item.ordered_quantity,
                unit_price: item.unit_price,
                mrp: item.mrp ?? undefined,
                discount_percentage: item.discount_percentage,
                gst_percentage: item.gst_percentage,
                cess_percentage: item.cess_percentage,
                batch_number: item.batch_number || undefined,
                notes: item.notes || undefined,
            })),
        };

        const success = await onSubmit(request);
        if (success) {
            reset();
            setActiveTab("details");
            onOpenChange(false);
        }
    };

    // Handle dialog close
    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            reset();
            setActiveTab("details");
        }
        onOpenChange(isOpen);
    };

    // Tags input
    const [tagInput, setTagInput] = useState("");
    const watchedTags = watch("tags") ?? [];

    const addTag = useCallback(() => {
        const trimmed = tagInput.trim();
        if (trimmed && !watchedTags.includes(trimmed)) {
            setValue("tags", [...watchedTags, trimmed]);
            setTagInput("");
        }
    }, [tagInput, watchedTags, setValue]);

    const removeTag = useCallback(
        (tag: string) => {
            setValue("tags", watchedTags.filter((t) => t !== tag));
        },
        [watchedTags, setValue]
    );

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {editOrder ? "Edit Purchase Order" : "Create Purchase Order"}
                    </DialogTitle>
                    <DialogDescription>
                        {editOrder
                            ? "Update purchase order details and items."
                            : "Fill in the details to create a new purchase order."}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0">
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="items">
                            Items ({fields.length})
                        </TabsTrigger>
                        <TabsTrigger value="additional">Additional</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 mt-2" style={{ maxHeight: "calc(90vh - 220px)" }}>
                        {/* === DETAILS TAB === */}
                        <TabsContent value="details" className="space-y-4 px-1">
                            {/* Supplier */}
                            <div className="space-y-2">
                                <Label>Supplier *</Label>
                                <Select
                                    value={watch("supplier_id")}
                                    onValueChange={handleSupplierChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                                {s.supplier_code ? ` (${s.supplier_code})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.supplier_id && (
                                    <p className="text-sm text-red-500">{errors.supplier_id.message}</p>
                                )}
                            </div>

                            {/* Supplier GSTIN (auto-filled, editable) */}
                            <div className="space-y-2">
                                <Label>Supplier GSTIN</Label>
                                <Input {...register("supplier_gstin")} placeholder="e.g. 29AAACB1234F1Z5" />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Order Date *</Label>
                                    <Input type="date" {...register("order_date")} />
                                    {errors.order_date && (
                                        <p className="text-sm text-red-500">{errors.order_date.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Expected Delivery</Label>
                                    <Input type="date" {...register("expected_delivery_date")} />
                                    {errors.expected_delivery_date && (
                                        <p className="text-sm text-red-500">
                                            {errors.expected_delivery_date.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Invoice & Reference */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Invoice Number</Label>
                                    <Input {...register("invoice_number")} placeholder="INV-001" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reference Number</Label>
                                    <Input {...register("reference_number")} placeholder="REF-001" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Invoice Date</Label>
                                <Input type="date" {...register("invoice_date")} />
                            </div>

                            {/* Inter-state */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Label>Inter-State Supply</Label>
                                    <p className="text-muted-foreground text-xs">
                                        Enable for IGST instead of CGST+SGST
                                    </p>
                                </div>
                                <Switch
                                    checked={isInterState}
                                    onCheckedChange={(checked) => setValue("is_inter_state", checked)}
                                />
                            </div>

                            {isInterState && (
                                <div className="space-y-2">
                                    <Label>Place of Supply</Label>
                                    <Input {...register("place_of_supply")} placeholder="e.g. Maharashtra" />
                                </div>
                            )}
                        </TabsContent>

                        {/* === ITEMS TAB === */}
                        <TabsContent value="items" className="space-y-4 px-1">
                            {errors.items?.message && (
                                <p className="text-sm text-red-500">{errors.items.message}</p>
                            )}

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Product *</TableHead>
                                            <TableHead className="w-[100px]">Code *</TableHead>
                                            <TableHead className="w-[70px]">Qty *</TableHead>
                                            <TableHead className="w-[100px]">Price *</TableHead>
                                            <TableHead className="w-[60px]">GST% *</TableHead>
                                            <TableHead className="w-[60px]">Disc%</TableHead>
                                            <TableHead className="text-right w-[100px]">Total</TableHead>
                                            <TableHead className="w-[40px]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                    <Input
                                                        {...register(`items.${index}.product_name`)}
                                                        placeholder="Product name"
                                                        className="h-8 text-sm"
                                                    />
                                                    {errors.items?.[index]?.product_name && (
                                                        <p className="text-[10px] text-red-500 mt-0.5">
                                                            {errors.items[index].product_name?.message}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        {...register(`items.${index}.product_code`)}
                                                        placeholder="Code"
                                                        className="h-8 text-sm"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        {...register(`items.${index}.ordered_quantity`, {
                                                            valueAsNumber: true,
                                                        })}
                                                        className="h-8 text-sm w-16"
                                                        min={1}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        {...register(`items.${index}.unit_price`, {
                                                            valueAsNumber: true,
                                                        })}
                                                        className="h-8 text-sm"
                                                        min={0}
                                                        step="0.01"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={String(watchedItems?.[index]?.gst_percentage ?? 18)}
                                                        onValueChange={(val) =>
                                                            setValue(`items.${index}.gst_percentage`, Number(val))
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 text-sm w-16">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[0, 5, 12, 18, 28].map((rate) => (
                                                                <SelectItem key={rate} value={String(rate)}>
                                                                    {rate}%
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        {...register(`items.${index}.discount_percentage`, {
                                                            valueAsNumber: true,
                                                        })}
                                                        className="h-8 text-sm w-14"
                                                        min={0}
                                                        max={100}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {formatCurrency(itemTotals[index]?.totalAmount ?? 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => {
                                                            if (fields.length > 1) remove(index);
                                                            else toast.error("At least one item is required");
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ ...DEFAULT_ITEM, product_id: crypto.randomUUID() })}
                                className="gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Item
                            </Button>

                            {/* Summary */}
                            <Separator />
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Discount Amount</Label>
                                        <Input
                                            type="number"
                                            {...register("discount_amount", { valueAsNumber: true })}
                                            min={0}
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Shipping Charges</Label>
                                        <Input
                                            type="number"
                                            {...register("shipping_charges", { valueAsNumber: true })}
                                            min={0}
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Other Charges</Label>
                                        <Input
                                            type="number"
                                            {...register("other_charges", { valueAsNumber: true })}
                                            min={0}
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Round Off</Label>
                                        <Input
                                            type="number"
                                            {...register("round_off", { valueAsNumber: true })}
                                            min={-10}
                                            max={10}
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />
                            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(poTotals.subtotal)}</span>
                                </div>
                                {orderDiscount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(orderDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Tax</span>
                                    <span>{formatCurrency(poTotals.totalTax)}</span>
                                </div>
                                {shippingCharges > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span>{formatCurrency(shippingCharges)}</span>
                                    </div>
                                )}
                                {otherCharges > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Other Charges</span>
                                        <span>{formatCurrency(otherCharges)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Grand Total</span>
                                    <span>{formatCurrency(poTotals.grandTotal)}</span>
                                </div>
                            </div>
                        </TabsContent>

                        {/* === ADDITIONAL TAB === */}
                        <TabsContent value="additional" className="space-y-4 px-1">
                            <div className="space-y-2">
                                <Label>Receiving Warehouse</Label>
                                <Input {...register("receiving_warehouse")} placeholder="Warehouse name or location" />
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    {...register("notes")}
                                    placeholder="Add any general notes..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Terms & Conditions</Label>
                                <Textarea
                                    {...register("terms_and_conditions")}
                                    placeholder="Terms and conditions..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Internal Notes</Label>
                                <Textarea
                                    {...register("internal_notes")}
                                    placeholder="Internal notes (not shared with supplier)..."
                                    rows={2}
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label>Tags</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        placeholder="Add a tag..."
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addTag();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addTag}
                                    >
                                        Add
                                    </Button>
                                </div>
                                {watchedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {watchedTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit(onFormSubmit)}
                        disabled={isSaving}
                    >
                        {isSaving
                            ? "Saving..."
                            : editOrder
                                ? "Update Order"
                                : "Create Order"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
