"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Eye,
    Package,
    CreditCard,
    Undo2,
    Pencil,
    Plus,
    Calendar,
    MapPin,
    FileText,
    Hash,
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

import type {
    EnrichedPurchaseOrder,
    PurchaseOrderItem,
    PurchasePayment,
    PurchaseReturn,
} from "@/types/purchase.types";
import {
    getPOStatusLabel,
    getPOStatusColor,
    getPaymentStatusLabel,
    getPaymentStatusColor,
    getPaymentMethodLabel,
    getPOItemStatusLabel,
    getPOItemStatusColor,
    getReturnStatusLabel,
    getReturnStatusColor,
    getRefundStatusLabel,
    formatCurrency,
    formatDate,
    formatQuantity,
    formatGstSummary,
    canReceiveItems,
    canAddPayment,
    canCreateReturn,
    canEditPO,
} from "@/utils/purchase.utils";
import { usePurchaseStore } from "@/stores/purchase.store";

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    orderId: string | null;
    onEdit: () => void;
    onReceive: () => void;
    onAddPayment: () => void;
    onCreateReturn: () => void;
}

// ============================================================================
// INFO ROW
// ============================================================================

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 py-1.5">
            {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
            <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">{label}</p>
                <div className="text-sm font-medium truncate">{value || "—"}</div>
            </div>
        </div>
    );
}

// ============================================================================
// ITEMS TAB
// ============================================================================

function ItemsTab({ items }: { items: PurchaseOrderItem[] }) {
    if (!items.length) {
        return <p className="text-muted-foreground text-sm py-4 text-center">No items found</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rcvd</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div>
                                    <p className="font-medium text-sm">{item.product_name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {item.product_code}
                                        {item.hsn_code ? ` | HSN: ${item.hsn_code}` : ""}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                {formatQuantity(item.ordered_quantity, item.unit_code)}
                            </TableCell>
                            <TableCell className="text-right">
                                {formatQuantity(item.received_quantity, item.unit_code)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                                {formatCurrency(item.unit_price)}
                                {item.discount_percentage > 0 && (
                                    <span className="text-green-600 text-xs block">
                                        -{item.discount_percentage}%
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                                {formatCurrency(item.tax_amount)}
                                <span className="text-muted-foreground text-xs block">
                                    @{item.gst_percentage}%
                                </span>
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                                {formatCurrency(item.total_amount)}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="secondary"
                                    className={`text-xs ${getPOItemStatusColor(item.item_status)}`}
                                >
                                    {getPOItemStatusLabel(item.item_status)}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ============================================================================
// PAYMENTS TAB
// ============================================================================

function PaymentsTab({
    payments,
    grandTotal,
    paidAmount,
}: {
    payments: PurchasePayment[];
    grandTotal: number;
    paidAmount: number;
}) {
    const progressPercent = grandTotal > 0 ? Math.min((paidAmount / grandTotal) * 100, 100) : 0;

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Progress</span>
                    <span className="font-medium">
                        {formatCurrency(paidAmount)} / {formatCurrency(grandTotal)}
                    </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                    <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                    {progressPercent.toFixed(1)}% paid
                </p>
            </div>

            {payments.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                    No payments recorded
                </p>
            ) : (
                <div className="space-y-2">
                    {payments.map((payment) => (
                        <div
                            key={payment.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {payment.payment_number}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {getPaymentMethodLabel(payment.payment_method)} &middot;{" "}
                                    {formatDate(payment.payment_date)}
                                </p>
                                {payment.transaction_reference && (
                                    <p className="text-muted-foreground text-xs">
                                        Ref: {payment.transaction_reference}
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-sm">
                                    {formatCurrency(payment.amount)}
                                </p>
                                <Badge
                                    variant="secondary"
                                    className={`text-xs ${
                                        payment.status === "completed"
                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                            : payment.status === "cancelled"
                                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                                    }`}
                                >
                                    {payment.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// RETURNS TAB
// ============================================================================

function ReturnsTab({ returns }: { returns: PurchaseReturn[] }) {
    if (!returns.length) {
        return (
            <p className="text-muted-foreground text-sm py-4 text-center">
                No returns found
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {returns.map((ret) => (
                <div key={ret.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{ret.return_number}</p>
                            <p className="text-muted-foreground text-xs">
                                {formatDate(ret.return_date)} &middot; {ret.reason}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-medium text-sm">{formatCurrency(ret.grand_total)}</p>
                            <Badge variant="secondary" className={`text-xs ${getReturnStatusColor(ret.status)}`}>
                                {getReturnStatusLabel(ret.status)}
                            </Badge>
                        </div>
                    </div>
                    {ret.debit_note_number && (
                        <p className="text-muted-foreground text-xs">
                            Debit Note: {ret.debit_note_number}
                        </p>
                    )}
                    <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                            Refund: {getRefundStatusLabel(ret.refund_status)}
                        </Badge>
                        {ret.refund_amount > 0 && (
                            <span className="text-muted-foreground">
                                Refunded: {formatCurrency(ret.refund_amount)}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// DETAIL SKELETON
// ============================================================================

function DetailSkeleton() {
    return (
        <div className="space-y-4 p-1">
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-2">
                        <Skeleton className="h-4 w-4 mt-1" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// PURCHASE DETAIL SHEET
// ============================================================================

export function PurchaseDetailSheet({
    open,
    onOpenChange,
    storeId,
    orderId,
    onEdit,
    onReceive,
    onAddPayment,
    onCreateReturn,
}: PurchaseDetailSheetProps) {
    const [activeTab, setActiveTab] = useState("overview");

    const {
        currentOrder,
        isLoading,
        fetchOrderById,
        fetchItems,
        fetchPayments,
    } = usePurchaseStore();

    // Fetch order details when opened
    useEffect(() => {
        if (open && orderId && storeId) {
            fetchOrderById(storeId, orderId);
            fetchItems(orderId, true);
            fetchPayments(orderId, true);
        }
    }, [open, orderId, storeId, fetchOrderById, fetchItems, fetchPayments]);

    // Reset tab on close
    useEffect(() => {
        if (!open) setActiveTab("overview");
    }, [open]);

    const order = currentOrder;
    const showLoading = isLoading || !order || order.id !== orderId;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl flex flex-col">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        {order ? order.po_number : "Purchase Order"}
                        {order && (
                            <Badge variant="secondary" className={getPOStatusColor(order.status)}>
                                {getPOStatusLabel(order.status)}
                            </Badge>
                        )}
                    </SheetTitle>
                    <SheetDescription>
                        {order ? `Supplier: ${order.supplier_name}` : "Loading..."}
                    </SheetDescription>
                </SheetHeader>

                {/* Action Buttons */}
                {order && !showLoading && (
                    <div className="flex gap-2 flex-wrap px-4">
                        {canEditPO(order.status) && (
                            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Order
                            </Button>
                        )}
                        {canEditPO(order.status) && (
                            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                Add Item
                            </Button>
                        )}
                        {canReceiveItems(order.status) && (
                            <Button size="sm" variant="outline" onClick={onReceive} className="gap-1.5">
                                <Package className="h-3.5 w-3.5" />
                                Receive Items
                            </Button>
                        )}
                        {canAddPayment(order) && (
                            <Button size="sm" variant="outline" onClick={onAddPayment} className="gap-1.5">
                                <CreditCard className="h-3.5 w-3.5" />
                                Add Payment
                            </Button>
                        )}
                        {canCreateReturn(order.status) && (
                            <Button size="sm" variant="outline" onClick={onCreateReturn} className="gap-1.5">
                                <Undo2 className="h-3.5 w-3.5" />
                                Create Return
                            </Button>
                        )}
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 p-4">
                    <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="items">
                            Items {order ? `(${order.items?.length ?? 0})` : ""}
                        </TabsTrigger>
                        <TabsTrigger value="payments">
                            Payments {order ? `(${order.payments?.length ?? 0})` : ""}
                        </TabsTrigger>
                        <TabsTrigger value="returns">
                            Returns {order ? `(${order.returns?.length ?? 0})` : ""}
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 mt-2 pr-2" style={{ maxHeight: "calc(100vh - 260px)" }}>
                        {showLoading ? (
                            <DetailSkeleton />
                        ) : (
                            <>
                                {/* Overview Tab */}
                                <TabsContent value="overview" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-x-4">
                                        <InfoRow
                                            label="PO Number"
                                            value={order.po_number}
                                            icon={<Hash className="h-3.5 w-3.5" />}
                                        />
                                        <InfoRow
                                            label="Invoice Number"
                                            value={order.invoice_number}
                                            icon={<FileText className="h-3.5 w-3.5" />}
                                        />
                                        <InfoRow
                                            label="Order Date"
                                            value={formatDate(order.order_date)}
                                            icon={<Calendar className="h-3.5 w-3.5" />}
                                        />
                                        <InfoRow
                                            label="Expected Delivery"
                                            value={formatDate(order.expected_delivery_date)}
                                            icon={<Calendar className="h-3.5 w-3.5" />}
                                        />
                                        <InfoRow
                                            label="Supplier GSTIN"
                                            value={order.supplier_gstin}
                                        />
                                        <InfoRow
                                            label="Place of Supply"
                                            value={order.place_of_supply}
                                            icon={<MapPin className="h-3.5 w-3.5" />}
                                        />
                                    </div>

                                    <Separator />

                                    {/* Payment Summary */}
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm">Payment Summary</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <InfoRow
                                                label="Payment Status"
                                                value={
                                                    <Badge
                                                        variant="secondary"
                                                        className={getPaymentStatusColor(order.payment_status)}
                                                    >
                                                        {getPaymentStatusLabel(order.payment_status)}
                                                    </Badge>
                                                }
                                            />
                                            <InfoRow label="Payment Due Date" value={formatDate(order.payment_due_date)} />
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Financial Summary */}
                                    <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>{formatCurrency(order.subtotal)}</span>
                                        </div>
                                        {order.discount_amount > 0 && (
                                            <div className="flex justify-between text-red-600">
                                                <span>Discount</span>
                                                <span>-{formatCurrency(order.discount_amount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tax</span>
                                            <span>{formatGstSummary(order)}</span>
                                        </div>
                                        {order.shipping_charges > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Shipping</span>
                                                <span>{formatCurrency(order.shipping_charges)}</span>
                                            </div>
                                        )}
                                        {order.other_charges > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Other</span>
                                                <span>{formatCurrency(order.other_charges)}</span>
                                            </div>
                                        )}
                                        <Separator />
                                        <div className="flex justify-between font-bold">
                                            <span>Grand Total</span>
                                            <span>{formatCurrency(order.grand_total)}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>Paid</span>
                                            <span>{formatCurrency(order.paid_amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600 font-medium">
                                            <span>Due</span>
                                            <span>{formatCurrency(order.due_amount)}</span>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {order.notes && (
                                        <div>
                                            <h4 className="font-medium text-sm mb-1">Notes</h4>
                                            <p className="text-muted-foreground text-sm">{order.notes}</p>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {order.tags && order.tags.length > 0 && (
                                        <div>
                                            <h4 className="font-medium text-sm mb-1">Tags</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {order.tags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cancellation */}
                                    {order.cancellation_reason && (
                                        <div className="rounded-lg border-red-200 bg-red-50 dark:bg-red-950 p-3 border">
                                            <h4 className="font-medium text-sm text-red-600">Cancelled</h4>
                                            <p className="text-sm text-red-600/80 mt-1">
                                                {order.cancellation_reason}
                                            </p>
                                            {order.cancelled_at && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    on {formatDate(order.cancelled_at)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Items Tab */}
                                <TabsContent value="items">
                                    <ItemsTab items={order.items ?? []} />
                                </TabsContent>

                                {/* Payments Tab */}
                                <TabsContent value="payments">
                                    <PaymentsTab
                                        payments={order.payments ?? []}
                                        grandTotal={order.grand_total}
                                        paidAmount={order.paid_amount}
                                    />
                                </TabsContent>

                                {/* Returns Tab */}
                                <TabsContent value="returns">
                                    <ReturnsTab returns={order.returns ?? []} />
                                </TabsContent>
                            </>
                        )}
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
