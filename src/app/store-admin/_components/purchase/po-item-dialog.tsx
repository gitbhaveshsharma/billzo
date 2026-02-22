"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, AlertTriangle } from "lucide-react";

import { createPurchaseOrderItemSchema } from "@/validations/purchase.validation";
import type { CreatePurchaseOrderItemFormData } from "@/validations/purchase.validation";
import { calculateItemTotals, formatCurrency } from "@/utils/purchase.utils";
import { useProductStore } from "@/stores/product.store";
import { useStoreAdmin } from "../../_context/store-admin-context";

// ============================================================================
// TYPES
// ============================================================================

export interface POItemDialogItem extends CreatePurchaseOrderItemFormData {
    // internal key for useFieldArray
    _key?: string;
}

interface POItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** If provided, dialog is in edit mode */
    editItem?: POItemDialogItem | null;
    editIndex?: number | null;
    onSave: (item: POItemDialogItem, index: number | null) => void;
    /** Whether this PO is inter-state (affects IGST vs CGST+SGST split) */
    isInterState?: boolean;
}

// ============================================================================
// FIELD TOOLTIP
// ============================================================================

function FieldTooltip({ content }: { content: string }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1 align-middle shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function FieldLabel({
    children,
    required,
    tooltip,
}: {
    children: React.ReactNode;
    required?: boolean;
    tooltip?: string;
}) {
    return (
        <Label className="flex items-center gap-0.5 text-sm font-medium">
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
            {tooltip && <FieldTooltip content={tooltip} />}
        </Label>
    );
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_VALUES: CreatePurchaseOrderItemFormData = {
    product_id: crypto.randomUUID(),
    product_name: "",
    product_code: "",
    hsn_code: "",
    ordered_quantity: 1,
    unit_price: 0,
    mrp: undefined,
    discount_percentage: 0,
    discount_amount: 0,
    gst_percentage: 18,
    cess_percentage: 0,
    batch_number: "",
    manufacturing_date: "",
    expiry_date: "",
    notes: "",
};

// ============================================================================
// PO ITEM DIALOG
// ============================================================================

export function POItemDialog({
    open,
    onOpenChange,
    editItem,
    editIndex,
    onSave,
    isInterState = false,
}: POItemDialogProps) {
    const { storeId } = useStoreAdmin();
    const { units, fetchUnits } = useProductStore();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreatePurchaseOrderItemFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createPurchaseOrderItemSchema) as any,
        defaultValues: DEFAULT_VALUES,
    });

    // Populate form when editing
    useEffect(() => {
        if (open) {
            if (editItem) {
                reset({ ...editItem });
            } else {
                reset({ ...DEFAULT_VALUES, product_id: crypto.randomUUID() });
            }
        }
    }, [open, editItem, reset]);

    // Fetch units on first open if not already loaded
    useEffect(() => {
        if (open && storeId && units.length === 0) {
            fetchUnits(storeId);
        }
    }, [open, storeId]);  // eslint-disable-line react-hooks/exhaustive-deps

    const activeUnits = units.filter((u) => u.is_active);

    const gstPercentage = watch("gst_percentage");

    // ── Live calculation ──
    const liveCalc = useMemo(() => {
        const qty = watch("ordered_quantity");
        const price = watch("unit_price");
        const disc = watch("discount_percentage") ?? 0;
        const gst = watch("gst_percentage") ?? 0;
        const cess = watch("cess_percentage") ?? 0;

        // Detect which inputs are causing NaN
        const nanFields: string[] = [];
        if (isNaN(Number(qty)) || qty === undefined) nanFields.push("Ordered Qty");
        if (isNaN(Number(price)) || price === undefined) nanFields.push("Unit Price");
        if (isNaN(Number(disc))) nanFields.push("Discount %");
        if (isNaN(Number(gst))) nanFields.push("GST %");
        if (isNaN(Number(cess))) nanFields.push("Cess %");

        if (nanFields.length > 0 || !qty || price === undefined) {
            return { nanFields, totals: null };
        }

        const totals = calculateItemTotals(
            Number(qty),
            Number(price),
            Number(disc),
            Number(gst),
            Number(cess),
            isInterState
        );
        return { nanFields: [], totals };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        watch("ordered_quantity"),
        watch("unit_price"),
        watch("discount_percentage"),
        watch("gst_percentage"),
        watch("cess_percentage"),
        isInterState,
    ]);

    const onFormSubmit = (data: CreatePurchaseOrderItemFormData) => {
        onSave(data as POItemDialogItem, editIndex ?? null);
        onOpenChange(false);
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) reset(DEFAULT_VALUES);
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col ">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
                    <DialogDescription>
                        {editItem
                            ? "Update the details for this line item."
                            : "Fill in the product details. Required fields are marked with *."}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 overflow-x-hidden">
                    <div className="flex flex-col gap-5 py-2 p-4">
                        {/* ── PRODUCT IDENTITY ── */}
                        <section className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Product Identity
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <FieldLabel required tooltip="Full descriptive name of the product as it appears on the invoice or catalogue.">
                                        Product Name
                                    </FieldLabel>
                                    <Input
                                        {...register("product_name")}
                                        placeholder="e.g. Paracetamol 500mg Strip"
                                    />
                                    {errors.product_name && (
                                        <p className="text-xs text-red-500">{errors.product_name.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <FieldLabel required tooltip="SKU or internal product code used for inventory lookup and barcode matching.">
                                        Product Code / SKU
                                    </FieldLabel>
                                    <Input {...register("product_code")} placeholder="e.g. SKU-10023" />
                                    {errors.product_code && (
                                        <p className="text-xs text-red-500">{errors.product_code.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Barcode printed on the product (EAN-13, UPC, Code 128, QR, etc.). Used for fast POS lookup and scanner matching.">
                                        Barcode
                                    </FieldLabel>
                                    <Input
                                        {...register("barcode")}
                                        placeholder="e.g. 8901234567890"
                                        maxLength={50}
                                    />
                                    {errors.barcode && (
                                        <p className="text-xs text-red-500">{errors.barcode.message}</p>
                                    )}
                                </div>
                            </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Harmonized System of Nomenclature code (4–8 digits). Required for GST filing; identifies the category of goods.">
                                        HSN Code
                                    </FieldLabel>
                                    <Input
                                        {...register("hsn_code")}
                                        placeholder="e.g. 30049099"
                                        maxLength={8}
                                    />
                                    {errors.hsn_code && (
                                        <p className="text-xs text-red-500">{errors.hsn_code.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Unit of measure for this item (e.g. Pieces, Kilograms, Box). Managed in your store's Units of Measure settings.">
                                        Unit of Measure
                                    </FieldLabel>
                                    <Select
                                        value={watch("unit_id") ?? ""}
                                        onValueChange={(val) => {
                                            const selected = units.find((u) => u.id === val);
                                            setValue("unit_id", val);
                                            setValue("unit_code", selected?.code ?? "");
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                activeUnits.length === 0
                                                    ? "No units configured"
                                                    : "Select unit…"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeUnits.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    <span className="font-medium">{u.name}</span>
                                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                                        {u.symbol ?? u.code}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                            {activeUnits.length === 0 && (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                                    No active units found for this store.
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.unit_code && (
                                        <p className="text-xs text-red-500">{errors.unit_code.message}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* ── PRICING ── */}
                        <section className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pricing & Quantity
                            </h4>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <FieldLabel required tooltip="Number of units being ordered. Must be ≥ 1.">
                                        Ordered Qty
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        {...register("ordered_quantity", { valueAsNumber: true })}
                                        min={1}
                                        placeholder="1"
                                    />
                                    {errors.ordered_quantity && (
                                        <p className="text-xs text-red-500">{errors.ordered_quantity.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel required tooltip="Price per unit before any tax or discount. This is the base purchase price.">
                                        Unit Price (₹)
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        {...register("unit_price", { valueAsNumber: true })}
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    {errors.unit_price && (
                                        <p className="text-xs text-red-500">{errors.unit_price.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Maximum Retail Price — the highest price at which this can be sold to the end consumer. Optional.">
                                        MRP (₹)
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        {...register("mrp", {
                                            valueAsNumber: true,
                                            setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
                                        })}
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                    {errors.mrp && (
                                        <p className="text-xs text-red-500">{errors.mrp.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <FieldLabel required tooltip="GST rate applicable to this product. Choose from standard slabs: 0%, 5%, 12%, 18%, or 28%.">
                                        GST %
                                    </FieldLabel>
                                    <Select
                                        value={String(gstPercentage ?? 18)}
                                        onValueChange={(val) => setValue("gst_percentage", Number(val))}
                                    >
                                        <SelectTrigger>
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
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Additional cess on top of GST for certain goods like tobacco or luxury items. Usually 0.">
                                        Cess %
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        {...register("cess_percentage", { valueAsNumber: true })}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        placeholder="0"
                                    />
                                    {errors.cess_percentage && (
                                        <p className="text-xs text-red-500">{errors.cess_percentage.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Line-item discount as a percentage of the unit price (0–100%). Applied before tax.">
                                        Discount %
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        {...register("discount_percentage", { valueAsNumber: true })}
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        placeholder="0"
                                    />
                                    {errors.discount_percentage && (
                                        <p className="text-xs text-red-500">{errors.discount_percentage.message}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* ── BATCH / TRACEABILITY ── */}
                        <section className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Batch & Traceability
                            </h4>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Batch or lot number from the manufacturer. Used for traceability, quality checks, and recall management.">
                                        Batch Number
                                    </FieldLabel>
                                    <Input
                                        {...register("batch_number")}
                                        placeholder="e.g. BT-2024-09A"
                                        maxLength={50}
                                    />
                                    {errors.batch_number && (
                                        <p className="text-xs text-red-500">{errors.batch_number.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Date this batch was manufactured. Must be before the expiry date.">
                                        Mfg. Date
                                    </FieldLabel>
                                    <Input
                                        type="date"
                                        {...register("manufacturing_date")}
                                    />
                                    {errors.manufacturing_date && (
                                        <p className="text-xs text-red-500">{errors.manufacturing_date.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel tooltip="Expiry date of this batch. Must be after the manufacturing date. Critical for perishable and pharma products.">
                                        Expiry Date
                                    </FieldLabel>
                                    <Input
                                        type="date"
                                        {...register("expiry_date")}
                                    />
                                    {errors.expiry_date && (
                                        <p className="text-xs text-red-500">{errors.expiry_date.message}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* ── NOTES ── */}
                        <section className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Notes
                            </h4>
                            <div className="space-y-1.5">
                                <FieldLabel tooltip="Any specific notes about this line item, e.g. special handling, quality instructions, or substitution notes. Max 500 characters.">
                                    Item Notes
                                </FieldLabel>
                                <Textarea
                                    {...register("notes")}
                                    placeholder="Optional notes for this item..."
                                    rows={2}
                                />
                                {errors.notes && (
                                    <p className="text-xs text-red-500">{errors.notes.message}</p>
                                )}
                            </div>
                        </section>

                        <Separator />

                        {/* ── LIVE CALCULATION PREVIEW ── */}
                        <section className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Calculation Preview
                            </h4>

                            {/* NaN warning */}
                            {liveCalc.nanFields.length > 0 && (
                                <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-amber-700 dark:text-amber-400">
                                        Grand Total shows <strong>—</strong> because these fields have no valid value yet:
                                        {" "}<strong>{liveCalc.nanFields.join(", ")}</strong>.
                                        Fill them to see the calculated totals.
                                    </span>
                                </div>
                            )}

                            {liveCalc.totals ? (
                                <div className="rounded-lg border bg-muted/30 divide-y text-sm">
                                    {/* Gross */}
                                    <div className="flex justify-between px-3 py-2 text-muted-foreground">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help underline decoration-dotted">Gross Amount</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[200px] text-xs">
                                                    Qty × Unit Price = {watch("ordered_quantity")} × {formatCurrency(watch("unit_price") ?? 0)}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <span>{formatCurrency((watch("ordered_quantity") ?? 0) * (watch("unit_price") ?? 0))}</span>
                                    </div>

                                    {/* Discount */}
                                    {liveCalc.totals.discountAmount > 0 && (
                                        <div className="flex justify-between px-3 py-2 text-red-600 dark:text-red-400">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help underline decoration-dotted">Discount ({watch("discount_percentage")}%)</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[200px] text-xs">
                                                        Line discount applied on gross amount before tax. Reduces the taxable value.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span>− {formatCurrency(liveCalc.totals.discountAmount)}</span>
                                        </div>
                                    )}

                                    {/* Taxable (before GST) */}
                                    <div className="flex justify-between px-3 py-2 font-medium">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help underline decoration-dotted">Taxable Value (Before GST)</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                                    Gross minus discount. This is the amount on which GST is calculated. Also called <em>line_total</em> in the database.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <span className="text-foreground">{formatCurrency(liveCalc.totals.lineTotal)}</span>
                                    </div>

                                    {/* Tax breakdown */}
                                    {isInterState ? (
                                        <div className="flex justify-between px-3 py-2 text-muted-foreground">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help underline decoration-dotted">IGST ({watch("gst_percentage")}%)</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[220px] text-xs">
                                                        Integrated GST — applied on inter-state purchases. Full GST rate goes to IGST (no split). Goes to central government.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span>{formatCurrency(liveCalc.totals.igstAmount)}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between px-3 py-2 text-muted-foreground">
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help underline decoration-dotted">CGST ({(watch("gst_percentage") ?? 0) / 2}%)</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left" className="max-w-[220px] text-xs">
                                                            Central GST — half the GST rate, charged on intra-state purchases. Goes to the central government.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <span>{formatCurrency(liveCalc.totals.cgstAmount)}</span>
                                            </div>
                                            <div className="flex justify-between px-3 py-2 text-muted-foreground">
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help underline decoration-dotted">SGST ({(watch("gst_percentage") ?? 0) / 2}%)</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left" className="max-w-[220px] text-xs">
                                                            State GST — half the GST rate, charged on intra-state purchases. Goes to the state government.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <span>{formatCurrency(liveCalc.totals.sgstAmount)}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Cess */}
                                    {liveCalc.totals.cessAmount > 0 && (
                                        <div className="flex justify-between px-3 py-2 text-muted-foreground">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help underline decoration-dotted">Cess ({watch("cess_percentage")}%)</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[220px] text-xs">
                                                        Additional levy on top of GST for specific goods (tobacco, luxury, coal). Added after GST is computed.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span>{formatCurrency(liveCalc.totals.cessAmount)}</span>
                                        </div>
                                    )}

                                    {/* Total tax */}
                                    <div className="flex justify-between px-3 py-2 text-muted-foreground">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help underline decoration-dotted">Total Tax</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[200px] text-xs">
                                                    Sum of all tax components: {isInterState ? "IGST" : "CGST + SGST"}{liveCalc.totals.cessAmount > 0 ? " + Cess" : ""}.
                                                    Stored as <em>tax_amount</em> in the database.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <span>{formatCurrency(liveCalc.totals.taxAmount)}</span>
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-between px-3 py-2.5 font-bold text-base bg-muted/50 rounded-b-lg">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help underline decoration-dotted">Line Total (incl. tax)</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[220px] text-xs">
                                                    Taxable Value + Total Tax. This is the amount posted as <em>total_amount</em> for this line item in the database.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <span>{formatCurrency(liveCalc.totals.totalAmount)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                                    Enter Qty and Unit Price to see calculation.
                                </div>
                            )}
                        </section>
                    </div>
                </ScrollArea>

                <DialogFooter className="shrink-0 pt-2">
                    <Button variant="outline" onClick={() => handleClose(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit(onFormSubmit)}>
                        {editItem ? "Update Item" : "Add Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}