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
    CheckCircle2,
    XCircle,
    Star,
    StarOff,
    Ban,
    ShieldOff,
    Trash2,
} from "lucide-react";
import type { Supplier } from "@/types/supplier.types";
import type { SupplierAction } from "./supplier-table";

// ============================================================================
// TYPES
// ============================================================================

interface SupplierRowActionsProps {
    supplier: Supplier;
    onAction: (action: SupplierAction) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierRowActions({
    supplier,
    onAction,
}: SupplierRowActionsProps) {
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

                <DropdownMenuItem onClick={() => onAction("edit")}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Supplier
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Activate / Deactivate */}
                {supplier.is_active ? (
                    <DropdownMenuItem onClick={() => onAction("deactivate")}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Deactivate
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction("activate")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Activate
                    </DropdownMenuItem>
                )}

                {/* Toggle Preferred */}
                {supplier.is_preferred ? (
                    <DropdownMenuItem onClick={() => onAction("toggle-preferred")}>
                        <StarOff className="mr-2 h-4 w-4" />
                        Remove Preferred
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction("toggle-preferred")}>
                        <Star className="mr-2 h-4 w-4" />
                        Mark Preferred
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Blacklist / Unblacklist */}
                {supplier.blacklisted ? (
                    <DropdownMenuItem onClick={() => onAction("unblacklist")}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Remove Blacklist
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        onClick={() => onAction("blacklist")}
                        className="text-orange-600 focus:text-orange-600"
                    >
                        <Ban className="mr-2 h-4 w-4" />
                        Blacklist
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => onAction("delete")}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Supplier
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
