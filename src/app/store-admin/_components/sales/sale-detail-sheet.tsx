"use client";

import { useEffect } from "react";
import {
    Clock,
    Calendar,
    User,
    Banknote,
    CreditCard,
    Receipt,
    Package,
    Tag,
    ArrowDownLeft,
    Printer,
    Ban,
    RotateCcw,
    Plus,
    FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
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
import type {
    EnrichedSale,
    SaleItem,
    SalePayment,
    SaleReturn,
} from "@/types/sales.types";
import {
    getSaleStatusLabel,
    getSaleStatusColor,
    getPaymentMethodLabel,
    getPaymentMethodColor,
    getReturnStatusLabel,
    getReturnStatusColor,
    getPaymentRecordStatusLabel,
    getPaymentRecordStatusColor,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTime,
    canAddPayment,
    canCancelSale,
    canCreateReturn,
} from "@/utils/sales.utils";
import { useSalesStore } from "@/stores/sales.store";

// ============================================================================
// TYPES
// ============================================================================

interface SaleDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    saleId: string | null;
    onPrint?: (saleId: string) => void;
    onAddPayment?: (sale: EnrichedSale) => void;
    onProcessReturn?: (sale: EnrichedSale) => void;
    onCancelSale?: (sale: EnrichedSale) => void;
}

// ============================================================================
// INFO ROW
// ============================================================================

function InfoRow({
    label,
    value,
    icon,
    tooltip,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    tooltip?: string;
}) {
    return (
        <div className="flex items-start gap-2 py-1.5">
            {icon && (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-muted-foreground mt-0.5 cursor-default">
                                {icon}
                            </span>
                        </TooltipTrigger>
                        {tooltip && (
                            <TooltipContent side="right" className="text-xs">
                                {tooltip}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="text-sm font-medium truncate">{value || "—"}</p>
            </div>
        </div>
    );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function DetailSkeleton() {
    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-2">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                ))}
            </div>
            <Skeleton className="h-32 w-full" />
        </div>
    );
}

// ============================================================================
// ITEMS TAB
// ============================================================================

function ItemsTab({ items }: { items: SaleItem[] }) {
    return (
        <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                        <TableHead className="text-xs text-right">Disc</TableHead>
                        <TableHead className="text-xs text-right">Tax</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow
                            key={item.id}
                            className={item.is_void ? "opacity-50 line-through" : ""}
                        >
                            <TableCell className="text-xs">
                                <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-muted-foreground">{item.product_code}</p>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs text-right">
                                {item.quantity}
                                {item.returned_quantity > 0 && (
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-red-500 ml-1 cursor-default">
                                                    (-{item.returned_quantity})
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-xs">
                                                {item.returned_quantity} unit(s) have been returned
                                                for this item
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                                {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                                {item.discount_total > 0
                                    ? formatCurrency(item.discount_total)
                                    : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                                {formatCurrency(item.tax_amount)}
                                <p className="text-muted-foreground text-[10px]">
                                    {item.gst_percentage}%
                                </p>
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">
                                {formatCurrency(item.total_amount)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="text-center text-xs text-muted-foreground py-6"
                            >
                                No items
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// ============================================================================
// PAYMENTS TAB
// ============================================================================

function PaymentsTab({ payments }: { payments: SalePayment[] }) {
    return (
        <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Reference</TableHead>
                        <TableHead className="text-xs">Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell className="text-xs">
                                <Badge
                                    variant="outline"
                                    className={getPaymentMethodColor(payment.payment_method)}
                                >
                                    {getPaymentMethodLabel(payment.payment_method)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">
                                {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-xs">
                                <Badge
                                    variant="secondary"
                                    className={getPaymentRecordStatusColor(payment.status)}
                                >
                                    {getPaymentRecordStatusLabel(payment.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {payment.upi_ref_number ||
                                    (payment.card_last_four
                                        ? `****${payment.card_last_four}`
                                        : payment.cheque_number ||
                                          payment.bank_reference ||
                                          payment.transaction_id ||
                                          "—")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {formatTime(payment.payment_at)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {payments.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={5}
                                className="text-center text-xs text-muted-foreground py-6"
                            >
                                No payments recorded
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// ============================================================================
// RETURNS TAB
// ============================================================================

function ReturnsTab({ returns }: { returns: SaleReturn[] }) {
    return (
        <div className="space-y-3">
            {returns.map((ret) => (
                <div key={ret.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{ret.return_number}</span>
                        <Badge
                            variant="secondary"
                            className={getReturnStatusColor(ret.status)}
                        >
                            {getReturnStatusLabel(ret.status)}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <p className="text-muted-foreground">Date</p>
                        <p>{formatDate(ret.return_date)}</p>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium">{formatCurrency(ret.total_returned)}</p>
                        <p className="text-muted-foreground">Reason</p>
                        <p>{ret.return_reason}</p>
                        {ret.refund_method && (
                            <>
                                <p className="text-muted-foreground">Refund Method</p>
                                <p>{getPaymentMethodLabel(ret.refund_method)}</p>
                            </>
                        )}
                        {ret.credit_note_number && (
                            <>
                                <p className="text-muted-foreground">Credit Note</p>
                                <p>{ret.credit_note_number}</p>
                            </>
                        )}
                    </div>
                </div>
            ))}
            {returns.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">No returns</p>
            )}
        </div>
    );
}

// ============================================================================
// SALE DETAIL SHEET
// ============================================================================

export function SaleDetailSheet({
    open,
    onOpenChange,
    storeId,
    saleId,
    onPrint,
    onAddPayment,
    onProcessReturn,
    onCancelSale,
}: SaleDetailSheetProps) {
    const { currentSale, isLoading, fetchSaleById } = useSalesStore();

    useEffect(() => {
        if (open && saleId && storeId) {
            fetchSaleById(storeId, saleId);
        }
    }, [open, saleId, storeId, fetchSaleById]);

    const sale = currentSale;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-3xl p-0">
                <SheetHeader className="p-4 pb-0">
                    <SheetTitle className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Sale Details
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground text-sm">
                        {sale?.invoice_number || "Loading..."}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-4 space-y-4">
                        {isLoading || !sale ? (
                            <DetailSkeleton />
                        ) : (
                            <>
                                {/* Header with status */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold">
                                        {sale.invoice_number}
                                    </h3>
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge
                                                    variant="secondary"
                                                    className={`cursor-default ${getSaleStatusColor(sale.status)}`}
                                                >
                                                    {getSaleStatusLabel(sale.status)}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-xs max-w-[200px] text-center">
                                                {sale.status === "COMPLETED" &&
                                                    "This sale has been fully paid and completed."}
                                                {sale.status === "DRAFT" &&
                                                    "This sale is still being prepared and not yet finalized."}
                                                {sale.status === "HOLD" &&
                                                    "This sale is on hold and awaiting confirmation."}
                                                {sale.status === "PARTIAL_PAID" &&
                                                    "This sale has been partially paid. A balance is still due."}
                                                {sale.status === "CANCELLED" &&
                                                    "This sale has been cancelled and is no longer active."}
                                                {sale.status === "CREDIT" &&
                                                    "This is a credit sale — payment is due at a later date."}
                                                {sale.status === "PARTIAL_RETURN" &&
                                                    "Some items from this sale have been returned."}
                                                {sale.status === "FULLY_RETURNED" &&
                                                    "All items from this sale have been returned."}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>

                                {/* Sale Info */}
                                <div className="grid grid-cols-2 gap-x-4">
                                    <InfoRow
                                        label="Date"
                                        value={formatDate(sale.sale_date)}
                                        icon={<Calendar className="h-3.5 w-3.5" />}
                                        tooltip="The date this sale was created"
                                    />
                                    <InfoRow
                                        label="Time"
                                        value={formatTime(sale.sale_time)}
                                        icon={<Clock className="h-3.5 w-3.5" />}
                                        tooltip="The time this sale was recorded"
                                    />
                                    <InfoRow
                                        label="Customer"
                                        value={
                                            sale.customer_name
                                                ? `${sale.customer_name}${sale.customer_phone ? ` (${sale.customer_phone})` : ""}`
                                                : "Walk-in"
                                        }
                                        icon={<User className="h-3.5 w-3.5" />}
                                        tooltip="Customer associated with this sale. Walk-in means no account was linked."
                                    />
                                    <InfoRow
                                        label="Cashier"
                                        value={sale.cashier_name || "—"}
                                        icon={<User className="h-3.5 w-3.5" />}
                                        tooltip="The staff member who processed this sale"
                                    />
                                    {sale.customer_gstin && (
                                        <InfoRow
                                            label="GSTIN"
                                            value={sale.customer_gstin}
                                            icon={<FileText className="h-3.5 w-3.5" />}
                                            tooltip="Customer's GST Identification Number used for tax invoicing"
                                        />
                                    )}
                                    <InfoRow
                                        label="GST Type"
                                        value={`${sale.gst_type} (${sale.is_interstate ? "Interstate" : "Intrastate"})`}
                                        icon={<Tag className="h-3.5 w-3.5" />}
                                        tooltip={
                                            sale.is_interstate
                                                ? "Interstate sale — IGST applies since buyer and seller are in different states."
                                                : "Intrastate sale — CGST + SGST apply since buyer and seller are in the same state."
                                        }
                                    />
                                </div>

                                <Separator />

                                {/* Amount Summary */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatCurrency(sale.subtotal)}</span>
                                    </div>
                                    {sale.discount_total > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Discount</span>
                                            <span className="text-red-500">
                                                -{formatCurrency(sale.discount_total)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Tax</span>
                                        <span>{formatCurrency(sale.tax_amount)}</span>
                                    </div>
                                    {sale.round_off !== 0 && (
                                        <div className="flex justify-between text-xs">
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-muted-foreground underline decoration-dotted cursor-default">
                                                            Round Off
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">
                                                        Small adjustment to round the total to the
                                                        nearest whole number
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span>{formatCurrency(sale.round_off)}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between text-sm font-bold">
                                        <span>Total</span>
                                        <span>{formatCurrency(sale.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Paid</span>
                                        <span className="text-green-600 font-medium">
                                            {formatCurrency(sale.paid_amount)}
                                        </span>
                                    </div>
                                    {sale.due_amount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-muted-foreground underline decoration-dotted cursor-default">
                                                            Due
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">
                                                        Remaining unpaid balance on this sale
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span className="text-red-500 font-medium">
                                                {formatCurrency(sale.due_amount)}
                                            </span>
                                        </div>
                                    )}
                                    {sale.change_amount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-muted-foreground underline decoration-dotted cursor-default">
                                                            Change
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">
                                                        Cash returned to the customer after
                                                        overpayment
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <span>{formatCurrency(sale.change_amount)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Tax Breakdown */}
                                {sale.tax_amount > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Tax Breakdown
                                            </p>
                                            {sale.cgst_amount > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="underline decoration-dotted cursor-default">
                                                                    CGST
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs">
                                                                Central Goods & Services Tax —
                                                                collected by the central government
                                                                on intrastate sales
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <span>{formatCurrency(sale.cgst_amount)}</span>
                                                </div>
                                            )}
                                            {sale.sgst_amount > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="underline decoration-dotted cursor-default">
                                                                    SGST
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs">
                                                                State Goods & Services Tax —
                                                                collected by the state government
                                                                on intrastate sales
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <span>{formatCurrency(sale.sgst_amount)}</span>
                                                </div>
                                            )}
                                            {sale.igst_amount > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="underline decoration-dotted cursor-default">
                                                                    IGST
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs">
                                                                Integrated Goods & Services Tax —
                                                                applied on interstate sales
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <span>{formatCurrency(sale.igst_amount)}</span>
                                                </div>
                                            )}
                                            {sale.cess_amount > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="underline decoration-dotted cursor-default">
                                                                    Cess
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs">
                                                                Additional surcharge levied on
                                                                certain goods over and above GST
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <span>{formatCurrency(sale.cess_amount)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Credit info */}
                                {sale.is_credit_sale && (
                                    <>
                                        <Separator />
                                        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-md p-2 text-xs space-y-1">
                                            <p className="font-medium">Credit Sale</p>
                                            {sale.credit_due_date && (
                                                <p className="text-muted-foreground">
                                                    Due Date: {formatDate(sale.credit_due_date)}
                                                </p>
                                            )}
                                            <p className="font-medium text-red-600">
                                                Outstanding: {formatCurrency(sale.due_amount)}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Notes */}
                                {(sale.notes || sale.internal_notes) && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            {sale.notes && (
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        Notes
                                                    </p>
                                                    <p className="text-xs">{sale.notes}</p>
                                                </div>
                                            )}
                                            {sale.internal_notes && (
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        Internal Notes
                                                    </p>
                                                    <p className="text-xs">{sale.internal_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Cancellation info */}
                                {sale.status === "CANCELLED" && (
                                    <>
                                        <Separator />
                                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md p-2 text-xs space-y-1">
                                            <p className="font-medium text-red-600">
                                                Sale Cancelled
                                            </p>
                                            {sale.cancellation_reason && (
                                                <p>Reason: {sale.cancellation_reason}</p>
                                            )}
                                            {sale.cancelled_at && (
                                                <p className="text-muted-foreground">
                                                    At: {formatDateTime(sale.cancelled_at)}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                <Separator />

                                {/* Tabs: Items / Payments / Returns */}
                                <Tabs defaultValue="items">
                                    <TabsList className="w-full">
                                        <TabsTrigger value="items" className="flex-1 text-xs">
                                            <Package className="h-3 w-3 mr-1" />
                                            Items ({sale.items?.length ?? 0})
                                        </TabsTrigger>
                                        <TabsTrigger value="payments" className="flex-1 text-xs">
                                            <Banknote className="h-3 w-3 mr-1" />
                                            Payments ({sale.payments?.length ?? 0})
                                        </TabsTrigger>
                                        <TabsTrigger value="returns" className="flex-1 text-xs">
                                            <ArrowDownLeft className="h-3 w-3 mr-1" />
                                            Returns ({sale.returns?.length ?? 0})
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="items" className="mt-3">
                                        <ItemsTab items={sale.items || []} />
                                    </TabsContent>
                                    <TabsContent value="payments" className="mt-3">
                                        <PaymentsTab payments={sale.payments || []} />
                                    </TabsContent>
                                    <TabsContent value="returns" className="mt-3">
                                        <ReturnsTab returns={sale.returns || []} />
                                    </TabsContent>
                                </Tabs>

                                {/* Action Buttons */}
                                <TooltipProvider delayDuration={300}>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {onPrint && sale.status === "COMPLETED" && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs gap-1"
                                                        onClick={() => onPrint(sale.id)}
                                                    >
                                                        <Printer className="h-3 w-3" />
                                                        Print Receipt
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs max-w-[180px] text-center">
                                                    Print or download a receipt for this completed
                                                    sale
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {onAddPayment &&
                                            canAddPayment(sale) &&
                                            sale.due_amount > 0 && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs gap-1"
                                                            onClick={() => onAddPayment(sale)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            Record Payment
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs max-w-[200px] text-center">
                                                        Record an additional payment to clear the
                                                        outstanding balance of{" "}
                                                        {formatCurrency(sale.due_amount)}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                        {onProcessReturn && canCreateReturn(sale) && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs gap-1"
                                                        onClick={() => onProcessReturn(sale)}
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        Process Return
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs max-w-[200px] text-center">
                                                    Initiate a return for one or more items in this
                                                    sale and issue a refund or credit note
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {onCancelSale && canCancelSale(sale) && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs gap-1 text-red-600 hover:text-red-700"
                                                        onClick={() => onCancelSale(sale)}
                                                    >
                                                        <Ban className="h-3 w-3" />
                                                        Cancel Sale
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs max-w-[200px] text-center">
                                                    Permanently cancel this sale. This action cannot
                                                    be undone.
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </TooltipProvider>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}