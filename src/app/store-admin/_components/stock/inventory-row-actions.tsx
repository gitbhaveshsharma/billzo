"use client";

import {
    MoreHorizontal,
    Eye,
    Pencil,
    ArrowDownUp,
    History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnrichedInventoryRecord } from "@/types/inventory.types";

// ============================================================================
// TYPES
// ============================================================================

export type InventoryAction =
    | "view"
    | "edit"
    | "adjust"
    | "transfer"
    | "history";

interface InventoryRowActionsProps {
    item: EnrichedInventoryRecord;
    onAction: (action: InventoryAction, item: EnrichedInventoryRecord) => void;
}

// ============================================================================
// INVENTORY ROW ACTIONS
// ============================================================================

export function InventoryRowActions({ item, onAction }: InventoryRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onAction("view", item)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onAction("edit", item)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Reorder Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onAction("adjust", item)}>
                    <ArrowDownUp className="mr-2 h-4 w-4" />
                    Stock Adjustment
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onAction("transfer", item)}>
                    <ArrowDownUp className="mr-2 h-4 w-4" />
                    Stock Transfer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onAction("history", item)}>
                    <History className="mr-2 h-4 w-4" />
                    Transaction History
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
