"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Package } from "lucide-react";
import type { EnrichedInventoryRecord } from "@/types/inventory.types";
import {
    getStockLevelStatus,
    getStockLevelLabel,
    getStockLevelColor,
    formatCurrency,
    formatQuantity,
    formatRelativeTime,
} from "@/utils/inventory.utils";
import { InventoryRowActions, type InventoryAction } from "./inventory-row-actions";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryTableProps {
    items: EnrichedInventoryRecord[];
    selectedIds: string[];
    isLoading: boolean;
    onToggleSelect: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
    onAction: (action: InventoryAction, item: EnrichedInventoryRecord) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function TipHead({ children, tip }: { children: React.ReactNode; tip: string }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-default select-none">
                        {children}
                        <Info className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {tip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
            <TableCell colSpan={12} className="h-48">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="bg-muted rounded-full p-3">
                        <Package className="text-muted-foreground h-6 w-6" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">
                        No inventory records found
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Inventory entries are created automatically when products receive stock.
                    </p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// INVENTORY ROW
// ============================================================================

function InventoryRow({
    item,
    isSelected,
    onToggleSelect,
    onAction,
}: {
    item: EnrichedInventoryRecord;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onAction: (action: InventoryAction, item: EnrichedInventoryRecord) => void;
}) {
    const stockStatus = getStockLevelStatus(
        item.quantity_on_hand,
        item.reorder_point,
        item.maximum_stock
    );

    return (
        <TableRow
            className="cursor-pointer"
            onClick={() => onAction("view", item)}
        >
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(item.id)}
                />
            </TableCell>
            <TableCell className="font-medium max-w-[200px] truncate">
                {item.product?.name ?? "Unknown Product"}
                {item.variant?.name && (
                    <span className="text-muted-foreground text-xs ml-1">
                        ({item.variant.name})
                    </span>
                )}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {item.product?.product_code ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {item.warehouse ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {item.location ?? "—"}
            </TableCell>
            <TableCell className="text-right font-medium">
                {formatQuantity(item.quantity_on_hand)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground text-sm">
                {formatQuantity(item.quantity_committed)}
            </TableCell>
            <TableCell className="text-right font-medium">
                {formatQuantity(item.quantity_available)}
            </TableCell>
            <TableCell>
                <Badge variant="secondary" className={getStockLevelColor(stockStatus)}>
                    {getStockLevelLabel(stockStatus)}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
                {formatCurrency(item.total_value)}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
                {formatRelativeTime(item.last_updated_at ?? item.updated_at)}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <InventoryRowActions item={item} onAction={onAction} />
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// INVENTORY TABLE
// ============================================================================

export function InventoryTable({
    items,
    selectedIds,
    isLoading,
    onToggleSelect,
    onSelectAll,
    onAction,
}: InventoryTableProps) {
    const allSelected = items.length > 0 && selectedIds.length === items.length;

    const handleSelectAll = () => {
        if (allSelected) {
            onSelectAll([]);
        } else {
            onSelectAll(items.map((item) => item.id));
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                disabled={isLoading || !items.length}
                            />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">
                            <TipHead tip="Total physical units in the warehouse. Includes both available stock and units reserved for pending orders.">
                                On Hand
                            </TipHead>
                        </TableHead>
                        <TableHead className="text-right">
                            <TipHead tip="Units committed to pending sales or transfers but not yet dispatched. Cannot be sold until released.">
                                Reserved
                            </TipHead>
                        </TableHead>
                        <TableHead className="text-right">
                            <TipHead tip="On Hand minus Reserved. The quantity you can freely sell right now.">
                                Available
                            </TipHead>
                        </TableHead>
                        <TableHead>
                            <TipHead tip="Stock health level: Normal, Low (at reorder point), or Out of Stock.">
                                Status
                            </TipHead>
                        </TableHead>
                        <TableHead className="text-right">
                            <TipHead tip="Average Cost × On Hand quantity. The total book value of your current stock for this product.">
                                Value
                            </TipHead>
                        </TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : items.length === 0 ? (
                        <EmptyState />
                    ) : (
                        items.map((item) => (
                            <InventoryRow
                                key={item.id}
                                item={item}
                                isSelected={selectedIds.includes(item.id)}
                                onToggleSelect={onToggleSelect}
                                onAction={onAction}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
