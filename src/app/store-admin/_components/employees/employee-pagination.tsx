"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { StoreUserPagination } from "@/types/store-users.types";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeePaginationProps {
    pagination: StoreUserPagination;
    totalUsers: number;
    totalPages: number;
    onPaginationChange: (pagination: Partial<StoreUserPagination>) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmployeePagination({
    pagination,
    totalUsers,
    totalPages,
    onPaginationChange,
}: EmployeePaginationProps) {
    const { page, limit } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, totalUsers);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Item count */}
            <p className="text-sm text-muted-foreground">
                {totalUsers > 0 ? (
                    <>
                        Showing <span className="font-medium">{startItem}</span> to{" "}
                        <span className="font-medium">{endItem}</span> of{" "}
                        <span className="font-medium">{totalUsers}</span> employees
                    </>
                ) : (
                    "No employees"
                )}
            </p>

            {/* Controls */}
            <div className="flex items-center gap-2">
                {/* Rows per page */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Per page</span>
                    <select
                        value={String(limit)}
                        onChange={(e) =>
                            onPaginationChange({ limit: Number(e.target.value), page: 1 })
                        }
                        className="h-8 w-16 text-xs rounded-md border border-input bg-transparent px-2 py-1 shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

                {/* Page info */}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Page {page} of {totalPages || 1}
                </span>

                {/* Navigation buttons */}
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
