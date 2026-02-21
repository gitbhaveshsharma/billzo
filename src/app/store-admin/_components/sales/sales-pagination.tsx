"use client";

import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ============================================================================
// TYPES
// ============================================================================

interface SalesPaginationProps {
    page: number;
    limit: number;
    totalSales: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
}

// ============================================================================
// SALES PAGINATION
// ============================================================================

export function SalesPagination({
    page,
    limit,
    totalSales,
    totalPages,
    onPageChange,
    onLimitChange,
}: SalesPaginationProps) {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalSales);

    return (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-muted-foreground text-sm">
                {totalSales > 0
                    ? `Showing ${start}–${end} of ${totalSales} sales`
                    : "No sales"}
            </p>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Rows</span>
                    <Select
                        value={limit.toString()}
                        onValueChange={(val) => onLimitChange(Number(val))}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 30, 50, 100].map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page <= 1}
                        onClick={() => onPageChange(1)}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-2">
                        {page} / {totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(totalPages)}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
