"use client";

import { useState, useCallback } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Filter,
    ShieldAlert,
    Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
                            <TableHead>Type</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead className="text-right">Current Qty</TableHead>
                            <TableHead className="text-right">Threshold</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-24">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <AlertTableSkeleton />
                        ) : alerts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9}>
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
                            alerts.map((alert) => (
                                <TableRow key={alert.id}>
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
                                    <TableCell className="text-right font-mono">
                                        {alert.current_quantity ?? "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {alert.threshold_quantity ?? "-"}
                                    </TableCell>
                                    <TableCell>
                                        {alert.is_resolved ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Resolved
                                            </Badge>
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
                            ))
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Resolve Alert</DialogTitle>
                        <DialogDescription>
                            Add resolution notes for this alert.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bulk Resolve Alerts</DialogTitle>
                        <DialogDescription>
                            Resolve {selectedIds.length} selected alert
                            {selectedIds.length > 1 ? "s" : ""}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
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
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}
