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
    Download,
    ChevronDown,
    X,
    Check,
    Tags,
    UserX,
} from "lucide-react";
import { CUSTOMER_TYPES } from "@/types/customers.types";
import type { CustomerFilters, Customer, CustomerType } from "@/types/customers.types";
import {
    getCustomerTypeLabel,
    exportCustomersToCSV,
    downloadCSV,
} from "@/utils/customers.utils";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerToolbarProps {
    filters: CustomerFilters;
    onFiltersChange: (filters: Partial<CustomerFilters>) => void;
    selectedCount: number;
    onAddCustomer: () => void;
    customers: Customer[];
    onBulkChangeType?: (type: CustomerType) => void;
    onBulkDeactivate?: () => void;
    onBulkAddTags?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerToolbar({
    filters,
    onFiltersChange,
    selectedCount,
    onAddCustomer,
    customers,
    onBulkChangeType,
    onBulkDeactivate,
    onBulkAddTags,
}: CustomerToolbarProps) {
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
        const csv = exportCustomersToCSV(customers);
        downloadCSV(csv, `customers_${new Date().toISOString().slice(0, 10)}.csv`);
    }, [customers]);

    const activeFilterCount = [
        filters.customer_type,
        filters.is_active !== undefined ? "active" : undefined,
        filters.is_blacklisted !== undefined ? "blacklisted" : undefined,
        filters.is_credit_allowed !== undefined ? "credit" : undefined,
        filters.has_outstanding !== undefined ? "outstanding" : undefined,
        filters.city,
        filters.state,
    ].filter(Boolean).length;

    const clearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            customer_type: undefined,
            is_active: undefined,
            is_blacklisted: undefined,
            is_credit_allowed: undefined,
            has_outstanding: undefined,
            city: undefined,
            state: undefined,
            tags: undefined,
            min_purchases: undefined,
            max_purchases: undefined,
            min_loyalty_points: undefined,
        });
    }, [onFiltersChange]);

    const selectedTypeLabel = filters.customer_type
        ? getCustomerTypeLabel(filters.customer_type)
        : "All Types";

    const selectedStatusLabel =
        filters.is_active === undefined
            ? "All Status"
            : filters.is_active
                ? "Active"
                : "Inactive";

    return (
        <div className="space-y-3">
            {/* Top row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone, or code..."
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
                    <Button onClick={onAddCustomer} size="sm">
                        <Plus className="mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Add Customer</span>
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
                        <DropdownMenuLabel className="text-xs">Customer Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ customer_type: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${!filters.customer_type ? "opacity-100" : "opacity-0"}`} />
                            All Types
                        </DropdownMenuItem>
                        {CUSTOMER_TYPES.map((type) => (
                            <DropdownMenuItem
                                key={type}
                                className="text-xs"
                                onClick={() => onFiltersChange({ customer_type: type })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.customer_type === type ? "opacity-100" : "opacity-0"}`} />
                                {getCustomerTypeLabel(type)}
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
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_active: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_active === undefined ? "opacity-100" : "opacity-0"}`} />
                            All Status
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_active: true })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_active === true ? "opacity-100" : "opacity-0"}`} />
                            Active
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_active: false })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_active === false ? "opacity-100" : "opacity-0"}`} />
                            Inactive
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Blacklisted filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {filters.is_blacklisted === undefined
                                ? "Blacklist"
                                : filters.is_blacklisted
                                    ? "Blacklisted"
                                    : "Not Blacklisted"}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_blacklisted: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_blacklisted === undefined ? "opacity-100" : "opacity-0"}`} />
                            All
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_blacklisted: true })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_blacklisted === true ? "opacity-100" : "opacity-0"}`} />
                            Blacklisted
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_blacklisted: false })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_blacklisted === false ? "opacity-100" : "opacity-0"}`} />
                            Not Blacklisted
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Outstanding filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {filters.has_outstanding === undefined
                                ? "Outstanding"
                                : filters.has_outstanding
                                    ? "Has Outstanding"
                                    : "No Outstanding"}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ has_outstanding: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.has_outstanding === undefined ? "opacity-100" : "opacity-0"}`} />
                            All
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ has_outstanding: true })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.has_outstanding === true ? "opacity-100" : "opacity-0"}`} />
                            Has Outstanding
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ has_outstanding: false })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.has_outstanding === false ? "opacity-100" : "opacity-0"}`} />
                            No Outstanding
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Credit filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {filters.is_credit_allowed === undefined
                                ? "Credit"
                                : filters.is_credit_allowed
                                    ? "Credit Enabled"
                                    : "No Credit"}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_credit_allowed: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_credit_allowed === undefined ? "opacity-100" : "opacity-0"}`} />
                            All
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_credit_allowed: true })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_credit_allowed === true ? "opacity-100" : "opacity-0"}`} />
                            Credit Enabled
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ is_credit_allowed: false })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${filters.is_credit_allowed === false ? "opacity-100" : "opacity-0"}`} />
                            No Credit
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear filters */}
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={clearFilters}
                    >
                        <X className="mr-1 h-3 w-3" />
                        Clear
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                            {activeFilterCount}
                        </Badge>
                    </Button>
                )}
            </div>

            {/* Bulk actions bar */}
            {selectedCount > 0 && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium">
                        {selectedCount} selected
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        {/* Bulk change type */}
                        {onBulkChangeType && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                        <Tags className="mr-1 h-3 w-3" />
                                        Change Type
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {CUSTOMER_TYPES.map((type) => (
                                        <DropdownMenuItem
                                            key={type}
                                            className="text-xs"
                                            onClick={() => onBulkChangeType(type)}
                                        >
                                            {getCustomerTypeLabel(type)}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Bulk add tags */}
                        {onBulkAddTags && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={onBulkAddTags}
                            >
                                <Tags className="mr-1 h-3 w-3" />
                                Add Tags
                            </Button>
                        )}

                        {/* Bulk deactivate */}
                        {onBulkDeactivate && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-destructive"
                                onClick={onBulkDeactivate}
                            >
                                <UserX className="mr-1 h-3 w-3" />
                                Deactivate
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
