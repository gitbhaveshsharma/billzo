"use client";

import { useMemo, useState } from "react";
import {
    BarChart3,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
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
import type { ProductSalesReport } from "@/types/sales.types";
import { formatCurrency } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProductSalesReportTableProps {
    data: ProductSalesReport[];
    isLoading?: boolean;
}

type SortKey = "product_name" | "total_quantity_sold" | "net_quantity_sold" | "total_revenue" | "total_profit" | "profit_percentage" | "transaction_count";

// ============================================================================
// PRODUCT SALES REPORT TABLE
// ============================================================================

export function ProductSalesReportTable({
    data,
    isLoading = false,
}: ProductSalesReportTableProps) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("total_revenue");
    const [sortDesc, setSortDesc] = useState(true);

    // Filter
    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(
            (r) =>
                r.product_name.toLowerCase().includes(q) ||
                r.product_code.toLowerCase().includes(q)
        );
    }, [data, search]);

    // Sort
    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === "string") {
                return sortDesc
                    ? (bVal as string).localeCompare(aVal)
                    : aVal.localeCompare(bVal as string);
            }
            return sortDesc
                ? (bVal as number) - (aVal as number)
                : (aVal as number) - (bVal as number);
        });
        return arr;
    }, [filtered, sortKey, sortDesc]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
        return sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
    };

    // Summary totals
    const totals = useMemo(
        () => ({
            quantity: sorted.reduce((s, r) => s + r.net_quantity_sold, 0),
            revenue: sorted.reduce((s, r) => s + r.total_revenue, 0),
            profit: sorted.reduce((s, r) => s + r.total_profit, 0),
            transactions: sorted.reduce((s, r) => s + r.transaction_count, 0),
        }),
        [sorted]
    );

    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pl-8"
                />
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">Product</TableHead>
                            <TableHead
                                className="text-xs text-right cursor-pointer select-none"
                                onClick={() => handleSort("net_quantity_sold")}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Sold <SortIcon columnKey="net_quantity_sold" />
                                </span>
                            </TableHead>
                            <TableHead className="text-xs text-right">Returned</TableHead>
                            <TableHead
                                className="text-xs text-right cursor-pointer select-none"
                                onClick={() => handleSort("total_revenue")}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Revenue <SortIcon columnKey="total_revenue" />
                                </span>
                            </TableHead>
                            <TableHead
                                className="text-xs text-right cursor-pointer select-none"
                                onClick={() => handleSort("total_profit")}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Profit <SortIcon columnKey="total_profit" />
                                </span>
                            </TableHead>
                            <TableHead
                                className="text-xs text-right cursor-pointer select-none"
                                onClick={() => handleSort("profit_percentage")}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Margin <SortIcon columnKey="profit_percentage" />
                                </span>
                            </TableHead>
                            <TableHead
                                className="text-xs text-right cursor-pointer select-none"
                                onClick={() => handleSort("transaction_count")}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Txns <SortIcon columnKey="transaction_count" />
                                </span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : sorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        No product sales data
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {sorted.map((row) => (
                                    <TableRow key={`${row.product_id}-${row.sale_date}`}>
                                        <TableCell className="text-xs">
                                            <div>
                                                <p className="font-medium">{row.product_name}</p>
                                                <p className="text-muted-foreground">
                                                    {row.product_code}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-medium">
                                            {row.net_quantity_sold}
                                        </TableCell>
                                        <TableCell className="text-xs text-right text-red-500">
                                            {row.total_returned > 0 ? row.total_returned : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-medium">
                                            {formatCurrency(row.total_revenue)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-xs text-right font-medium ${
                                                row.total_profit < 0
                                                    ? "text-red-500"
                                                    : "text-green-600"
                                            }`}
                                        >
                                            {formatCurrency(row.total_profit)}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    row.profit_percentage < 0
                                                        ? "text-red-500"
                                                        : row.profit_percentage > 20
                                                        ? "text-green-600"
                                                        : ""
                                                }
                                            >
                                                {row.profit_percentage.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-right">
                                            {row.transaction_count}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Totals row */}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell className="text-xs">
                                        Total ({sorted.length} products)
                                    </TableCell>
                                    <TableCell className="text-xs text-right">
                                        {totals.quantity}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">—</TableCell>
                                    <TableCell className="text-xs text-right">
                                        {formatCurrency(totals.revenue)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-xs text-right ${
                                            totals.profit < 0
                                                ? "text-red-500"
                                                : "text-green-600"
                                        }`}
                                    >
                                        {formatCurrency(totals.profit)}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">
                                        {totals.revenue > 0
                                            ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%`
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">
                                        {totals.transactions}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
