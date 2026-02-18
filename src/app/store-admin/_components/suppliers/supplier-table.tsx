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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import type { Supplier } from "@/types/supplier.types";
import {
    getSupplierInitials,
    getSupplierAvatarColor,
    getSupplierTypeBadgeColor,
    getSupplierTypeLabel,
    getSupplierStatusBadge,
    getPaymentTermLabel,
    formatPhoneDisplay,
    formatRelativeTime,
    formatDate,
} from "@/utils/supplier.utils";
import { SupplierRowActions } from "./supplier-row-actions";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type SupplierAction =
    | "view"
    | "edit"
    | "activate"
    | "deactivate"
    | "toggle-preferred"
    | "blacklist"
    | "unblacklist"
    | "delete";

interface SupplierTableProps {
    suppliers: Supplier[];
    isLoading: boolean;
    selectedIds: string[];
    onToggleSelect: (supplierId: string) => void;
    onSelectAll: (checked: boolean) => void;
    onAction: (action: SupplierAction, supplier: Supplier) => void;
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
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
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
            <TableCell colSpan={8} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                    </svg>
                    <p className="text-sm font-medium">No suppliers found</p>
                    <p className="text-xs">Try adjusting your filters or add a new supplier.</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================

export function SupplierTable({
    suppliers,
    isLoading,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onAction,
}: SupplierTableProps) {
    const allSelected = useMemo(
        () => suppliers.length > 0 && selectedIds.length === suppliers.length,
        [suppliers.length, selectedIds.length]
    );

    const someSelected = useMemo(
        () => selectedIds.length > 0 && selectedIds.length < suppliers.length,
        [selectedIds.length, suppliers.length]
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
                        <TableHead>Supplier</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead className="hidden md:table-cell">City</TableHead>
                        <TableHead className="hidden lg:table-cell">Payment Terms</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : suppliers.length === 0 ? (
                        <EmptyState />
                    ) : (
                        suppliers.map((supplier) => (
                            <SupplierRow
                                key={supplier.id}
                                supplier={supplier}
                                isSelected={selectedIds.includes(supplier.id)}
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

// ============================================================================
// TABLE ROW
// ============================================================================

interface SupplierRowProps {
    supplier: Supplier;
    isSelected: boolean;
    onToggleSelect: (supplierId: string) => void;
    onAction: (action: SupplierAction, supplier: Supplier) => void;
}

function SupplierRow({
    supplier,
    isSelected,
    onToggleSelect,
    onAction,
}: SupplierRowProps) {
    const status = getSupplierStatusBadge(supplier);
    const initials = getSupplierInitials(supplier.name);
    const avatarColor = getSupplierAvatarColor(supplier.name);
    const typeBadgeColor = getSupplierTypeBadgeColor(supplier.type);

    return (
        <TableRow
            className={cn(
                "cursor-pointer transition-colors",
                isSelected && "bg-muted/50"
            )}
            onClick={() => onAction("view", supplier)}
        >
            <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(supplier.id)}
                    aria-label={`Select ${supplier.name}`}
                />
            </TableCell>

            {/* Supplier info */}
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn("text-white text-xs", avatarColor)}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">
                                {supplier.name}
                            </p>
                            {supplier.is_preferred && (
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            #{supplier.supplier_code}
                        </p>
                    </div>
                </div>
            </TableCell>

            {/* Type */}
            <TableCell>
                <Badge className={cn("text-xs", typeBadgeColor)} variant="outline">
                    {getSupplierTypeLabel(supplier.type)}
                </Badge>
            </TableCell>

            {/* Contact (hidden on mobile) */}
            <TableCell className="hidden md:table-cell">
                <div className="min-w-0">
                    {supplier.contact_person && (
                        <p className="text-sm truncate">{supplier.contact_person}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                        {formatPhoneDisplay(supplier.phone) !== "—"
                            ? formatPhoneDisplay(supplier.phone)
                            : supplier.email || "—"}
                    </p>
                </div>
            </TableCell>

            {/* City (hidden on mobile) */}
            <TableCell className="hidden md:table-cell">
                <span className="text-sm text-muted-foreground">
                    {supplier.city || "—"}
                </span>
            </TableCell>

            {/* Payment Terms (hidden on smaller screens) */}
            <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                    {getPaymentTermLabel(supplier.payment_terms)}
                </span>
            </TableCell>

            {/* Status */}
            <TableCell>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge className={cn("text-xs cursor-default", status.color)} variant="outline">
                            {status.label}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        {supplier.blacklisted
                            ? `Blacklisted: ${supplier.blacklist_reason || "No reason provided"}`
                            : supplier.is_active
                                ? supplier.is_preferred
                                    ? "Preferred supplier"
                                    : "Supplier is active"
                                : "Supplier is deactivated"}
                    </TooltipContent>
                </Tooltip>
            </TableCell>

            {/* Actions */}
            <TableCell onClick={(e) => e.stopPropagation()}>
                <SupplierRowActions
                    supplier={supplier}
                    onAction={(action) => onAction(action, supplier)}
                />
            </TableCell>
        </TableRow>
    );
}
