"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { ArrowDownUp, History } from "lucide-react";
import { useProductStore } from "@/stores/product.store";
import { TRANSACTION_TYPES } from "@/types/product.types";
import type { InventoryTransaction, TransactionType } from "@/types/product.types";
import {
    formatCurrency,
    formatDate,
    formatQuantity,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    isStockIncrease,
} from "@/utils/product.utils";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface StockMovementHistoryProps {
    productId: string;
    storeId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StockMovementHistory({
    productId,
    storeId,
}: StockMovementHistoryProps) {
    const { fetchTransactions } = useProductStore();

    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<string>("all");

    // Load transactions
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            const filters: { product_id: string; transaction_type?: TransactionType } = {
                product_id: productId,
            };
            if (typeFilter !== "all") {
                filters.transaction_type = typeFilter as TransactionType;
            }
            const result = await fetchTransactions(storeId, filters);
            if (!cancelled) {
                setTransactions(result ?? []);
                setIsLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [storeId, productId, typeFilter, fetchTransactions]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Stock Movements</h4>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {TRANSACTION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {getTransactionTypeLabel(type)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Loading transactions...
                </p>
            ) : transactions.length === 0 ? (
                <div className="text-center py-6">
                    <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        No stock movements found
                    </p>
                </div>
            ) : (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Before</TableHead>
                                <TableHead className="text-right">After</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead>Reference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((txn) => {
                                const typeColor = getTransactionTypeColor(
                                    txn.transaction_type
                                );
                                const increase = isStockIncrease(txn.transaction_type);

                                return (
                                    <TableRow key={txn.id}>
                                        <TableCell className="text-xs whitespace-nowrap">
                                            {formatDate(txn.transaction_date)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[10px]", typeColor)}
                                            >
                                                {getTransactionTypeLabel(txn.transaction_type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-right text-sm font-medium",
                                                increase
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            )}
                                        >
                                            {increase ? "+" : "-"}
                                            {formatQuantity(txn.quantity)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {txn.previous_quantity != null
                                                ? formatQuantity(txn.previous_quantity)
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {txn.new_quantity != null
                                                ? formatQuantity(txn.new_quantity)
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {txn.unit_cost != null
                                                ? formatCurrency(txn.unit_cost)
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div>
                                                {txn.reference_number || "—"}
                                            </div>
                                            {txn.reason && (
                                                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                    {txn.reason}
                                                </p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!isLoading && transactions.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Showing {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
