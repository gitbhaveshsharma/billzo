"use client";

import { useState, useCallback } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Filter,
    Info,
    ShieldAlert,
    Package,
    TrendingUp,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { InventoryPagination } from "./inventory-pagination";
import {
    getAlertTypeLabel,
    getAlertTypeColor,
    getAlertSeverityLabel,
    getAlertSeverityColor,
    formatRelativeTime,
} from "@/utils/inventory.utils";
import {
    ALERT_TYPES,
    ALERT_SEVERITIES,
    type EnrichedStockAlert,
    type AlertFilters,
    type AlertType,
    type AlertSeverity,
} from "@/types/inventory.types";

// ============================================================================
// HELPERS
// ============================================================================

/** Column header with an inline info tooltip */
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

/**
 * Returns true when the alert was triggered historically but the current live
 * stock has since recovered above the threshold — meaning the alert is stale.
 */
function isStaleAlert(alert: EnrichedStockAlert): boolean {
    if (alert.is_resolved) return false;
    if (alert.live_quantity == null) return false;
    const threshold = alert.live_reorder_point ?? alert.threshold_quantity ?? 0;
    return alert.live_quantity > threshold;
}

// ============================================================================
// TYPES
// ============================================================================

interface AlertsPanelProps {
    alerts: EnrichedStockAlert[];
    total: number;
    filters: AlertFilters;
    isLoading: boolean;
    isSaving: boolean;
    onFiltersChange: (filters: Partial<AlertFilters>) => void;
    onResolve: (alertId: string, notes: string) => Promise<boolean>;
    onBulkResolve: (alertIds: string[], notes: string) => Promise<boolean>;
}

// ============================================================================
// ALERTS PANEL
// ============================================================================

export function AlertsPanel({
    alerts,
    total,
    filters,
    isLoading,
    isSaving,
    onFiltersChange,
    onResolve,
    onBulkResolve,
}: AlertsPanelProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [resolveTarget, setResolveTarget] = useState<string | null>(null);
    const [bulkResolveOpen, setBulkResolveOpen] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState("");

    const unresolvedAlerts = alerts.filter((a) => !a.is_resolved);
    const staleAlertCount = unresolvedAlerts.filter(isStaleAlert).length;
    const allSelected =
        unresolvedAlerts.length > 0 &&
        unresolvedAlerts.every((a) => selectedIds.includes(a.id));

    const handleSelectAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(unresolvedAlerts.map((a) => a.id));
        }
    }, [allSelected, unresolvedAlerts]);

    const handleSelectOne = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }, []);

    const handleSelectAllStale = useCallback(() => {
        const staleIds = unresolvedAlerts.filter(isStaleAlert).map((a) => a.id);
        setSelectedIds(staleIds);
    }, [unresolvedAlerts]);

    const handleOpenResolve = (alertId: string) => {
        setResolveTarget(alertId);
        setResolutionNotes("");
        setResolveDialogOpen(true);
    };

    const handleConfirmResolve = async () => {
        if (!resolveTarget) return;
        const success = await onResolve(resolveTarget, resolutionNotes);
        if (success) {
            setResolveDialogOpen(false);
            setResolveTarget(null);
            setResolutionNotes("");
        }
    };

    const handleOpenBulkResolve = () => {
        setResolutionNotes("");
        setBulkResolveOpen(true);
    };

    const handleConfirmBulkResolve = async () => {
        const success = await onBulkResolve(selectedIds, resolutionNotes);
        if (success) {
            setBulkResolveOpen(false);
            setSelectedIds([]);
            setResolutionNotes("");
        }
    };

    return (
        <div className="space-y-4">
            {/* Stale alert callout */}
            {staleAlertCount > 0 && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-sm">
                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                            {staleAlertCount} stale alert{staleAlertCount > 1 ? "s" : ""} detected
                        </p>
                        <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                            These alerts were triggered when stock was low, but the current live
                            quantity is now above the reorder threshold. This happens when an alert
                            is created at product creation (qty = 0) and stock is later added without
                            resolving the alert. You can safely resolve them.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
                        onClick={handleSelectAllStale}
                        disabled={isSaving}
                    >
                        Select Stale
                    </Button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <Select
                    value={filters.alert_type ?? "ALL"}
                    onValueChange={(v) =>
                        onFiltersChange({
                            alert_type: v === "ALL" ? undefined : (v as AlertType),
                        })
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Alert Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        {ALERT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                                {getAlertTypeLabel(t)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.severity ?? "ALL"}
                    onValueChange={(v) =>
                        onFiltersChange({
                            severity: v === "ALL" ? undefined : (v as AlertSeverity),
                        })
                    }
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Severities</SelectItem>
                        {ALERT_SEVERITIES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {getAlertSeverityLabel(s)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={
                        filters.is_resolved === undefined
                            ? "ALL"
                            : filters.is_resolved
                            ? "RESOLVED"
                            : "UNRESOLVED"
                    }
                    onValueChange={(v) =>
                        onFiltersChange({
                            is_resolved: v === "ALL" ? undefined : v === "RESOLVED",
                        })
                    }
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="UNRESOLVED">Unresolved</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                </Select>

                {selectedIds.length > 0 && (
                    <Button
                        size="sm"
                        variant="default"
                        onClick={handleOpenBulkResolve}
                        disabled={isSaving}
                    >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Resolve {selectedIds.length} Selected
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all unresolved"
                                />
                            </TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>
                                <TipHead tip="The kind of stock problem detected: Low Stock, Out of Stock, or Expiry warning.">
                                    Type
                                </TipHead>
                            </TableHead>
                            <TableHead>
                                <TipHead tip="How urgent this alert is. Critical requires immediate action; Medium can be scheduled.">
                                    Severity
                                </TipHead>
                            </TableHead>
                            <TableHead className="text-right">
                                <TipHead tip="Stock quantity recorded the moment this alert was triggered by the database. This is a historical snapshot - it will NOT change even if stock is added later.">
                                    Qty When Triggered
                                </TipHead>
                            </TableHead>
                            <TableHead className="text-right">
                                <TipHead tip="Live current stock from the inventory table, fetched right now. If this is higher than the Threshold, the alert is stale and can be safely resolved.">
                                    Current Qty
                                </TipHead>
                            </TableHead>
                            <TableHead className="text-right">
                                <TipHead tip="The product's Reorder Point - the minimum quantity before a Low Stock alert fires. A value of 0 means the alert fires only when stock hits exactly 0 (the default when no reorder point is set).">
                                    Threshold
                                </TipHead>
                            </TableHead>
                            <TableHead>
                                <TipHead tip="Open = alert is active and needs attention. Resolved = someone has acknowledged and closed this alert. Stale = stock has recovered above threshold but alert was never resolved.">
                                    Status
                                </TipHead>
                            </TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-24">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <AlertTableSkeleton />
                        ) : alerts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10}>
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <ShieldAlert className="h-10 w-10 mb-2" />
                                        <p className="font-medium">No alerts found</p>
                                        <p className="text-sm">
                                            Adjust filters or check back later.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            alerts.map((alert) => {
                                const stale = isStaleAlert(alert);
                                return (
                                    <TableRow
                                        key={alert.id}
                                        className={stale ? "bg-amber-50/40 dark:bg-amber-950/10" : undefined}
                                    >
                                        <TableCell>
                                            {!alert.is_resolved && (
                                                <Checkbox
                                                    checked={selectedIds.includes(alert.id)}
                                                    onCheckedChange={() => handleSelectOne(alert.id)}
                                                    aria-label={`Select alert ${alert.id}`}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">
                                                        {alert.product?.name ?? "Unknown Product"}
                                                    </p>
                                                    {alert.product?.product_code && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {alert.product.product_code}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={getAlertTypeColor(alert.alert_type)}
                                            >
                                                {getAlertTypeLabel(alert.alert_type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={getAlertSeverityColor(alert.severity)}
                                            >
                                                {getAlertSeverityLabel(alert.severity)}
                                            </Badge>
                                        </TableCell>
                                        {/* Qty when the alert was triggered (historical snapshot) */}
                                        <TableCell className="text-right font-mono">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-default border-b border-dashed border-muted-foreground/40">
                                                            {alert.current_quantity ?? "—"}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[240px] text-xs">
                                                        Snapshot taken when this alert was triggered by the
                                                        database. Does not update when stock changes.
                                                        See &quot;Current Qty&quot; for live stock.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        {/* Live quantity from inventory table */}
                                        <TableCell className="text-right font-mono">
                                            {alert.live_quantity != null ? (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span
                                                                className={
                                                                    stale
                                                                        ? "text-green-600 dark:text-green-400 font-semibold cursor-default"
                                                                        : "cursor-default"
                                                                }
                                                            >
                                                                {alert.live_quantity}
                                                                {stale && (
                                                                    <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
                                                                )}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-[240px] text-xs">
                                                            {stale
                                                                ? `Stock has recovered to ${alert.live_quantity} units - above the threshold of ${alert.live_reorder_point ?? alert.threshold_quantity ?? 0}. This alert is stale and can be resolved.`
                                                                : `Current live stock: ${alert.live_quantity} units.`}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-default border-b border-dashed border-muted-foreground/40">
                                                            {alert.threshold_quantity ?? "—"}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[240px] text-xs">
                                                        {(alert.threshold_quantity ?? 0) === 0
                                                            ? "Threshold is 0 because this product has no Reorder Point set. The alert fired when stock hit 0 (product creation). Set a Reorder Point on the product to get more meaningful alerts."
                                                            : `Alert fires when stock falls to or below ${alert.threshold_quantity} units (the product's Reorder Point).`}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>
                                            {alert.is_resolved ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Resolved
                                                </Badge>
                                            ) : stale ? (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-amber-600 border-amber-300 cursor-default">
                                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                                Stale
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-[240px] text-xs">
                                                            Alert was triggered when stock was low, but current
                                                            stock ({alert.live_quantity}) is now above the
                                                            reorder threshold ({alert.live_reorder_point ?? alert.threshold_quantity ?? 0}).
                                                            Resolve this alert to clean up.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Open
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatRelativeTime(alert.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {!alert.is_resolved && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleOpenResolve(alert.id)}
                                                    disabled={isSaving}
                                                >
                                                    Resolve
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <InventoryPagination
                page={1}
                totalPages={Math.ceil(total / 20)}
                limit={20}
                totalItems={total}
                onPageChange={() => {}}
                onLimitChange={() => {}}
                label="alerts"
            />

            {/* Single Resolve Dialog */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Resolve Alert</DialogTitle>
                        <DialogDescription>
                            Add resolution notes for this alert.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 p-3">
                        <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Resolution notes (required)"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setResolveDialogOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmResolve}
                            disabled={isSaving || !resolutionNotes.trim()}
                        >
                            {isSaving ? "Resolving..." : "Resolve"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Resolve Dialog */}
            <Dialog open={bulkResolveOpen} onOpenChange={setBulkResolveOpen}>
                <DialogContent className="max-w-    xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Resolve Alerts</DialogTitle>
                        <DialogDescription>
                            Resolve {selectedIds.length} selected alert
                            {selectedIds.length > 1 ? "s" : ""}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 p-3">
                        <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Resolution notes (required)"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setBulkResolveOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmBulkResolve}
                            disabled={isSaving || !resolutionNotes.trim()}
                        >
                            {isSaving ? "Resolving..." : `Resolve ${selectedIds.length}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============================================================================
// SKELETON
// ============================================================================

function AlertTableSkeleton() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}
