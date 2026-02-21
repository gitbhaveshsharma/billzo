"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Search,
    X,
    Filter,
    Download,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SALE_STATUSES, PAYMENT_METHODS } from "@/types/sales.types";
import type { SaleFilters, Sale } from "@/types/sales.types";
import {
    getSaleStatusLabel,
    getPaymentMethodLabel,
    exportSalesToCSV,
    downloadCSV,
} from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

interface SalesToolbarProps {
    filters: SaleFilters;
    sales: Sale[];
    onFiltersChange: (filters: Partial<SaleFilters>) => void;
    isLoading: boolean;
    showDateRange?: boolean;
    showCreditFilter?: boolean;
}

// ============================================================================
// SALES TOOLBAR
// ============================================================================

export function SalesToolbar({
    filters,
    sales,
    onFiltersChange,
    isLoading,
    showDateRange = true,
    showCreditFilter = false,
}: SalesToolbarProps) {
    const [searchValue, setSearchValue] = useState(filters.search ?? "");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setSearchValue(filters.search ?? "");
    }, [filters.search]);

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchValue(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                onFiltersChange({ search: value || undefined });
            }, 300);
        },
        [onFiltersChange]
    );

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const activeFilterCount = [
        filters.status,
        filters.payment_method,
        filters.cashier_id,
        filters.date_from,
        filters.date_to,
        filters.is_credit_sale !== undefined ? "active" : undefined,
    ].filter(Boolean).length;

    const handleClearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            status: undefined,
            payment_method: undefined,
            cashier_id: undefined,
            date_from: undefined,
            date_to: undefined,
            is_credit_sale: undefined,
            has_due_amount: undefined,
        });
    }, [onFiltersChange]);

    const handleExport = useCallback(() => {
        if (!sales.length) return;
        const csv = exportSalesToCSV(sales);
        downloadCSV(csv, `sales-${new Date().toISOString().split("T")[0]}.csv`);
    }, [sales]);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Search + Filters */}
            <div className="flex flex-1 flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search invoice, customer..."
                        value={searchValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 pr-8"
                        disabled={isLoading}
                    />
                    {searchValue && (
                        <button
                            onClick={() => handleSearchChange("")}
                            className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            Status
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Sale Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={!filters.status}
                            onCheckedChange={() =>
                                onFiltersChange({ status: undefined })
                            }
                        >
                            All
                        </DropdownMenuCheckboxItem>
                        {SALE_STATUSES.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={filters.status === status}
                                onCheckedChange={() =>
                                    onFiltersChange({
                                        status: filters.status === status ? undefined : status,
                                    })
                                }
                            >
                                {getSaleStatusLabel(status)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Payment Method Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            Payment
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                        <DropdownMenuLabel>Payment Method</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={!filters.payment_method}
                            onCheckedChange={() =>
                                onFiltersChange({ payment_method: undefined })
                            }
                        >
                            All
                        </DropdownMenuCheckboxItem>
                        {PAYMENT_METHODS.map((method) => (
                            <DropdownMenuCheckboxItem
                                key={method}
                                checked={filters.payment_method === method}
                                onCheckedChange={() =>
                                    onFiltersChange({
                                        payment_method:
                                            filters.payment_method === method ? undefined : method,
                                    })
                                }
                            >
                                {getPaymentMethodLabel(method)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Date Range */}
                {showDateRange && (
                    <div className="flex items-center gap-1.5">
                        <Input
                            type="date"
                            value={filters.date_from ?? ""}
                            onChange={(e) =>
                                onFiltersChange({ date_from: e.target.value || undefined })
                            }
                            className="h-8 w-[130px] text-xs"
                            disabled={isLoading}
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                            type="date"
                            value={filters.date_to ?? ""}
                            onChange={(e) =>
                                onFiltersChange({ date_to: e.target.value || undefined })
                            }
                            className="h-8 w-[130px] text-xs"
                            disabled={isLoading}
                        />
                    </div>
                )}

                {/* Credit Filter */}
                {showCreditFilter && (
                    <Button
                        variant={filters.is_credit_sale ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                            onFiltersChange({
                                is_credit_sale: filters.is_credit_sale ? undefined : true,
                            })
                        }
                    >
                        Credit Sales
                    </Button>
                )}

                {/* Active filter badge + clear */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="gap-1">
                            <Filter className="h-3 w-3" />
                            {activeFilterCount}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className="h-7 px-2 text-xs"
                        >
                            Clear
                        </Button>
                    </div>
                )}
            </div>

            {/* Right: Export */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={!sales.length || isLoading}
                    className="gap-1.5"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                </Button>
            </div>
        </div>
    );
}
