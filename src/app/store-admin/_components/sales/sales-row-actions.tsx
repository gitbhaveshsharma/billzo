"use client";

import { MoreHorizontal, Eye, Printer, RotateCcw, XCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Sale } from "@/types/sales.types";
import { canCancelSale, canCreateReturn, canAddPayment } from "@/utils/sales.utils";

// ============================================================================
// TYPES
// ============================================================================

export type SaleAction =
    | "view"
    | "print"
    | "cancel"
    | "return"
    | "add_payment";

interface SalesRowActionsProps {
    sale: Sale;
    onAction: (action: SaleAction, sale: Sale) => void;
}

// ============================================================================
// SALES ROW ACTIONS
// ============================================================================

export function SalesRowActions({ sale, onAction }: SalesRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onAction("view", sale)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>

                {sale.status === "COMPLETED" && (
                    <DropdownMenuItem onClick={() => onAction("print", sale)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Receipt
                    </DropdownMenuItem>
                )}

                {canAddPayment(sale) && (
                    <DropdownMenuItem onClick={() => onAction("add_payment", sale)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record Payment
                    </DropdownMenuItem>
                )}

                {canCreateReturn(sale.status) && (
                    <DropdownMenuItem onClick={() => onAction("return", sale)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Process Return
                    </DropdownMenuItem>
                )}

                {canCancelSale(sale.status) && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onAction("cancel", sale)}
                            className="text-red-600 focus:text-red-600"
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Sale
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
