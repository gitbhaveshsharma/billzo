"use client";

import { useState, useCallback } from "react";
import {
    CalendarClock,
    Filter,
    Info,
    Package,
    Plus,
    AlertTriangle,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InventoryPagination } from "./inventory-pagination";
import {
    formatCurrency,
    formatQuantity,
    formatDate,
    getExpiryStatusLabel,
    getExpiryStatusColor,
    getDaysUntilExpiry,
} from "@/utils/inventory.utils";
import type {
    EnrichedProductBatch,
    BatchFilters,
} from "@/types/inventory.types";

// ============================================================================
// HELPERS
// ============================================================================

/** Column header with a small info tooltip */
function TipHead({ children, tip }: { children: React.ReactNode; tip: string }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-default select-none">
                        {children}
                        <Info className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {tip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ============================================================================
// TYPES
// ============================================================================

interface BatchesPanelProps {
    batches: EnrichedProductBatch[];
    total: number;
    filters: BatchFilters;
    isLoading: boolean;
    onFiltersChange: (filters: Partial<BatchFilters>) => void;
    onCreateBatch: () => void;
}

// ============================================================================
// BATCHES PANEL
// ============================================================================

export function BatchesPanel({
    batches,
    total,
    filters,
    isLoading,
    onFiltersChange,
    onCreateBatch,
}: BatchesPanelProps) {
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);

    const handleSearchChange = useCallback(
        (value: string) => {
            onFiltersChange({ search: value || undefined });
            setPage(1);
        },
        [onFiltersChange]
    );

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <Input
                    className="w-56"
                    placeholder="Search batch number..."
                    value={filters.search ?? ""}
                    onChange={(e) => handleSearchChange(e.target.value)}
                />

                <Select
                    value={
                        filters.expired_only
                            ? "EXPIRED"
                            : filters.expiring_within_days
                            ? `EXPIRING_${filters.expiring_within_days}`
                            : "ALL"
                    }
                    onValueChange={(v) => {
                        if (v === "ALL") {
                            onFiltersChange({ expired_only: undefined, expiring_within_days: undefined });
                        } else if (v === "EXPIRED") {
                            onFiltersChange({ expired_only: true, expiring_within_days: undefined });
                        } else {
                            const days = parseInt(v.replace("EXPIRING_", ""), 10);
                            onFiltersChange({ expired_only: undefined, expiring_within_days: days });
                        }
                    }}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Expiry Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Batches</SelectItem>
                        <SelectItem value="EXPIRING_7">Expiring in 7 days</SelectItem>
                        <SelectItem value="EXPIRING_30">Expiring in 30 days</SelectItem>
                        <SelectItem value="EXPIRING_90">Expiring in 90 days</SelectItem>
                        <SelectItem value="EXPIRED">Expired Only</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={
                        filters.is_active === undefined
                            ? "ALL"
                            : filters.is_active
                            ? "ACTIVE"
                            : "INACTIVE"
                    }
                    onValueChange={(v) =>
                        onFiltersChange({
                            is_active: v === "ALL" ? undefined : v === "ACTIVE",
                        })
                    }
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto">
                    <Button onClick={onCreateBatch} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Batch
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <TipHead tip="Unique lot or batch identifier assigned by the manufacturer or auto-generated from the Purchase Order.">
                                    Batch #
                                </TipHead>
                            </TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">
                                <TipHead tip="Total quantity received when this batch was first purchased or received.">
                                    Initial Qty
                                </TipHead>
                            </TableHead>
                            <TableHead className="text-right">
                                <TipHead tip="Remaining units in this batch after sales and adjustments. When this reaches zero the batch is automatically deactivated.">
                                    Current Qty
                                </TipHead>
                            </TableHead>
                            <TableHead className="text-right">
                                <TipHead tip="Purchase price per unit when this batch was procured. Used for FIFO / weighted average cost calculations.">
                                    Cost
                                </TipHead>
                            </TableHead>
                            <TableHead>
                                <TipHead tip="Date the product was manufactured. Used to calculate shelf life.">
                                    Mfg Date
                                </TipHead>
                            </TableHead>
                            <TableHead>
                                <TipHead tip="Date after which this batch should not be sold. FEFO (First Expiry, First Out) ensures nearest-expiry batches are sold first at the POS.">
                                    Expiry
                                </TipHead>
                            </TableHead>
                            <TableHead>
                                <TipHead tip="How soon this batch expires. Valid = more than 90 days left. Warning = 30–90 days. Critical = under 30 days. Expired = past expiry date.">
                                    Expiry Status
                                </TipHead>
                            </TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <BatchTableSkeleton />
                        ) : batches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10}>
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <CalendarClock className="h-10 w-10 mb-2" />
                                        <p className="font-medium">No batches found</p>
                                        <p className="text-sm">
                                            Create a batch to start tracking.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            batches.map((batch) => {
                                const daysLeft = getDaysUntilExpiry(batch.expiry_date);
                                return (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-mono text-sm">
                                            {batch.batch_number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">
                                                        {batch.product?.name ?? "Unknown"}
                                                    </p>
                                                    {batch.product?.product_code && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {batch.product.product_code}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {batch.supplier?.name ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatQuantity(batch.initial_quantity)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatQuantity(batch.current_quantity)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {batch.purchase_price != null
                                                ? formatCurrency(batch.purchase_price)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {batch.manufacturing_date
                                                ? formatDate(batch.manufacturing_date)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {batch.expiry_date
                                                ? formatDate(batch.expiry_date)
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {batch.expiry_date ? (
                                                <Badge
                                                    variant="outline"
                                                    className={getExpiryStatusColor(batch.expiry_date)}
                                                >
                                                    {daysLeft !== null && daysLeft <= 0 && (
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                    )}
                                                    {getExpiryStatusLabel(batch.expiry_date)}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">
                                                    N/A
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    batch.is_active
                                                        ? "text-green-600 border-green-200"
                                                        : "text-gray-500 border-gray-200"
                                                }
                                            >
                                                {batch.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <InventoryPagination
                page={page}
                totalPages={totalPages}
                limit={pageSize}
                totalItems={total}
                onPageChange={setPage}
                onLimitChange={() => {}}
                label="batches"
            />
        </div>
    );
}

// ============================================================================
// SKELETON
// ============================================================================

function BatchTableSkeleton() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}
