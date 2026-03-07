"use client";

import { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnrichedStoreUser } from "@/types/store-users.types";
import {
    getUserInitials,
    getAvatarColor,
    getRoleBadgeColor,
    getUserStatusBadge,
    getEmploymentStatusBadgeColor,
    getEmploymentStatusDisplayName,
    formatRelativeTime,
    formatDate,
} from "@/utils/store-users.utils";
import { EmployeeRowActions } from "./employee-row-actions";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeTableProps {
    users: EnrichedStoreUser[];
    isLoading: boolean;
    selectedIds: string[];
    onToggleSelect: (userId: string) => void;
    onSelectAll: (checked: boolean) => void;
    onAction: (action: EmployeeAction, user: EnrichedStoreUser) => void;
    canManage: (target: EnrichedStoreUser) => boolean;
}

export type EmployeeAction =
    | "view"
    | "edit"
    | "edit-role"
    | "activate"
    | "deactivate"
    | "ban"
    | "unban"
    | "reset-access"
    | "force-logout"
    | "delete";

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
    return (
        <TableRow>
            <TableCell colSpan={7} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <p className="text-sm font-medium">No employees found</p>
                    <p className="text-xs">Try adjusting your filters or add a new employee.</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================

export function EmployeeTable({
    users,
    isLoading,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onAction,
    canManage,
}: EmployeeTableProps) {
    const allSelected = useMemo(
        () => users.length > 0 && selectedIds.length === users.length,
        [users.length, selectedIds.length]
    );

    const someSelected = useMemo(
        () => selectedIds.length > 0 && selectedIds.length < users.length,
        [selectedIds.length, users.length]
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox
                                checked={allSelected}
                                ref={(el) => {
                                    if (el) {
                                        (el as unknown as HTMLInputElement).indeterminate = someSelected;
                                    }
                                }}
                                onCheckedChange={(checked) => onSelectAll(!!checked)}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                        <TableHead className="w-12">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : users.length === 0 ? (
                        <EmptyState />
                    ) : (
                        users.map((user) => (
                            <EmployeeRow
                                key={user.id}
                                user={user}
                                isSelected={selectedIds.includes(user.user_id)}
                                onToggleSelect={onToggleSelect}
                                onAction={onAction}
                                canManage={canManage(user)}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// ============================================================================
// TABLE ROW
// ============================================================================

interface EmployeeRowProps {
    user: EnrichedStoreUser;
    isSelected: boolean;
    onToggleSelect: (userId: string) => void;
    onAction: (action: EmployeeAction, user: EnrichedStoreUser) => void;
    canManage: boolean;
}

function EmployeeRow({
    user,
    isSelected,
    onToggleSelect,
    onAction,
    canManage,
}: EmployeeRowProps) {
    const status = getUserStatusBadge(user);
    const initials = getUserInitials(user.full_name);
    const avatarColor = getAvatarColor(user.full_name);
    const roleBadgeColor = getRoleBadgeColor(user.role_name);

    return (
        <TableRow
            className={cn(
                "cursor-pointer transition-colors",
                isSelected && "bg-muted/50"
            )}
            onClick={() => onAction("view", user)}
        >
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(user.user_id)}
                    aria-label={`Select ${user.full_name || user.email}`}
                />
            </TableCell>

            {/* Employee info */}
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_picture || undefined} alt={user.full_name || ""} />
                        <AvatarFallback className={cn("text-white text-xs", avatarColor)}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                            {user.full_name || "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                        </p>
                        {user.employee_code && (
                            <p className="text-xs text-muted-foreground">
                                #{user.employee_code}
                            </p>
                        )}
                    </div>
                </div>
            </TableCell>

            {/* Role */}
            <TableCell>
                <Badge className={cn("text-xs", roleBadgeColor)} variant="outline">
                    {user.role_display_name || user.role_name}
                </Badge>
            </TableCell>

            {/* Status */}
            <TableCell>
                <div className="flex flex-col gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className={cn("text-xs cursor-default w-fit", status.color)} variant="outline">
                                {status.text}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            {user.is_banned
                                ? `Banned: ${user.banned_reason || "No reason provided"}`
                                : user.is_active
                                    ? "User is active and can log in"
                                    : "User is deactivated"}
                        </TooltipContent>
                    </Tooltip>
                    {user.employment_status && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    className={cn("text-xs cursor-default w-fit", getEmploymentStatusBadgeColor(user.employment_status))}
                                    variant="outline"
                                >
                                    {getEmploymentStatusDisplayName(user.employment_status)}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Employment status</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TableCell>

            {/* Department (hidden on mobile) */}
            <TableCell className="hidden md:table-cell">
                <span className="text-sm text-muted-foreground">
                    {user.department || "—"}
                </span>
            </TableCell>

            {/* Last login (hidden on mobile) */}
            <TableCell className="hidden lg:table-cell">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="text-sm text-muted-foreground cursor-default">
                            {formatRelativeTime(user.last_login_at)}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        {user.last_login_at
                            ? formatDate(user.last_login_at, true)
                            : "Never logged in"}
                    </TooltipContent>
                </Tooltip>
            </TableCell>

            {/* Actions */}
            <TableCell onClick={(e) => e.stopPropagation()}>
                <EmployeeRowActions
                    user={user}
                    canManage={canManage}
                    onAction={(action) => onAction(action, user)}
                />
            </TableCell>
        </TableRow>
    );
}
