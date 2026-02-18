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
    UserCheck,
    UserX,
    Ban,
    Shield,
    X,
    Check,
} from "lucide-react";
import type { StoreUserFilters, AvailableRolesResponse } from "@/types/store-users.types";
import { exportUsersToCSV, downloadCSV } from "@/utils/store-users.utils";
import { useStoreAdmin } from "../../_context/store-admin-context";
import type { EnrichedStoreUser } from "@/types/store-users.types";

interface EmployeeToolbarProps {
    filters: StoreUserFilters;
    onFiltersChange: (filters: Partial<StoreUserFilters>) => void;
    selectedCount: number;
    onAddEmployee: () => void;
    onBulkAction: (action: "activate" | "deactivate" | "ban" | "change-role") => void;
    users: EnrichedStoreUser[];
    availableRoles: AvailableRolesResponse | null;
}

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

    // Derived labels for dropdown triggers
    const selectedRoleLabel =
        availableRoles?.roles.find((r) => r.id === filters.role_id)?.role_display_name ?? "All Roles";

    const selectedStatusLabel =
        filters.is_active === undefined ? "All Status" : filters.is_active ? "Active" : "Inactive";

    const selectedBanLabel =
        filters.is_banned === undefined ? "Ban Status" : filters.is_banned ? "Banned" : "Not Banned";

    return (
        <div className="space-y-3">
            {/* Top row */}
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedRoleLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="text-xs">Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-xs"
                            onClick={() => onFiltersChange({ role_id: undefined })}
                        >
                            <Check className={`mr-2 h-3 w-3 ${!filters.role_id ? "opacity-100" : "opacity-0"}`} />
                            All Roles
                        </DropdownMenuItem>
                        {availableRoles?.roles.map((role) => (
                            <DropdownMenuItem
                                key={role.id}
                                className="text-xs"
                                onClick={() => onFiltersChange({ role_id: role.id })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.role_id === role.id ? "opacity-100" : "opacity-0"}`} />
                                {role.role_display_name}
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

                {/* Ban Status filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            {selectedBanLabel}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-xs">Ban Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {[
                            { label: "All", value: undefined },
                            { label: "Banned", value: true },
                            { label: "Not Banned", value: false },
                        ].map(({ label, value }) => (
                            <DropdownMenuItem
                                key={label}
                                className="text-xs"
                                onClick={() => onFiltersChange({ is_banned: value })}
                            >
                                <Check className={`mr-2 h-3 w-3 ${filters.is_banned === value ? "opacity-100" : "opacity-0"}`} />
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

            {/* Bulk actions bar */}
            {selectedCount > 0 && canManageEmployees && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
                    <span className="text-sm font-medium text-muted-foreground">
                        {selectedCount} selected
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onBulkAction("activate")}>
                                    <UserCheck className="mr-1 h-3 w-3" />
                                    Activate
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Activate selected users</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onBulkAction("deactivate")}>
                                    <UserX className="mr-1 h-3 w-3" />
                                    Deactivate
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Deactivate selected users</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs text-orange-600" onClick={() => onBulkAction("ban")}>
                                    <Ban className="mr-1 h-3 w-3" />
                                    Ban
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ban selected users</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onBulkAction("change-role")}>
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