"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
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
    UserCheck,
    UserX,
    Ban,
    Shield,
    X,
} from "lucide-react";
import type { StoreUserFilters, AvailableRolesResponse } from "@/types/store-users.types";
import { exportUsersToCSV, downloadCSV } from "@/utils/store-users.utils";
import { useStoreAdmin } from "../../_context/store-admin-context";
import type { EnrichedStoreUser } from "@/types/store-users.types";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeToolbarProps {
    filters: StoreUserFilters;
    onFiltersChange: (filters: Partial<StoreUserFilters>) => void;
    selectedCount: number;
    onAddEmployee: () => void;
    onBulkAction: (action: "activate" | "deactivate" | "ban" | "change-role") => void;
    users: EnrichedStoreUser[];
    availableRoles: AvailableRolesResponse | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmployeeToolbar({
    filters,
    onFiltersChange,
    selectedCount,
    onAddEmployee,
    onBulkAction,
    users,
    availableRoles,
}: EmployeeToolbarProps) {
    const { canManageEmployees } = useStoreAdmin();
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
        const csv = exportUsersToCSV(users);
        downloadCSV(csv, `employees_${new Date().toISOString().slice(0, 10)}.csv`);
    }, [users]);

    const activeFilterCount = [
        filters.role_id,
        filters.is_active !== undefined ? "active" : undefined,
        filters.is_banned !== undefined ? "banned" : undefined,
    ].filter(Boolean).length;

    const clearFilters = useCallback(() => {
        setSearchValue("");
        onFiltersChange({
            search: undefined,
            role_id: undefined,
            is_active: undefined,
            is_banned: undefined,
            department: undefined,
        });
    }, [onFiltersChange]);

    return (
        <div className="space-y-3">
            {/* Top row — Search + Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or code..."
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
                    {canManageEmployees && (
                        <Button onClick={onAddEmployee} size="sm">
                            <Plus className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">Add Employee</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    )}

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
                {/* Role filter */}
                <Select
                    value={filters.role_id || ""}
                    onChange={(e) =>
                        onFiltersChange({ role_id: e.target.value || undefined })
                    }
                    className="h-8 w-auto min-w-[140px] text-xs"
                >
                    <option value="">All Roles</option>
                    {availableRoles?.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.role_display_name}
                        </option>
                    ))}
                </Select>

                {/* Status filter */}
                <Select
                    value={
                        filters.is_active === undefined
                            ? ""
                            : filters.is_active
                                ? "active"
                                : "inactive"
                    }
                    onChange={(e) => {
                        const val = e.target.value;
                        onFiltersChange({
                            is_active: val === "" ? undefined : val === "active",
                        });
                    }}
                    className="h-8 w-auto min-w-[120px] text-xs"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </Select>

                {/* Banned filter */}
                <Select
                    value={
                        filters.is_banned === undefined
                            ? ""
                            : filters.is_banned
                                ? "banned"
                                : "not-banned"
                    }
                    onChange={(e) => {
                        const val = e.target.value;
                        onFiltersChange({
                            is_banned: val === "" ? undefined : val === "banned",
                        });
                    }}
                    className="h-8 w-auto min-w-[120px] text-xs"
                >
                    <option value="">Ban Status</option>
                    <option value="banned">Banned</option>
                    <option value="not-banned">Not Banned</option>
                </Select>

                {/* Active filter count + clear */}
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

            {/* Bulk actions bar */}
            {selectedCount > 0 && canManageEmployees && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        {selectedCount} selected
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onBulkAction("activate")}
                                >
                                    <UserCheck className="mr-1 h-3 w-3" />
                                    Activate
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Activate selected users</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onBulkAction("deactivate")}
                                >
                                    <UserX className="mr-1 h-3 w-3" />
                                    Deactivate
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Deactivate selected users</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-orange-600"
                                    onClick={() => onBulkAction("ban")}
                                >
                                    <Ban className="mr-1 h-3 w-3" />
                                    Ban
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ban selected users</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onBulkAction("change-role")}
                                >
                                    <Shield className="mr-1 h-3 w-3" />
                                    Change Role
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Change role for selected users</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
}
