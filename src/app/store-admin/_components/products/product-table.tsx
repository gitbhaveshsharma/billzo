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
import type { Product, Category } from "@/types/product.types";
import {
    formatCurrency,
    getStockStatusLabel,
    getStockStatusColor,
} from "@/utils/product.utils";
import { ProductRowActions } from "./product-row-actions";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type ProductAction =
    | "view"
    | "edit"
    | "toggle-active"
    | "delete";

interface ProductTableProps {
    products: Product[];
    isLoading: boolean;
    selectedIds: string[];
    onToggleSelect: (productId: string) => void;
    onSelectAll: (checked: boolean) => void;
    onAction: (action: ProductAction, product: Product) => void;
    categories: Category[];
}

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
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
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
            <TableCell colSpan={9} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                    <p className="text-sm font-medium">No products found</p>
                    <p className="text-xs">Try adjusting your filters or add a new product.</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================

export function ProductTable({
    products,
    isLoading,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onAction,
    categories,
}: ProductTableProps) {
    const allSelected = useMemo(
        () => products.length > 0 && selectedIds.length === products.length,
        [products.length, selectedIds.length]
    );

    const someSelected = useMemo(
        () => selectedIds.length > 0 && selectedIds.length < products.length,
        [selectedIds.length, products.length]
    );

    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories.forEach((c) => map.set(c.id, c.name));
        return map;
    }, [categories]);

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
                        <TableHead>Product</TableHead>
                        <TableHead className="hidden md:table-cell">Category</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead className="hidden md:table-cell">Selling Price</TableHead>
                        <TableHead className="hidden lg:table-cell">GST</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : products.length === 0 ? (
                        <EmptyState />
                    ) : (
                        products.map((product) => (
                            <ProductRow
                                key={product.id}
                                product={product}
                                isSelected={selectedIds.includes(product.id)}
                                onToggleSelect={onToggleSelect}
                                onAction={onAction}
                                categoryName={product.category_id ? categoryMap.get(product.category_id) : undefined}
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

interface ProductRowProps {
    product: Product;
    isSelected: boolean;
    onToggleSelect: (productId: string) => void;
    onAction: (action: ProductAction, product: Product) => void;
    categoryName?: string;
}

function ProductRow({
    product,
    isSelected,
    onToggleSelect,
    onAction,
    categoryName,
}: ProductRowProps) {
    const initials = product.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    // Use the enriched product's inventory if available
    const inventory = (product as unknown as { inventory?: { quantity_on_hand: number; reorder_point: number; maximum_stock?: number } }).inventory ?? null;
    const stockLabel = getStockStatusLabel(inventory as Parameters<typeof getStockStatusLabel>[0]);
    const stockColor = getStockStatusColor(inventory as Parameters<typeof getStockStatusColor>[0]);

    return (
        <TableRow
            className={cn(
                "cursor-pointer transition-colors",
                isSelected && "bg-muted/50"
            )}
            onClick={() => onAction("view", product)}
        >
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(product.id)}
                    aria-label={`Select ${product.name}`}
                />
            </TableCell>

            {/* Product info */}
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-md">
                        {product.primary_image ? (
                            <AvatarImage src={product.primary_image} alt={product.name} />
                        ) : null}
                        <AvatarFallback className="rounded-md bg-muted text-xs">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground truncate">
                                #{product.product_code}
                            </p>
                            {product.barcode && (
                                <span className="text-xs text-muted-foreground">
                                    · {product.barcode}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* Category */}
            <TableCell className="hidden md:table-cell">
                <span className="text-sm text-muted-foreground">
                    {categoryName || "—"}
                </span>
            </TableCell>

            {/* MRP */}
            <TableCell>
                <span className="text-sm font-medium">{formatCurrency(product.mrp)}</span>
            </TableCell>

            {/* Selling Price */}
            <TableCell className="hidden md:table-cell">
                <span className="text-sm">{formatCurrency(product.selling_price)}</span>
            </TableCell>

            {/* GST */}
            <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                    {product.gst_percentage === 0 ? "Exempt" : `${product.gst_percentage}%`}
                </span>
            </TableCell>

            {/* Stock Status */}
            <TableCell>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge className={cn("text-xs cursor-default", stockColor)} variant="outline">
                            {stockLabel}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        {inventory
                            ? `On hand: ${(inventory as { quantity_on_hand: number }).quantity_on_hand}`
                            : "No inventory record"}
                    </TooltipContent>
                </Tooltip>
            </TableCell>

            {/* Active Status */}
            <TableCell>
                <Badge
                    variant={product.is_active ? "success" : "secondary"}
                    className="text-xs"
                >
                    {product.is_active ? "Active" : "Inactive"}
                </Badge>
            </TableCell>

            {/* Actions */}
            <TableCell onClick={(e) => e.stopPropagation()}>
                <ProductRowActions
                    product={product}
                    onAction={(action) => onAction(action, product)}
                />
            </TableCell>
        </TableRow>
    );
}
