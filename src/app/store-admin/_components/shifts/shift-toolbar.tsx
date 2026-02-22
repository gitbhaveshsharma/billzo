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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SHIFT_STATUSES } from "@/types/shifts.types";
import type { ShiftFilters, CashShift } from "@/types/shifts.types";
import {
    getShiftStatusLabel,
    exportShiftsToCSV,
    downloadCSV,
} from "@/utils/shifts.utils";

// ============================================================================
// TYPES
// ============================================================================

interface ShiftToolbarProps {
    filters: ShiftFilters;
    shifts: CashShift[];
    onFiltersChange: (filters: Partial<ShiftFilters>) => void;
    isLoading: boolean;
    /** If true, hides the "Open Shift" actions (e.g. for admin view) */
    showDateRange?: boolean;
}

// ============================================================================
// SHIFT TOOLBAR
// ============================================================================

export function ShiftToolbar({
    filters,
    shifts,
    onFiltersChange,
    isLoading,
    showDateRange = true,
}: ShiftToolbarProps) {
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
        filters.terminal_id,
        filters.opened_by,
        filters.date_from,
        filters.date_to,
        filters.has_discrepancy !== undefined ? "active" : undefined,
    ].filter(Boolean).length;

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            status: undefined,
            terminal_id: undefined,
            opened_by: undefined,
            date_from: undefined,
            date_to: undefined,
            has_discrepancy: undefined,
        });
    }, [onFiltersChange]);

    // CSV export
    const handleExport = useCallback(() => {
        if (!shifts.length) return;
        const csv = exportShiftsToCSV(shifts);
        downloadCSV(csv, `shifts-${new Date().toISOString().split("T")[0]}.csv`);
    }, [shifts]);

    // Get unique terminals from current shifts
    const uniqueTerminals = Array.from(
        new Set(shifts.filter((s) => s.terminal_name).map((s) => s.terminal_name!))
    );

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Search + Filters */}
            <div className="flex flex-1 flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Search terminal, notes..."
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
                        <DropdownMenuLabel>Shift Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={!filters.status}
                            onCheckedChange={() =>
                                onFiltersChange({ status: undefined })
                            }
                        >
                            All
                        </DropdownMenuCheckboxItem>
                        {SHIFT_STATUSES.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={filters.status === status}
                                onCheckedChange={() =>
                                    onFiltersChange({
                                        status: filters.status === status ? undefined : status,
                                    })
                                }
                            >
                                {getShiftStatusLabel(status)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Terminal Filter */}
                {uniqueTerminals.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                                Terminal
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                            <DropdownMenuLabel>Terminal</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={!filters.terminal_id}
                                onCheckedChange={() =>
                                    onFiltersChange({ terminal_id: undefined })
                                }
                            >
                                All Terminals
                            </DropdownMenuCheckboxItem>
                            {uniqueTerminals.map((terminal) => (
                                <DropdownMenuCheckboxItem
                                    key={terminal}
                                    checked={filters.terminal_id === terminal}
                                    onCheckedChange={() =>
                                        onFiltersChange({
                                            terminal_id:
                                                filters.terminal_id === terminal
                                                    ? undefined
                                                    : terminal,
                                        })
                                    }
                                >
                                    {terminal}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Discrepancy Toggle */}
                <div className="flex items-center gap-1.5">
                    <Switch
                        id="discrepancy-toggle"
                        checked={filters.has_discrepancy === true}
                        onCheckedChange={(checked) =>
                            onFiltersChange({
                                has_discrepancy: checked ? true : undefined,
                            })
                        }
                        disabled={isLoading}
                    />
                    <Label htmlFor="discrepancy-toggle" className="text-xs cursor-pointer">
                        Discrepancies
                    </Label>
                </div>

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
                            placeholder="From"
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
                            placeholder="To"
                            disabled={isLoading}
                        />
                    </div>
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
                    disabled={!shifts.length || isLoading}
                    className="gap-1.5"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                </Button>
            </div>
        </div>
    );
}
