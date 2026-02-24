"use client";

import { useState, useEffect } from "react";
import {
    Package,
    MapPin,
    BarChart3,
    ArrowDownUp,
    DollarSign,
    CalendarClock,
    AlertTriangle,
    Info,
    X,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    getStockLevelStatus,
    getStockLevelLabel,
    getStockLevelColor,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    getTransactionSign,
    formatCurrency,
    formatQuantity,
    formatDate,
    formatRelativeTime,
} from "@/utils/inventory.utils";
import type {
    EnrichedInventoryRecord,
    InventoryTransaction,
    PriceHistory,
} from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: EnrichedInventoryRecord | null;
    recentTransactions: InventoryTransaction[];
    priceHistory: PriceHistory[];
    isLoadingTransactions: boolean;
    isLoadingPriceHistory: boolean;
    onAdjust: () => void;
    onTransfer: () => void;
    onEdit: () => void;
}

// ============================================================================
// INVENTORY DETAIL SHEET
// ============================================================================

export function InventoryDetailSheet({
    open,
    onOpenChange,
    item,
    recentTransactions,
    priceHistory,
    isLoadingTransactions,
    isLoadingPriceHistory,
    onAdjust,
    onTransfer,
    onEdit,
}: InventoryDetailSheetProps) {
    if (!item) return null;

    const stockStatus = getStockLevelStatus(
        item.quantity_on_hand,
        item.reorder_point,
        item.maximum_stock
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl p-0">
                <SheetHeader className="p-6 pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 truncate">
                        <Package className="h-5 w-5 text-primary shrink-0" />
                        <span className="truncate">{item.product?.name ?? "Inventory Record"}</span>
                    </SheetTitle>
                    <SheetDescription className="text-sm">
                        {item.product?.product_code && (
                            <span className="font-mono">{item.product.product_code}</span>
                        )}
                        {item.variant && (
                            <>
                                {" · "}
                                <span>{item.variant.variant_code}</span>
                            </>
                        )}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-10rem)] px-6 py-4">
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={onAdjust}>
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Adjust
                            </Button>
                            <Button size="sm" variant="outline" onClick={onTransfer}>
                                <ArrowDownUp className="h-4 w-4 mr-1" />
                                Transfer
                            </Button>
                            <Button size="sm" variant="outline" onClick={onEdit}>
                                Edit Settings
                            </Button>
                        </div>

                        <Separator />

                        {/* Stock Overview */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                Stock Overview
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailField
                                    label="On Hand"
                                    tooltip="Total physical units currently in your store or warehouse. Includes both available stock and reserved stock."
                                    value={formatQuantity(item.quantity_on_hand)}
                                    mono
                                />
                                <DetailField
                                    label="Reserved"
                                    tooltip="Units committed to pending sales orders or transfers but not yet dispatched. You cannot sell these until the order is cancelled or fulfilled."
                                    value={formatQuantity(item.quantity_committed)}
                                    mono
                                />
                                <DetailField
                                    label="Available"
                                    tooltip="On Hand minus Reserved. This is the quantity you can freely sell or allocate right now."
                                    value={formatQuantity(item.quantity_available)}
                                    mono
                                    highlight
                                />
                                <DetailField
                                    label="Status"
                                    tooltip="Stock health based on your reorder point. Normal = plenty of stock. Low = at or near reorder point. Out of Stock = zero units."
                                    value={
                                        <Badge
                                            variant="outline"
                                            className={getStockLevelColor(stockStatus)}
                                        >
                                            {getStockLevelLabel(stockStatus)}
                                        </Badge>
                                    }
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Valuation */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                Valuation
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailField
                                    label="Average Cost"
                                    tooltip="Weighted average purchase price across all batches received. Automatically recalculated each time new stock is purchased."
                                    value={
                                        item.average_cost != null
                                            ? formatCurrency(item.average_cost)
                                            : "-"
                                    }
                                    mono
                                />
                                <DetailField
                                    label="Total Value"
                                    tooltip="Average Cost × On Hand quantity. This is the book value of your current stock for this product."
                                    value={
                                        item.total_value != null
                                            ? formatCurrency(item.total_value)
                                            : "-"
                                    }
                                    mono
                                    highlight
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Location & Settings */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                Location & Settings
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailField
                                    label="Warehouse"
                                    tooltip="Physical building or storage facility where this stock is held."
                                    value={item.warehouse ?? "-"}
                                />
                                <DetailField
                                    label="Location"
                                    tooltip="Exact shelf, bin, or rack within the warehouse — e.g. A-3-B means Aisle A, Row 3, Bin B."
                                    value={item.location ?? "-"}
                                    icon={<MapPin className="h-3 w-3" />}
                                />
                                <DetailField
                                    label="Reorder Point"
                                    tooltip="When On Hand drops to or below this number, the system raises a Low Stock alert and suggests creating a purchase order."
                                    value={formatQuantity(item.reorder_point)}
                                    mono
                                />
                                <DetailField
                                    label="Maximum Stock"
                                    tooltip="Upper inventory limit. If On Hand exceeds this, an overstock alert is raised. Helps prevent over-purchasing and frees up cash."
                                    value={
                                        item.maximum_stock != null
                                            ? formatQuantity(item.maximum_stock)
                                            : "Not set"
                                    }
                                    mono
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Product Details */}
                        {item.product && (
                            <>
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                        Product Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <DetailField
                                            label="Barcode"
                                            tooltip="Scannable barcode used at the POS counter to look up this product instantly."
                                            value={item.product.barcode ?? "-"}
                                            mono
                                        />
                                        <DetailField
                                            label="HSN Code"
                                            tooltip="Harmonised System of Nomenclature code. Required for GST invoicing and tax filing in India."
                                            value={item.product.hsn_code ?? "-"}
                                            mono
                                        />
                                        <DetailField
                                            label="MRP"
                                            tooltip="Maximum Retail Price — the highest price at which this product can legally be sold to an end customer."
                                            value={formatCurrency(item.product.mrp)}
                                            mono
                                        />
                                        <DetailField
                                            label="Selling Price"
                                            tooltip="The price charged to customers at this store. Must be ≤ MRP."
                                            value={formatCurrency(item.product.selling_price)}
                                            mono
                                        />
                                        <DetailField
                                            label="Brand"
                                            value={item.product.brand ?? "-"}
                                        />
                                        <DetailField
                                            label="Batch Tracked"
                                            tooltip="When enabled, stock is managed per batch/lot (with manufacturing & expiry dates). Required for medicines, food items, and any product with expiry dates."
                                            value={item.product.is_batch_tracked ? "Yes" : "No"}
                                        />
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Recent Transactions */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <ArrowDownUp className="h-4 w-4" />
                                Recent Transactions
                            </h4>
                            {isLoadingTransactions ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))}
                                </div>
                            ) : recentTransactions.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    No recent transactions
                                </p>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentTransactions.slice(0, 10).map((tx) => {
                                                const sign = getTransactionSign(tx.transaction_type);
                                                return (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="text-xs">
                                                            {formatRelativeTime(tx.transaction_date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs ${getTransactionTypeColor(tx.transaction_type)}`}
                                                            >
                                                                {getTransactionTypeLabel(tx.transaction_type)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            <span
                                                                className={
                                                                    sign === "+"
                                                                        ? "text-green-600"
                                                                        : sign === "-"
                                                                        ? "text-red-600"
                                                                        : "text-blue-600"
                                                                }
                                                            >
                                                                {sign}
                                                                {formatQuantity(Math.abs(tx.quantity))}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Price History */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Price History
                            </h4>
                            {isLoadingPriceHistory ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))}
                                </div>
                            ) : priceHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    No price changes recorded
                                </p>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Old</TableHead>
                                                <TableHead className="text-right">New</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {priceHistory.slice(0, 10).map((ph) => (
                                                <TableRow key={ph.id}>
                                                    <TableCell className="text-xs">
                                                        {formatDate(ph.effective_from)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">
                                                        {ph.old_price != null
                                                            ? formatCurrency(ph.old_price)
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-medium">
                                                        {ph.new_price != null
                                                            ? formatCurrency(ph.new_price)
                                                            : "-"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        {/* Timestamps */}
                        <Separator />
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pb-4">
                            <span>Created: {formatDate(item.created_at)}</span>
                            <span>Updated: {formatRelativeTime(item.updated_at)}</span>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DetailFieldProps {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    highlight?: boolean;
    icon?: React.ReactNode;
    tooltip?: string;
}

function DetailField({ label, value, mono, highlight, icon, tooltip }: DetailFieldProps) {
    return (
        <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                {icon}
                {label}
                {tooltip && (
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="cursor-default">
                                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                                {tooltip}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </p>
            {/* Use div instead of p to allow block-level children like Badge */}
            <div
                className={`text-sm ${mono ? "font-mono" : ""} ${
                    highlight ? "font-semibold text-primary" : ""
                }`}
            >
                {value}
            </div>
        </div>
    );
}
