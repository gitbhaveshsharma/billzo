"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Search,
    X,
    Filter,
    Download,
    Plus,
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
import {
    PURCHASE_ORDER_STATUSES,
    PAYMENT_STATUSES,
} from "@/types/purchase.types";
import type { PurchaseOrderFilters, PurchaseOrder } from "@/types/purchase.types";
import {
    getPOStatusLabel,
    getPaymentStatusLabel,
    exportPurchaseOrdersToCSV,
    downloadCSV,
    getUniqueSuppliers,
} from "@/utils/purchase.utils";

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseToolbarProps {
    filters: PurchaseOrderFilters;
    orders: PurchaseOrder[];
    onFiltersChange: (filters: Partial<PurchaseOrderFilters>) => void;
    onCreatePO: () => void;
    isLoading: boolean;
}

// ============================================================================
// PURCHASE TOOLBAR
// ============================================================================

export function PurchaseToolbar({
    filters,
    orders,
    onFiltersChange,
    onCreatePO,
    isLoading,
}: PurchaseToolbarProps) {
    const [searchValue, setSearchValue] = useState(filters.search ?? "");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external search changes
    useEffect(() => {
        setSearchValue(filters.search ?? "");
    }, [filters.search]);

    // Debounced search
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

    // Cleanup
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // Count active filters (excluding search)
    const activeFilterCount = [
        filters.status,
        filters.payment_status,
        filters.supplier_id,
        filters.date_from,
        filters.date_to,
    ].filter(Boolean).length;

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            status: undefined,
            payment_status: undefined,
            supplier_id: undefined,
            date_from: undefined,
            date_to: undefined,
        });
    }, [onFiltersChange]);

    // CSV export
    const handleExport = useCallback(() => {
        if (!orders.length) return;
        const csv = exportPurchaseOrdersToCSV(orders);
        downloadCSV(csv, `purchase-orders-${new Date().toISOString().split("T")[0]}.csv`);
    }, [orders]);

    // Unique suppliers for filter
    const uniqueSuppliers = getUniqueSuppliers(orders);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Search + Filters */}
            <div className="flex flex-1 items-center gap-2">
                {/* Search */}
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search PO number, supplier..."
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
                        <DropdownMenuLabel>Order Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={!filters.status}
                            onCheckedChange={() =>
                                onFiltersChange({ status: undefined })
                            }
                        >
                            All
                        </DropdownMenuCheckboxItem>
                        {PURCHASE_ORDER_STATUSES.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={filters.status === status}
                                onCheckedChange={() =>
                                    onFiltersChange({
                                        status: filters.status === status ? undefined : status,
                                    })
                                }
                            >
                                {getPOStatusLabel(status)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Payment Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            Payment
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={!filters.payment_status}
                            onCheckedChange={() =>
                                onFiltersChange({ payment_status: undefined })
                            }
                        >
                            All
                        </DropdownMenuCheckboxItem>
                        {PAYMENT_STATUSES.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={filters.payment_status === status}
                                onCheckedChange={() =>
                                    onFiltersChange({
                                        payment_status:
                                            filters.payment_status === status ? undefined : status,
                                    })
                                }
                            >
                                {getPaymentStatusLabel(status)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Supplier Filter */}
                {uniqueSuppliers.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                                Supplier
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                            <DropdownMenuLabel>Supplier</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={!filters.supplier_id}
                                onCheckedChange={() =>
                                    onFiltersChange({ supplier_id: undefined })
                                }
                            >
                                All Suppliers
                            </DropdownMenuCheckboxItem>
                            {uniqueSuppliers.map((supplier) => (
                                <DropdownMenuCheckboxItem
                                    key={supplier.id}
                                    checked={filters.supplier_id === supplier.id}
                                    onCheckedChange={() =>
                                        onFiltersChange({
                                            supplier_id:
                                                filters.supplier_id === supplier.id
                                                    ? undefined
                                                    : supplier.id,
                                        })
                                    }
                                >
                                    {supplier.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
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

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={!orders.length || isLoading}
                    className="gap-1.5"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                </Button>
                <Button size="sm" onClick={onCreatePO} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Create PO
                </Button>
            </div>
        </div>
    );
}
