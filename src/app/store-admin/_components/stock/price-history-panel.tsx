"use client";

import {
    TrendingUp,
    TrendingDown,
    Minus,
    DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    formatCurrency,
    formatDate,
    getPriceTypeLabel,
} from "@/utils/inventory.utils";
import type { PriceHistory } from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface PriceHistoryPanelProps {
    priceHistory: PriceHistory[];
    isLoading: boolean;
    productName?: string;
}

// ============================================================================
// PRICE HISTORY PANEL
// ============================================================================

export function PriceHistoryPanel({
    priceHistory,
    isLoading,
    productName,
}: PriceHistoryPanelProps) {
    return (
        <div className="space-y-4">
            {productName && (
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                        Price history for{" "}
                        <span className="font-semibold">{productName}</span>
                    </span>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Price Type</TableHead>
                            <TableHead className="text-right">Old Price</TableHead>
                            <TableHead className="text-right">New Price</TableHead>
                            <TableHead>Change</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <PriceHistorySkeleton />
                        ) : priceHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <DollarSign className="h-10 w-10 mb-2" />
                                        <p className="font-medium">No price changes</p>
                                        <p className="text-sm">
                                            No price history recorded for this product.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            priceHistory.map((entry) => {
                                const diff =
                                    entry.old_price != null && entry.new_price != null
                                        ? entry.new_price - entry.old_price
                                        : null;

                                return (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {formatDate(entry.effective_from)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {getPriceTypeLabel(entry.price_type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {entry.old_price != null
                                                ? formatCurrency(entry.old_price)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                            {entry.new_price != null
                                                ? formatCurrency(entry.new_price)
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {diff != null ? (
                                                <div className="flex items-center gap-1">
                                                    {diff > 0 ? (
                                                        <TrendingUp className="h-4 w-4 text-red-500" />
                                                    ) : diff < 0 ? (
                                                        <TrendingDown className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Minus className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <span
                                                        className={`font-mono text-sm ${
                                                            diff > 0
                                                                ? "text-red-600"
                                                                : diff < 0
                                                                ? "text-green-600"
                                                                : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {diff > 0 ? "+" : ""}
                                                        {formatCurrency(diff)}
                                                    </span>
                                                </div>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                            {entry.reason ?? "-"}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// ============================================================================
// SKELETON
// ============================================================================

function PriceHistorySkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}
