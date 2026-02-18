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
import type { SupplierFilters } from "@/types/supplier.types";
import { SUPPLIER_TYPES, PAYMENT_TERMS } from "@/types/supplier.types";
import type { Supplier } from "@/types/supplier.types";
import {
    getSupplierTypeLabel,
    getPaymentTermLabel,
    exportSuppliersToCSV,
    downloadCSV,
} from "@/utils/supplier.utils";

// ============================================================================
// TYPES
// ============================================================================

interface SupplierToolbarProps {
    filters: SupplierFilters;
    onFiltersChange: (filters: Partial<SupplierFilters>) => void;
    selectedCount: number;
    onAddSupplier: () => void;
    suppliers: Supplier[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierToolbar({
    filters,
    onFiltersChange,
    selectedCount,
    onAddSupplier,
    suppliers,
}: SupplierToolbarProps) {
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
        const csv = exportSuppliersToCSV(suppliers);
        downloadCSV(csv, `suppliers_${new Date().toISOString().slice(0, 10)}.csv`);
    }, [suppliers]);

    const activeFilterCount = [
        filters.type,
        filters.is_active !== undefined ? "active" : undefined,
        filters.is_preferred !== undefined ? "preferred" : undefined,
        filters.blacklisted !== undefined ? "blacklisted" : undefined,
        filters.payment_terms,
        filters.has_gstin !== undefined ? "gstin" : undefined,
    ].filter(Boolean).length;

    const clearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            type: undefined,
            is_active: undefined,
            is_preferred: undefined,
            blacklisted: undefined,
            payment_terms: undefined,
            has_gstin: undefined,
            city: undefined,
            state: undefined,
        });
    }, [onFiltersChange]);

    // Derived labels for dropdown triggers
    const selectedTypeLabel = filters.type
        ? getSupplierTypeLabel(filters.type)
        : "All Types";

    const selectedStatusLabel =
        filters.is_active === undefined
            ? "All Status"
            : filters.is_active
                ? "Active"
                : "Inactive";

    const selectedPreferredLabel =
        filters.is_preferred === undefined
            ? "Preferred"
            : filters.is_preferred
                ? "Preferred Only"
                : "Non-Preferred";

    const selectedPaymentLabel = filters.payment_terms
        ? getPaymentTermLabel(filters.payment_terms)
        : "Payment Terms";

    const selectedGstLabel =
        filters.has_gstin === undefined
            ? "GST Status"
            : filters.has_gstin
                ? "With GST"
                : "Without GST";

    return (
        <div className="space-y-3">
            {/* Top row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, code, or contact..."
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
                    <Button onClick={onAddSupplier} size="sm">
                        <Plus className="mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Add Supplier</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
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
                {/* Type filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedTypeLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuLabel className="text-xs">Supplier Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ type: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${!filters.type ? "opacity-100" : "opacity-0"}`} />
                            All Types
                        </DropdownMenuItem>
                        {SUPPLIER_TYPES.map((type) => (
                            <DropdownMenuItem
                                key={type}
                                className="text-xs"
                                onClick={() => onFiltersChange({ type })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.type === type ? "opacity-100" : "opacity-0"}`} />
                                {getSupplierTypeLabel(type)}
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

                {/* Preferred filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedPreferredLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuLabel className="text-xs">Preferred</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {[
                            { label: "All", value: undefined },
                            { label: "Preferred Only", value: true },
                            { label: "Non-Preferred", value: false },
                        ].map(({ label, value }) => (
                            <DropdownMenuItem
                                key={label}
                                className="text-xs"
                                onClick={() => onFiltersChange({ is_preferred: value })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.is_preferred === value ? "opacity-100" : "opacity-0"}`} />
                                {label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Payment Terms filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedPaymentLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuLabel className="text-xs">Payment Terms</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ payment_terms: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${!filters.payment_terms ? "opacity-100" : "opacity-0"}`} />
                            All Terms
                        </DropdownMenuItem>
                        {PAYMENT_TERMS.map((term) => (
                            <DropdownMenuItem
                                key={term}
                                className="text-xs"
                                onClick={() => onFiltersChange({ payment_terms: term })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.payment_terms === term ? "opacity-100" : "opacity-0"}`} />
                                {getPaymentTermLabel(term)}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* GST filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedGstLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-xs">GST Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {[
                            { label: "All", value: undefined },
                            { label: "With GST", value: true },
                            { label: "Without GST", value: false },
                        ].map(({ label, value }) => (
                            <DropdownMenuItem
                                key={label}
                                className="text-xs"
                                onClick={() => onFiltersChange({ has_gstin: value })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.has_gstin === value ? "opacity-100" : "opacity-0"}`} />
                                {label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

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
                        {selectedCount} supplier{selectedCount > 1 ? "s" : ""} selected
                    </span>
                </div>
            )}
        </div>
    );
}
