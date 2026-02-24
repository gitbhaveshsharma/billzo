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
    Trash2,
} from "lucide-react";
import type { Product } from "@/types/product.types";
import type { ProductAction } from "./product-table";

// ============================================================================
// TYPES
// ============================================================================

interface ProductRowActionsProps {
    product: Product;
    onAction: (action: ProductAction) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductRowActions({
    product,
    onAction,
}: ProductRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onAction("view")}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onAction("edit")}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Product
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {product.is_active ? (
                    <DropdownMenuItem onClick={() => onAction("toggle-active")}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Deactivate
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => onAction("toggle-active")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Activate
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => onAction("delete")}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Product
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
