"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Eye,
    Pencil,
    Shield,
    UserCheck,
    UserX,
    Ban,
    ShieldOff,
    RotateCcw,
    LogOut,
    Trash2,
} from "lucide-react";
import type { EnrichedStoreUser } from "@/types/store-users.types";
import type { EmployeeAction } from "./employee-table";

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeRowActionsProps {
    user: EnrichedStoreUser;
    canManage: boolean;
    onAction: (action: EmployeeAction) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmployeeRowActions({
    user,
    canManage,
    onAction,
}: EmployeeRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {/* View — always available */}
                <DropdownMenuItem onClick={() => onAction("view")}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>

                {canManage && (
                    <>
                        <DropdownMenuItem onClick={() => onAction("edit")}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Employee
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onAction("edit-role")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Activate / Deactivate */}
                        {user.is_active ? (
                            <DropdownMenuItem onClick={() => onAction("deactivate")}>
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => onAction("activate")}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                            </DropdownMenuItem>
                        )}

                        {/* Ban / Unban */}
                        {user.is_banned ? (
                            <DropdownMenuItem onClick={() => onAction("unban")}>
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Unban User
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                onClick={() => onAction("ban")}
                                className="text-orange-600 focus:text-orange-600"
                            >
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => onAction("reset-access")}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset Access
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onAction("force-logout")}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Force Logout
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => onAction("delete")}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Employee
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
