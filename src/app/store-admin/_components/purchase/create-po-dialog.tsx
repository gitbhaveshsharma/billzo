"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, Pencil, PackagePlus } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

import { createPurchaseOrderSchema } from "@/validations/purchase.validation";
import type { CreatePurchaseOrderFormData } from "@/validations/purchase.validation";
import type { EnrichedPurchaseOrder, CreatePurchaseOrderRequest } from "@/types/purchase.types";
import { calculateItemTotals, calculatePOTotals, formatCurrency } from "@/utils/purchase.utils";
import { useSupplierStore } from "@/stores/supplier.store";
import { POItemDialog, type POItemDialogItem } from "./po-item-dialog";

// ============================================================================
// TYPES
// ============================================================================

interface CreatePODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    editOrder?: EnrichedPurchaseOrder | null;
    onSubmit: (data: CreatePurchaseOrderRequest) => Promise<boolean>;
    isSaving: boolean;
}

// ============================================================================
// FIELD TOOLTIP (shared small helper)
// ============================================================================

function FieldTooltip({ content }: { content: string }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1 align-middle" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ============================================================================
// DEFAULT ITEM SHAPE
// ============================================================================

function makeDefaultItem() {
    return {
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
        manufacturing_date: "",
        expiry_date: "",
        notes: "",
    };
}

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
    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<POItemDialogItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
            items: [],
        },
    });

    const { fields, append, remove, update } = useFieldArray({
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

    // ── Populate form when editing ──
    useEffect(() => {
        if (!open) return;
        if (editOrder) {
            setActiveTab("details");
            reset({
                supplier_id: editOrder.supplier_id,
                supplier_name: editOrder.supplier_name,
                supplier_gstin: editOrder.supplier_gstin ?? "",
                order_date: editOrder.order_date,
                expected_delivery_date: editOrder.expected_delivery_date ?? "",
                invoice_number: editOrder.invoice_number ?? "",
                reference_number: editOrder.reference_number ?? "",
                invoice_date: editOrder.invoice_date ?? "",
                discount_amount: editOrder.discount_amount ?? 0,
                discount_percentage: editOrder.discount_percentage ?? 0,
                shipping_charges: editOrder.shipping_charges ?? 0,
                other_charges: editOrder.other_charges ?? 0,
                round_off: editOrder.round_off ?? 0,
                is_inter_state: editOrder.is_inter_state ?? false,
                place_of_supply: editOrder.place_of_supply ?? "",
                receiving_warehouse: editOrder.receiving_warehouse ?? "",
                notes: editOrder.notes ?? "",
                terms_and_conditions: editOrder.terms_and_conditions ?? "",
                internal_notes: editOrder.internal_notes ?? "",
                tags: editOrder.tags ?? [],
                items: (editOrder.items ?? []).map((item) => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_code: item.product_code ?? "",
                    barcode: item.barcode ?? "",
                    hsn_code: item.hsn_code ?? "",
                    unit_id: item.unit_id ?? "",
                    unit_code: item.unit_code ?? "",
                    ordered_quantity: item.ordered_quantity,
                    unit_price: item.unit_price,
                    mrp: item.mrp ?? undefined,
                    discount_percentage: item.discount_percentage ?? 0,
                    discount_amount: 0,
                    gst_percentage: item.gst_percentage ?? 18,
                    cess_percentage: item.cess_percentage ?? 0,
                    batch_number: item.batch_number ?? "",
                    manufacturing_date: item.manufacturing_date ?? "",
                    expiry_date: item.expiry_date ?? "",
                    notes: item.notes ?? "",
                })),
            });
        }
    }, [open, editOrder, reset]);

    // ── Supplier handler ──
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

    // ── Item dialog handlers ──
    const openAddItem = () => {
        setEditingItem(null);
        setEditingIndex(null);
        setItemDialogOpen(true);
    };

    const openEditItem = (index: number) => {
        setEditingItem(watchedItems[index] as POItemDialogItem);
        setEditingIndex(index);
        setItemDialogOpen(true);
    };

    const handleItemSave = (item: POItemDialogItem, index: number | null) => {
        if (index === null) {
            append(item);
        } else {
            update(index, item);
        }
        setItemDialogOpen(false);
    };

    // ── Form submit ──
    const onFormSubmit = async (data: CreatePurchaseOrderFormData) => {
        if (data.items.length === 0) {
            toast.error("Please add at least one item before submitting.");
            setActiveTab("items");
            return;
        }

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
                barcode: item.barcode || undefined,
                hsn_code: item.hsn_code || undefined,
                unit_id: item.unit_id || undefined,
                unit_code: item.unit_code || undefined,
                ordered_quantity: item.ordered_quantity,
                unit_price: item.unit_price,
                mrp: item.mrp ?? undefined,
                discount_percentage: item.discount_percentage,
                gst_percentage: item.gst_percentage,
                cess_percentage: item.cess_percentage,
                batch_number: item.batch_number || undefined,
                manufacturing_date: item.manufacturing_date || undefined,
                expiry_date: item.expiry_date || undefined,
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

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            reset();
            setActiveTab("details");
        }
        onOpenChange(isOpen);
    };

    // ── Tags ──
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
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
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
                                Items
                                {fields.length > 0 && (
                                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                                        {fields.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="additional">Additional</TabsTrigger>
                        </TabsList>

                        <ScrollArea className="flex-1 min-h-0 overflow-x-hidden">
                            {/* ══════════════════════════════════════════
                                DETAILS TAB
                            ══════════════════════════════════════════ */}
                            <TabsContent value="details" className="space-y-4 p-4">
                                {/* Supplier */}
                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Supplier <span className="text-red-500 ml-0.5">*</span>
                                        <FieldTooltip content="Select the supplier from whom you're purchasing goods. Must be pre-registered in the system." />
                                    </Label>
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
                                        <p className="text-xs text-red-500">{errors.supplier_id.message}</p>
                                    )}
                                </div>

                                {/* GSTIN */}
                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Supplier GSTIN
                                        <FieldTooltip content="15-character GST Identification Number of the supplier. Auto-filled from supplier profile; editable if needed." />
                                    </Label>
                                    <Input {...register("supplier_gstin")} placeholder="e.g. 29AAACB1234F1Z5" />
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center">
                                            Order Date <span className="text-red-500 ml-0.5">*</span>
                                            <FieldTooltip content="The date this purchase order is raised. Defaults to today." />
                                        </Label>
                                        <Input type="date" {...register("order_date")} />
                                        {errors.order_date && (
                                            <p className="text-xs text-red-500">{errors.order_date.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center">
                                            Expected Delivery
                                            <FieldTooltip content="Expected goods delivery date. Must be on or after the order date." />
                                        </Label>
                                        <Input type="date" {...register("expected_delivery_date")} />
                                        {errors.expected_delivery_date && (
                                            <p className="text-xs text-red-500">
                                                {errors.expected_delivery_date.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Invoice & Reference */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center">
                                            Invoice Number
                                            <FieldTooltip content="Supplier's invoice number for this purchase. Used for reconciliation. Max 50 characters." />
                                        </Label>
                                        <Input {...register("invoice_number")} placeholder="INV-001" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center">
                                            Reference Number
                                            <FieldTooltip content="Your internal reference or PO number for tracking this order. Max 50 characters." />
                                        </Label>
                                        <Input {...register("reference_number")} placeholder="REF-001" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Invoice Date
                                        <FieldTooltip content="The date on the supplier's invoice, which may differ from the order date." />
                                    </Label>
                                    <Input type="date" {...register("invoice_date")} />
                                </div>

                                {/* Inter-state toggle */}
                                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                                    <div>
                                        <Label className="flex items-center gap-1">
                                            Inter-State Supply
                                            <FieldTooltip content="Enable if the supplier is in a different state. Applies IGST instead of CGST + SGST." />
                                        </Label>
                                        <p className="text-muted-foreground text-xs mt-0.5">
                                            Enable for IGST instead of CGST+SGST
                                        </p>
                                    </div>
                                    <Switch
                                        checked={isInterState}
                                        onCheckedChange={(checked) => setValue("is_inter_state", checked)}
                                    />
                                </div>

                                {isInterState && (
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center">
                                            Place of Supply
                                            <FieldTooltip content="State where goods are being supplied. Required for inter-state GST compliance." />
                                        </Label>
                                        <Input
                                            {...register("place_of_supply")}
                                            placeholder="e.g. Maharashtra"
                                        />
                                    </div>
                                )}
                            </TabsContent>

                            {/* ══════════════════════════════════════════
                                ITEMS TAB
                            ══════════════════════════════════════════ */}
                            <TabsContent value="items" className="space-y-4 p-4">
                                {errors.items?.message && (
                                    <p className="text-sm text-red-500">{errors.items.message}</p>
                                )}

                                {/* Empty state */}
                                {fields.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-12 gap-3 text-center">
                                        <PackagePlus className="h-10 w-10 text-muted-foreground/40" />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">No items added yet</p>
                                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                                                Click &quot;Add Item&quot; to start adding products to this order.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={openAddItem}
                                            className="gap-1.5 mt-1"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add First Item
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Items summary table — clean, readable */}
                                        <div className="rounded-md border overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                        <TableHead className="w-[40px] text-center">#</TableHead>
                                                        <TableHead>Product</TableHead>
                                                        <TableHead className="w-[90px] text-center">Qty</TableHead>
                                                        <TableHead className="w-[100px] text-right">Unit Price</TableHead>
                                                        <TableHead className="w-[70px] text-center">GST</TableHead>
                                                        <TableHead className="w-[80px] text-center">Disc %</TableHead>
                                                        <TableHead className="w-[120px] text-right">Amount</TableHead>
                                                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {fields.map((field, index) => {
                                                        const item = watchedItems[index];
                                                        const totals = itemTotals[index];
                                                        return (
                                                            <TableRow key={field.id} className="group">
                                                                <TableCell className="text-center text-muted-foreground text-sm">
                                                                    {index + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-sm font-medium leading-tight">
                                                                            {item?.product_name || (
                                                                                <span className="text-muted-foreground italic">Unnamed product</span>
                                                                            )}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            {item?.product_code && (
                                                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded">
                                                                                    {item.product_code}
                                                                                </span>
                                                                            )}
                                                                            {item?.hsn_code && (
                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                    HSN: {item.hsn_code}
                                                                                </span>
                                                                            )}
                                                                            {item?.barcode && (
                                                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded">
                                                                                    {item.barcode}
                                                                                </span>
                                                                            )}
                                                                            {item?.unit_code && (
                                                                                <span className="text-[10px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded dark:bg-purple-950 dark:text-purple-300">
                                                                                    {item.unit_code}
                                                                                </span>
                                                                            )}
                                                                            {item?.batch_number && (
                                                                                <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded dark:bg-blue-950 dark:text-blue-300">
                                                                                    Batch: {item.batch_number}
                                                                                </span>
                                                                            )}
                                                                            {item?.expiry_date && (
                                                                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded dark:bg-amber-950 dark:text-amber-300">
                                                                                    Exp: {item.expiry_date}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm">
                                                                    {item?.ordered_quantity ?? 0}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm">
                                                                    {formatCurrency(item?.unit_price ?? 0)}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm">
                                                                    {item?.gst_percentage ?? 0}%
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm">
                                                                    {item?.discount_percentage
                                                                        ? `${item.discount_percentage}%`
                                                                        : "—"}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm font-medium">
                                                                    {formatCurrency(totals?.totalAmount ?? 0)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 opacity-60 hover:opacity-100"
                                                                            onClick={() => openEditItem(index)}
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 opacity-60 hover:opacity-100"
                                                                            onClick={() => {
                                                                                if (fields.length > 1) remove(index);
                                                                                else toast.error("At least one item is required.");
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={openAddItem}
                                            className="gap-1.5"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Another Item
                                        </Button>
                                    </>
                                )}

                                {/* Order-level charges */}
                                {fields.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center text-sm">
                                                    Discount Amount (₹)
                                                    <FieldTooltip content="Order-level discount deducted from the subtotal after all line items are summed." />
                                                </Label>
                                                <Input
                                                    type="number"
                                                    {...register("discount_amount", { valueAsNumber: true })}
                                                    min={0}
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center text-sm">
                                                    Shipping Charges (₹)
                                                    <FieldTooltip content="Freight or delivery charges billed by the supplier. Added to the order total." />
                                                </Label>
                                                <Input
                                                    type="number"
                                                    {...register("shipping_charges", { valueAsNumber: true })}
                                                    min={0}
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center text-sm">
                                                    Other Charges (₹)
                                                    <FieldTooltip content="Miscellaneous charges such as handling fees, insurance, or packing." />
                                                </Label>
                                                <Input
                                                    type="number"
                                                    {...register("other_charges", { valueAsNumber: true })}
                                                    min={0}
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center text-sm">
                                                    Round Off (₹)
                                                    <FieldTooltip content="Small adjustment between -₹10 and +₹10 to round the grand total to a clean figure." />
                                                </Label>
                                                <Input
                                                    type="number"
                                                    {...register("round_off", { valueAsNumber: true })}
                                                    min={-10}
                                                    max={10}
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>

                                        {/* Order summary */}
                                        <Separator />
                                        <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Subtotal</span>
                                                <span className="text-foreground">{formatCurrency(poTotals.subtotal)}</span>
                                            </div>
                                            {orderDiscount > 0 && (
                                                <div className="flex justify-between text-red-600">
                                                    <span>Discount</span>
                                                    <span>− {formatCurrency(orderDiscount)}</span>
                                                </div>
                                            )}
                                            {isInterState ? (
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>IGST</span>
                                                    <span className="text-foreground">{formatCurrency(poTotals.igstTotal)}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>CGST</span>
                                                        <span className="text-foreground">{formatCurrency(poTotals.cgstTotal)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>SGST</span>
                                                        <span className="text-foreground">{formatCurrency(poTotals.sgstTotal)}</span>
                                                    </div>
                                                </>
                                            )}
                                            {poTotals.cessTotal > 0 && (
                                                <div className= "flex justify-between text-muted-foreground">
                                                    <span>Cess</span>
                                                    <span className="text-foreground">{formatCurrency(poTotals.cessTotal)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-muted-foreground font-medium">
                                                <span>Total Tax</span>
                                                <span className="text-foreground">{formatCurrency(poTotals.totalTax)}</span>
                                            </div>
                                            {shippingCharges > 0 && (
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Shipping</span>
                                                    <span className="text-foreground">{formatCurrency(shippingCharges)}</span>
                                                </div>
                                            )}
                                            {otherCharges > 0 && (
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Other Charges</span>
                                                    <span className="text-foreground">{formatCurrency(otherCharges)}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between font-bold text-base pt-0.5">
                                                <span>Grand Total</span>
                                                <span>{formatCurrency(poTotals.grandTotal)}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* ══════════════════════════════════════════
                                ADDITIONAL TAB
                            ══════════════════════════════════════════ */}
                            <TabsContent value="additional" className="space-y-4 p-4">
                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Receiving Warehouse
                                        <FieldTooltip content="Name or location of the warehouse where goods will be delivered. Used for routing and stock placement." />
                                    </Label>
                                    <Input
                                        {...register("receiving_warehouse")}
                                        placeholder="Warehouse name or location"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Notes
                                        <FieldTooltip content="General notes about this purchase order. May be shared with the supplier. Max 2000 characters." />
                                    </Label>
                                    <Textarea
                                        {...register("notes")}
                                        placeholder="Add any general notes..."
                                        rows={3}
                                    />
                                    {errors.notes && (
                                        <p className="text-xs text-red-500">{errors.notes.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Terms & Conditions
                                        <FieldTooltip content="Payment due dates, return policies, and delivery conditions. Max 5000 characters." />
                                    </Label>
                                    <Textarea
                                        {...register("terms_and_conditions")}
                                        placeholder="Terms and conditions..."
                                        rows={3}
                                    />
                                    {errors.terms_and_conditions && (
                                        <p className="text-xs text-red-500">
                                            {errors.terms_and_conditions.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Internal Notes
                                        <FieldTooltip content="Private notes visible only to your team. Not shared with the supplier. Max 2000 characters." />
                                    </Label>
                                    <Textarea
                                        {...register("internal_notes")}
                                        placeholder="Internal notes (not shared with supplier)..."
                                        rows={2}
                                    />
                                    {errors.internal_notes && (
                                        <p className="text-xs text-red-500">{errors.internal_notes.message}</p>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="space-y-1.5">
                                    <Label className="flex items-center">
                                        Tags
                                        <FieldTooltip content="Add up to 20 tags to categorize this order for filtering and reporting. Press Enter or click Add." />
                                    </Label>
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
                        <Button onClick={handleSubmit(onFormSubmit)} disabled={isSaving}>
                            {isSaving
                                ? "Saving..."
                                : editOrder
                                    ? "Update Order"
                                    : "Create Order"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Item sub-dialog ── */}
            <POItemDialog
                open={itemDialogOpen}
                onOpenChange={setItemDialogOpen}
                storeId={storeId}
                editItem={editingItem}
                editIndex={editingIndex}
                onSave={handleItemSave}
                isInterState={isInterState}
            />
        </>
    );
}