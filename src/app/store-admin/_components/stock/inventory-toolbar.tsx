"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Search,
    X,
    Filter,
    Download,
    Plus,
    ChevronDown,
    ArrowDownUp,
    ClipboardCheck,
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
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { InventoryFilters, EnrichedInventoryRecord } from "@/types/inventory.types";
import {
    exportInventoryToCSV,
    downloadCSV,
    getUniqueWarehouses,
} from "@/utils/inventory.utils";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryToolbarProps {
    filters: InventoryFilters;
    items: EnrichedInventoryRecord[];
    onFiltersChange: (filters: Partial<InventoryFilters>) => void;
    onAdjustment: () => void;
    onTransfer: () => void;
    onStockCount: () => void;
    isLoading: boolean;
}

// ============================================================================
// INVENTORY TOOLBAR
// ============================================================================

export function InventoryToolbar({
    filters,
    items,
    onFiltersChange,
    onAdjustment,
    onTransfer,
    onStockCount,
    isLoading,
}: InventoryToolbarProps) {
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
        filters.low_stock_only,
        filters.out_of_stock_only,
        filters.overstock_only,
        filters.warehouse,
        filters.category_id,
    ].filter(Boolean).length;

    const handleClearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            low_stock_only: undefined,
            out_of_stock_only: undefined,
            overstock_only: undefined,
            warehouse: undefined,
            category_id: undefined,
            min_quantity: undefined,
            max_quantity: undefined,
        });
    }, [onFiltersChange]);

    const handleExport = useCallback(() => {
        if (!items.length) return;
        const csv = exportInventoryToCSV(items);
        downloadCSV(csv, `inventory-${new Date().toISOString().split("T")[0]}.csv`);
    }, [items]);

    const uniqueWarehouses = getUniqueWarehouses(items);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Search + Filters */}
            <div className="flex flex-1 flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search product, SKU, barcode..."
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

                {/* Stock Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            Stock Level
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Stock Level</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={!filters.low_stock_only && !filters.out_of_stock_only && !filters.overstock_only}
                            onCheckedChange={() =>
                                onFiltersChange({
                                    low_stock_only: undefined,
                                    out_of_stock_only: undefined,
                                    overstock_only: undefined,
                                })
                            }
                        >
                            All
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={!!filters.low_stock_only}
                            onCheckedChange={(checked) =>
                                onFiltersChange({
                                    low_stock_only: checked || undefined,
                                    out_of_stock_only: undefined,
                                    overstock_only: undefined,
                                })
                            }
                        >
                            Low Stock
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={!!filters.out_of_stock_only}
                            onCheckedChange={(checked) =>
                                onFiltersChange({
                                    out_of_stock_only: checked || undefined,
                                    low_stock_only: undefined,
                                    overstock_only: undefined,
                                })
                            }
                        >
                            Out of Stock
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={!!filters.overstock_only}
                            onCheckedChange={(checked) =>
                                onFiltersChange({
                                    overstock_only: checked || undefined,
                                    low_stock_only: undefined,
                                    out_of_stock_only: undefined,
                                })
                            }
                        >
                            Overstock
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Warehouse Filter */}
                {uniqueWarehouses.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                                Warehouse
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                            <DropdownMenuLabel>Warehouse</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={!filters.warehouse}
                                onCheckedChange={() =>
                                    onFiltersChange({ warehouse: undefined })
                                }
                            >
                                All Warehouses
                            </DropdownMenuCheckboxItem>
                            {uniqueWarehouses.map((wh) => (
                                <DropdownMenuCheckboxItem
                                    key={wh}
                                    checked={filters.warehouse === wh}
                                    onCheckedChange={() =>
                                        onFiltersChange({
                                            warehouse: filters.warehouse === wh ? undefined : wh,
                                        })
                                    }
                                >
                                    {wh}
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
                    disabled={!items.length || isLoading}
                    className="gap-1.5"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onStockCount}
                    className="gap-1.5"
                >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Stock Count</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            Stock Action
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onAdjustment}>
                            <ArrowDownUp className="mr-2 h-4 w-4" />
                            Stock Adjustment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onTransfer}>
                            <ArrowDownUp className="mr-2 h-4 w-4" />
                            Stock Transfer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
