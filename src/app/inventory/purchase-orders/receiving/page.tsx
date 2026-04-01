"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageCheck, Package, Truck, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { usePurchaseStore } from "@/stores/purchase.store";
import {
  PurchaseTable,
  PurchaseToolbar,
  PurchasePagination,
  ReceiveItemsDialog,
  type PurchaseAction,
} from "@/app/store-admin/_components/purchase";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type {
  PurchaseOrder,
  ReceiveItemRequest,
  PurchaseOrderFilters,
  PurchaseOrderPagination,
} from "@/types/purchase.types";

// ============================================================================
// INVENTORY MANAGER — RECEIVING PAGE
// ============================================================================

export default function ReceivingPage() {
  const { storeId } = useInventory();

  const {
    orders,
    filters,
    pagination,
    totalOrders,
    totalPages,
    isLoading,
    isSaving,
    fetchOrders,
    receiveItems,
    setFilters,
    setPagination,
  } = usePurchaseStore();

  // ── Dialog ─────────────────────────────────────────────────────────────
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ========================================================================
  // DATA FETCHING — only show receivable orders
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    // Set filter to only show confirmed/partially_received orders
    setFilters({ status: "confirmed" });
  }, [storeId, setFilters]);

  useEffect(() => {
    if (!storeId) return;
    fetchOrders(storeId);
  }, [storeId, filters, pagination, fetchOrders]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleFiltersChange = useCallback(
    (updated: Partial<PurchaseOrderFilters>) => {
      setFilters(updated);
    },
    [setFilters],
  );

  const handlePaginationChange = useCallback(
    (updated: Partial<PurchaseOrderPagination>) => {
      setPagination(updated);
    },
    [setPagination],
  );

  const handleReceive = useCallback(
    async (poId: string, items: ReceiveItemRequest[]): Promise<boolean> => {
      if (!storeId) return false;
      const success = await receiveItems(storeId, poId, items);
      if (success) {
        toast.success("Items received and inventory updated");
        fetchOrders(storeId, true);
      } else {
        toast.error("Failed to receive items");
      }
      return success;
    },
    [storeId, receiveItems, fetchOrders],
  );

  const handleAction = useCallback(
    (action: PurchaseAction, order: PurchaseOrder) => {
      if (action === "receive") {
        setSelectedOrderId(order.id);
        setReceiveDialogOpen(true);
      }
    },
    [],
  );

  // Receivable orders are confirmed or partially_received
  const receivableOrders = orders.filter(
    (o) => o.status === "confirmed" || o.status === "partially_received",
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Receiving</h1>
          <InfoTooltip content="Receive goods against confirmed purchase orders. When items are received, inventory is automatically updated with batch tracking and the PO status changes accordingly." />
        </div>
        <p className="text-sm text-muted-foreground">
          Record incoming goods against purchase orders.
          <span className="ml-1 text-green-700 dark:text-green-300">
            Free quantities from supplier offers are shown per item.
          </span>
          {receivableOrders.length > 0 && (
            <span className="ml-1 font-medium text-foreground">
              {receivableOrders.length} order(s) awaiting receipt.
            </span>
          )}
        </p>
      </div>

      {/* Toolbar */}
      <PurchaseToolbar
        filters={filters}
        orders={orders}
        onFiltersChange={handleFiltersChange}
        onCreatePO={() => {}}
        isLoading={isLoading}
      />

      {/* Table */}
      <PurchaseTable
        orders={orders}
        selectedIds={selectedIds}
        isLoading={isLoading}
        onToggleSelect={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
          )
        }
        onSelectAll={(ids) => setSelectedIds(ids)}
        onAction={handleAction}
      />

      {/* Pagination */}
      <PurchasePagination
        page={pagination.page}
        totalPages={totalPages}
        limit={pagination.limit}
        totalOrders={totalOrders}
        onPageChange={(page) => handlePaginationChange({ page })}
        onLimitChange={(limit) => handlePaginationChange({ limit, page: 1 })}
      />

      {/* Receive Dialog */}
      <ReceiveItemsDialog
        open={receiveDialogOpen}
        onOpenChange={setReceiveDialogOpen}
        storeId={storeId ?? ""}
        orderId={selectedOrderId}
        onSubmit={handleReceive}
        isSaving={isSaving}
      />
    </div>
  );
}
