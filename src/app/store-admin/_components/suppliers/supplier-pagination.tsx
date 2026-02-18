"use client";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import type { SupplierPagination as SupplierPaginationType } from "@/types/supplier.types";

// ============================================================================
// TYPES
// ============================================================================

interface SupplierPaginationProps {
    pagination: SupplierPaginationType;
    totalSuppliers: number;
    totalPages: number;
    onPaginationChange: (pagination: Partial<SupplierPaginationType>) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierPagination({
    pagination,
    totalSuppliers,
    totalPages,
    onPaginationChange,
}: SupplierPaginationProps) {
    const { page, limit } = pagination;
    const start = totalSuppliers === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, totalSuppliers);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Results info */}
            <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{start}</span> to{" "}
                <span className="font-medium">{end}</span> of{" "}
                <span className="font-medium">{totalSuppliers}</span> suppliers
            </p>

            <div className="flex items-center gap-4">
                {/* Rows per page */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Rows per page
                    </span>
                    <Select
                        value={String(limit)}
                        onValueChange={(val) =>
                            onPaginationChange({ limit: Number(val), page: 1 })
                        }
                    >
                        <SelectTrigger className="h-8 w-16">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 30, 50].map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Page info */}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Page {page} of {totalPages || 1}
                </span>

                {/* Page buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPaginationChange({ page: 1 })}
                        disabled={page <= 1}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                        <span className="sr-only">First page</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPaginationChange({ page: page - 1 })}
                        disabled={page <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Previous page</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPaginationChange({ page: page + 1 })}
                        disabled={page >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Next page</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPaginationChange({ page: totalPages })}
                        disabled={page >= totalPages}
                    >
                        <ChevronsRight className="h-4 w-4" />
                        <span className="sr-only">Last page</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
