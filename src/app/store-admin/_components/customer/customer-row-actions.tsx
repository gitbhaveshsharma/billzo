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
    Ban,
    ShieldOff,
    Trash2,
    CreditCard,
    Star,
} from "lucide-react";
import type { Customer } from "@/types/customers.types";
import type { CustomerAction } from "./customer-table";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerRowActionsProps {
    customer: Customer;
    onAction: (action: CustomerAction) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerRowActions({
    customer,
    onAction,
}: CustomerRowActionsProps) {
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
                    Edit Customer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Record payment */}
                {customer.outstanding_balance > 0 && (
                    <DropdownMenuItem onClick={() => onAction("record-payment")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record Payment
                    </DropdownMenuItem>
                )}

                {/* Adjust loyalty points */}
                <DropdownMenuItem onClick={() => onAction("adjust-loyalty")}>
                    <Star className="mr-2 h-4 w-4" />
                    Adjust Loyalty Points
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Activate / Deactivate */}
                {customer.is_active ? (
                    <DropdownMenuItem onClick={() => onAction("deactivate")}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Deactivate
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction("reactivate")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Reactivate
                    </DropdownMenuItem>
                )}

                {/* Blacklist / Unblacklist */}
                {customer.is_blacklisted ? (
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
                    Delete Customer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
