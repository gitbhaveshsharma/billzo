"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Search,
    Plus,
    Filter,
    Download,
    ChevronDown,
    X,
    Check,
} from "lucide-react";
import type { ProductFilters, Product, Category } from "@/types/product.types";
import { GST_RATES } from "@/types/product.types";
import { exportProductsToCSV, downloadCSV, formatPercentage } from "@/utils/product.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ProductToolbarProps {
    filters: ProductFilters;
    onFiltersChange: (filters: Partial<ProductFilters>) => void;
    selectedCount: number;
    onAddProduct: () => void;
    products: Product[];
    categories: Category[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductToolbar({
    filters,
    onFiltersChange,
    selectedCount,
    onAddProduct,
    products,
    categories,
}: ProductToolbarProps) {
    const [searchValue, setSearchValue] = useState(filters.search || "");

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== (filters.search || "")) {
                onFiltersChange({ search: searchValue || undefined });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchValue, filters.search, onFiltersChange]);

    const handleExportCSV = useCallback(() => {
        const csv = exportProductsToCSV(products);
        downloadCSV(csv, `products_${new Date().toISOString().slice(0, 10)}.csv`);
    }, [products]);

    const activeFilterCount = [
        filters.category_id,
        filters.is_active !== undefined ? "active" : undefined,
        filters.gst_percentage !== undefined ? "gst" : undefined,
        filters.low_stock_only ? "low_stock" : undefined,
        filters.brand,
    ].filter(Boolean).length;

    const clearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            category_id: undefined,
            brand: undefined,
            is_active: undefined,
            gst_percentage: undefined,
            low_stock_only: undefined,
            min_price: undefined,
            max_price: undefined,
            min_stock: undefined,
            max_stock: undefined,
            has_barcode: undefined,
            is_batch_tracked: undefined,
            is_taxable: undefined,
        });
    }, [onFiltersChange]);

    // Unique brands from products
    const uniqueBrands = Array.from(
        new Set(products.map((p) => p.brand).filter(Boolean))
    ).sort() as string[];

    // Labels
    const selectedCategoryLabel = filters.category_id
        ? categories.find((c) => c.id === filters.category_id)?.name ?? "Category"
        : "All Categories";

    const selectedStatusLabel =
        filters.is_active === undefined
            ? "All Status"
            : filters.is_active
                ? "Active"
                : "Inactive";

    const selectedGstLabel =
        filters.gst_percentage !== undefined
            ? `GST ${filters.gst_percentage}%`
            : "GST Rate";

    const selectedBrandLabel = filters.brand || "All Brands";

    return (
        <div className="space-y-3">
            {/* Top row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, code, barcode, brand..."
                        className="pl-9"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                    {searchValue && (
                        <button
                            onClick={() => setSearchValue("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                <Button
                                    size="sm"
                                    disabled
                                    className="pointer-events-none opacity-50"
                                    aria-label="Add Product (coming soon)"
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    <span className="hidden sm:inline">Add Product</span>
                                    <span className="sm:hidden">Add</span>
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            This feature is currently in progress
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export to CSV</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Category filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedCategoryLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
                        <DropdownMenuLabel className="text-xs">Category</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ category_id: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${!filters.category_id ? "opacity-100" : "opacity-0"}`} />
                            All Categories
                        </DropdownMenuItem>
                        {categories
                            .filter((c) => c.is_active)
                            .map((cat) => (
                                <DropdownMenuItem
                                    key={cat.id}
                                    className="text-xs"
                                    onClick={() => onFiltersChange({ category_id: cat.id })}
                                >
                                    <Check className={`mr-2 h-3 w-3 ${filters.category_id === cat.id ? "opacity-100" : "opacity-0"}`} />
                                    {cat.name}
                                </DropdownMenuItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Status filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedStatusLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {[
                            { label: "All Status", value: undefined },
                            { label: "Active", value: true },
                            { label: "Inactive", value: false },
                        ].map(({ label, value }) => (
                            <DropdownMenuItem
                                key={label}
                                className="text-xs"
                                onClick={() => onFiltersChange({ is_active: value })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.is_active === value ? "opacity-100" : "opacity-0"}`} />
                                {label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* GST Rate filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedGstLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-xs">GST Rate</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ gst_percentage: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.gst_percentage === undefined ? "opacity-100" : "opacity-0"}`} />
                            All Rates
                        </DropdownMenuItem>
                        {GST_RATES.map((rate) => (
                            <DropdownMenuItem
                                key={rate}
                                className="text-xs"
                                onClick={() => onFiltersChange({ gst_percentage: rate })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.gst_percentage === rate ? "opacity-100" : "opacity-0"}`} />
                                {rate === 0 ? "Exempt (0%)" : `${rate}%`}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Brand filter */}
                {uniqueBrands.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                                {selectedBrandLabel}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44 max-h-64 overflow-y-auto">
                            <DropdownMenuLabel className="text-xs">Brand</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-xs"
                                onClick={() => onFiltersChange({ brand: undefined })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${!filters.brand ? "opacity-100" : "opacity-0"}`} />
                                All Brands
                            </DropdownMenuItem>
                            {uniqueBrands.map((brand) => (
                                <DropdownMenuItem
                                    key={brand}
                                    className="text-xs"
                                    onClick={() => onFiltersChange({ brand })}
                                >
                                    <Check className={`mr-2 h-3 w-3 ${filters.brand === brand ? "opacity-100" : "opacity-0"}`} />
                                    {brand}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Low stock filter */}
                <Button
                    variant={filters.low_stock_only ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                        onFiltersChange({ low_stock_only: filters.low_stock_only ? undefined : true })
                    }
                >
                    Low Stock
                </Button>

                {/* Clear filters */}
                {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                        <Filter className="mr-1 h-3 w-3" />
                        Clear
                        <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                            {activeFilterCount}
                        </Badge>
                    </Button>
                )}
            </div>

            {/* Selection info bar */}
            {selectedCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        {selectedCount} product{selectedCount > 1 ? "s" : ""} selected
                    </span>
                </div>
            )}
        </div>
    );
}
