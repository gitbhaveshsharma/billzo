"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ArrowDownUp,
    Filter,
    Package,
    Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { InventoryPagination } from "./inventory-pagination";
import {
    getTransactionTypeLabel,
    getTransactionTypeColor,
    getTransactionSign,
    formatCurrency,
    formatQuantity,
    formatDate,
    formatRelativeTime,
} from "@/utils/inventory.utils";
import {
    TRANSACTION_TYPES,
    type EnrichedInventoryTransaction,
    type TransactionFilters,
    type TransactionPagination,
    type TransactionType,
} from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

interface TransactionsPanelProps {
    transactions: EnrichedInventoryTransaction[];
    total: number;
    filters: TransactionFilters;
    pagination: TransactionPagination;
    isLoading: boolean;
    onFiltersChange: (filters: Partial<TransactionFilters>) => void;
    onPaginationChange: (pagination: Partial<TransactionPagination>) => void;
}

// ============================================================================
// TRANSACTIONS PANEL
// ============================================================================

export function TransactionsPanel({
    transactions,
    total,
    filters,
    pagination,
    isLoading,
    onFiltersChange,
    onPaginationChange,
}: TransactionsPanelProps) {
    const [searchValue, setSearchValue] = useState(filters.search ?? "");

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== (filters.search ?? "")) {
                onFiltersChange({ search: searchValue || undefined });
                onPaginationChange({ page: 1 });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchValue, filters.search, onFiltersChange, onPaginationChange]);

    const totalPages = Math.ceil(total / pagination.limit);

    const handlePageChange = useCallback(
        (page: number) => onPaginationChange({ page }),
        [onPaginationChange]
    );

    const handlePageSizeChange = useCallback(
        (limit: number) => onPaginationChange({ limit, page: 1 }),
        [onPaginationChange]
    );

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder="Search transactions..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </div>

                <Select
                    value={filters.transaction_type ?? "ALL"}
                    onValueChange={(v) =>
                        onFiltersChange({
                            transaction_type: v === "ALL" ? undefined : (v as TransactionType),
                        })
                    }
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Transaction Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        {TRANSACTION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                                {getTransactionTypeLabel(t)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="date"
                        className="w-36"
                        value={filters.date_from ?? ""}
                        onChange={(e) =>
                            onFiltersChange({ date_from: e.target.value || undefined })
                        }
                        placeholder="From"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                        type="date"
                        className="w-36"
                        value={filters.date_to ?? ""}
                        onChange={(e) =>
                            onFiltersChange({ date_to: e.target.value || undefined })
                        }
                        placeholder="To"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Previous</TableHead>
                            <TableHead className="text-right">New</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TransactionTableSkeleton />
                        ) : transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11}>
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <ArrowDownUp className="h-10 w-10 mb-2" />
                                        <p className="font-medium">No transactions found</p>
                                        <p className="text-sm">
                                            Adjust the filters to see transaction history.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((tx) => {
                                const sign = getTransactionSign(tx.transaction_type);
                                return (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            <div>
                                                <p>{formatDate(tx.transaction_date)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatRelativeTime(tx.transaction_date)}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={getTransactionTypeColor(tx.transaction_type)}
                                            >
                                                {getTransactionTypeLabel(tx.transaction_type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate max-w-[150px]">
                                                        {tx.product?.name ?? "Unknown"}
                                                    </p>
                                                    {tx.variant && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {tx.variant.variant_code}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
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
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {tx.previous_quantity != null
                                                ? formatQuantity(tx.previous_quantity)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {tx.new_quantity != null
                                                ? formatQuantity(tx.new_quantity)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {tx.total_cost != null
                                                ? formatCurrency(tx.total_cost)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {tx.reference_number ? (
                                                <div>
                                                    <p className="font-mono text-xs">
                                                        {tx.reference_number}
                                                    </p>
                                                    {tx.reference_type && (
                                                        <p className="text-xs text-muted-foreground capitalize">
                                                            {tx.reference_type.toLowerCase().replace(/_/g, " ")}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm font-mono">
                                            {tx.batch_number ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {tx.from_location && tx.to_location ? (
                                                <div className="text-xs">
                                                    <p>{tx.from_location}</p>
                                                    <p className="text-muted-foreground">
                                                        → {tx.to_location}
                                                    </p>
                                                </div>
                                            ) : tx.to_location ? (
                                                tx.to_location
                                            ) : tx.from_location ? (
                                                tx.from_location
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                                            {tx.reason ?? "-"}
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
                page={pagination.page}
                totalPages={totalPages}
                limit={pagination.limit}
                totalItems={total}
                onPageChange={handlePageChange}
                onLimitChange={handlePageSizeChange}
                label="transactions"
            />
        </div>
    );
}

// ============================================================================
// SKELETON
// ============================================================================

function TransactionTableSkeleton() {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}
