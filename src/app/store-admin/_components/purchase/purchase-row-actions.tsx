"use client";

import {
    MoreHorizontal,
    Eye,
    Pencil,
    CheckCircle,
    XCircle,
    PackageCheck,
    CreditCard,
    Undo2,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PurchaseOrder } from "@/types/purchase.types";
import {
    canEditPO,
    canConfirmPO,
    canCancelPO,
    canReceiveItems,
    canAddPayment,
    canCreateReturn,
    canDeletePO,
} from "@/utils/purchase.utils";
import type { PurchaseAction } from "./purchase-table";

// ============================================================================
// TYPES
// ============================================================================

interface PurchaseRowActionsProps {
    order: PurchaseOrder;
    onAction: (action: PurchaseAction, order: PurchaseOrder) => void;
}

// ============================================================================
// PURCHASE ROW ACTIONS
// ============================================================================

export function PurchaseRowActions({ order, onAction }: PurchaseRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onAction("view", order)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>

                {canEditPO(order.status) && (
                    <DropdownMenuItem onClick={() => onAction("edit", order)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Order
                    </DropdownMenuItem>
                )}

                {canConfirmPO(order.status) && (
                    <DropdownMenuItem onClick={() => onAction("confirm", order)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Order
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {canReceiveItems(order.status) && (
                    <DropdownMenuItem onClick={() => onAction("receive", order)}>
                        <PackageCheck className="mr-2 h-4 w-4" />
                        Receive Items
                    </DropdownMenuItem>
                )}

                {canAddPayment(order) && (
                    <DropdownMenuItem onClick={() => onAction("payment", order)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Add Payment
                    </DropdownMenuItem>
                )}

                {canCreateReturn(order.status) && (
                    <DropdownMenuItem onClick={() => onAction("return", order)}>
                        <Undo2 className="mr-2 h-4 w-4" />
                        Create Return
                    </DropdownMenuItem>
                )}

                {(canCancelPO(order.status) || canDeletePO(order.status)) && (
                    <DropdownMenuSeparator />
                )}

                {canCancelPO(order.status) && (
                    <DropdownMenuItem
                        onClick={() => onAction("cancel", order)}
                        className="text-amber-600 focus:text-amber-600"
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Order
                    </DropdownMenuItem>
                )}

                {canDeletePO(order.status) && (
                    <DropdownMenuItem
                        onClick={() => onAction("delete", order)}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Order
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
