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
import { AlertTriangle } from "lucide-react";
import type { Customer } from "@/types/customers.types";
import {
    getCustomerInitials,
    getCustomerTypeLabel,
    getCustomerTypeColor,
    getCreditStatus,
    getCreditStatusLabel,
    getCreditStatusColor,
    formatCurrency,
    formatPhone,
    formatPoints,
    formatRelativeTime,
} from "@/utils/customers.utils";
import { CustomerRowActions } from "./customer-row-actions";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type CustomerAction =
    | "view"
    | "edit"
    | "deactivate"
    | "reactivate"
    | "blacklist"
    | "unblacklist"
    | "record-payment"
    | "adjust-loyalty"
    | "delete";

interface CustomerTableProps {
    customers: Customer[];
    isLoading: boolean;
    selectedIds: string[];
    onToggleSelect: (customerId: string) => void;
    onSelectAll: (checked: boolean) => void;
    onAction: (action: CustomerAction, customer: Customer) => void;
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
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <p className="text-sm font-medium">No customers found</p>
                    <p className="text-xs">Try adjusting your filters or add a new customer.</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================

export function CustomerTable({
    customers,
    isLoading,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onAction,
}: CustomerTableProps) {
    const allSelected = useMemo(
        () => customers.length > 0 && selectedIds.length === customers.length,
        [customers.length, selectedIds.length]
    );

    const someSelected = useMemo(
        () => selectedIds.length > 0 && selectedIds.length < customers.length,
        [selectedIds.length, customers.length]
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
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Phone</TableHead>
                        <TableHead className="hidden md:table-cell">City</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Purchases</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Outstanding</TableHead>
                        <TableHead className="hidden xl:table-cell text-right">Points</TableHead>
                        <TableHead className="w-12">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableSkeleton />
                    ) : customers.length === 0 ? (
                        <EmptyState />
                    ) : (
                        customers.map((customer) => (
                            <CustomerRow
                                key={customer.id}
                                customer={customer}
                                isSelected={selectedIds.includes(customer.id)}
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

interface CustomerRowProps {
    customer: Customer;
    isSelected: boolean;
    onToggleSelect: (customerId: string) => void;
    onAction: (action: CustomerAction, customer: Customer) => void;
}

function CustomerRow({
    customer,
    isSelected,
    onToggleSelect,
    onAction,
}: CustomerRowProps) {
    const creditStatus = getCreditStatus(customer);
    const initials = getCustomerInitials(customer.name);

    const statusIndicator = customer.is_blacklisted
        ? "border-l-2 border-l-red-500"
        : !customer.is_active
            ? "border-l-2 border-l-gray-400"
            : "";

    return (
        <TableRow className={cn(isSelected && "bg-muted/50", statusIndicator)}>
            <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(customer.id)}
                    aria-label={`Select ${customer.name}`}
                />
            </TableCell>

            {/* Customer name + code */}
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate max-w-[180px]">
                                {customer.name}
                            </p>
                            {customer.is_blacklisted && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Blacklisted: {customer.blacklist_reason}</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {customer.customer_code}
                        </p>
                    </div>
                </div>
            </TableCell>

            {/* Type */}
            <TableCell>
                <Badge variant="secondary" className={cn("text-[10px]", getCustomerTypeColor(customer.customer_type))}>
                    {getCustomerTypeLabel(customer.customer_type)}
                </Badge>
            </TableCell>

            {/* Phone */}
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatPhone(customer.phone)}
            </TableCell>

            {/* City */}
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {customer.city || "—"}
            </TableCell>

            {/* Total Purchases */}
            <TableCell className="hidden lg:table-cell text-sm text-right">
                {formatCurrency(customer.total_purchases)}
            </TableCell>

            {/* Outstanding */}
            <TableCell className="hidden lg:table-cell text-right">
                {customer.outstanding_balance > 0 ? (
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge
                                variant="secondary"
                                className={cn("text-[10px]", getCreditStatusColor(creditStatus))}
                            >
                                {formatCurrency(customer.outstanding_balance)}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{getCreditStatusLabel(creditStatus)}</TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                )}
            </TableCell>

            {/* Loyalty Points */}
            <TableCell className="hidden xl:table-cell text-sm text-right text-muted-foreground">
                {customer.loyalty_points > 0 ? formatPoints(customer.loyalty_points) : "—"}
            </TableCell>

            {/* Row Actions */}
            <TableCell>
                <CustomerRowActions
                    customer={customer}
                    onAction={(action) => onAction(action, customer)}
                />
            </TableCell>
        </TableRow>
    );
}
