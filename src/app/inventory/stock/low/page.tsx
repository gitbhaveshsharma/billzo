"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useInventoryStore } from "@/stores/inventory.store";
import { AlertsPanel } from "@/app/store-admin/_components/stock";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type { AlertFilters } from "@/types/inventory.types";

// ============================================================================
// INVENTORY MANAGER — LOW STOCK ALERTS PAGE
// ============================================================================

export default function LowStockAlertsPage() {
  const { storeId } = useInventory();

  const {
    alerts,
    unresolvedAlertCount,
    isLoading,
    isSaving,
    fetchAlerts,
    resolveAlert,
    bulkResolveAlerts,
  } = useInventoryStore();

  const [filters, setFilters] = useState<AlertFilters>({
    is_resolved: false,
  });

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchAlerts(storeId, filters);
  }, [storeId, filters, fetchAlerts]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleFiltersChange = useCallback(
    (updated: Partial<AlertFilters>) => {
      setFilters((prev) => ({ ...prev, ...updated }));
    },
    [],
  );

  const handleResolve = useCallback(
    async (alertId: string, notes: string): Promise<boolean> => {
      if (!storeId) return false;
      const success = await resolveAlert(storeId, alertId, {
        resolution_notes: notes || "",
      });
      if (success) {
        toast.success("Alert resolved");
        fetchAlerts(storeId, filters);
      } else {
        toast.error("Failed to resolve alert");
      }
      return success;
    },
    [storeId, resolveAlert, fetchAlerts, filters],
  );

  const handleBulkResolve = useCallback(
    async (alertIds: string[], notes: string): Promise<boolean> => {
      if (!storeId) return false;
      const success = await bulkResolveAlerts(storeId, alertIds, notes);
      if (success) {
        toast.success(`${alertIds.length} alert(s) resolved`);
        fetchAlerts(storeId, filters);
      } else {
        toast.error("Failed to resolve alerts");
      }
      return success;
    },
    [storeId, bulkResolveAlerts, fetchAlerts, filters],
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Low Stock Alerts</h1>
          <InfoTooltip content="Alerts are auto-generated when stock drops below reorder levels. Resolve an alert after restocking or if no action is needed." />
          {unresolvedAlertCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              {unresolvedAlertCount} unresolved
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Monitor stock levels and take action on critical items.
        </p>
      </div>

      {/* Alerts Panel (reused from store-admin) */}
      <AlertsPanel
        alerts={alerts}
        total={alerts.length}
        filters={filters}
        isLoading={isLoading}
        isSaving={isSaving}
        onFiltersChange={handleFiltersChange}
        onResolve={handleResolve}
        onBulkResolve={handleBulkResolve}
      />
    </div>
  );
}
