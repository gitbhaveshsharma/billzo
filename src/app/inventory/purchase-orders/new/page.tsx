"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { usePurchaseStore } from "@/stores/purchase.store";
import { useSupplierStore } from "@/stores/supplier.store";
import { CreatePODialog } from "@/app/store-admin/_components/purchase";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import type { CreatePurchaseOrderRequest } from "@/types/purchase.types";

// ============================================================================
// INVENTORY MANAGER — NEW PURCHASE ORDER PAGE
// ============================================================================

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { storeId } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(true);

  const { createOrder, isSaving } = usePurchaseStore();
  const { fetchSuppliers } = useSupplierStore();

  // Pre-fetch suppliers for the dialog dropdown
  useEffect(() => {
    if (!storeId) return;
    fetchSuppliers(storeId);
  }, [storeId, fetchSuppliers]);

  const handleSubmit = useCallback(
    async (data: CreatePurchaseOrderRequest): Promise<boolean> => {
      if (!storeId) return false;
      const result = await createOrder(storeId, data);
      if (result) {
        toast.success("Purchase order created successfully");
        router.push("/inventory/purchase-orders");
        return true;
      }
      toast.error("Failed to create purchase order");
      return false;
    },
    [storeId, createOrder, router],
  );

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        router.push("/inventory/purchase-orders");
      }
      setDialogOpen(open);
    },
    [router],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">New Purchase Order</h1>
          <InfoTooltip content="Create a new purchase order for your supplier. Add items, specify quantities and prices, and the system will auto-calculate GST. Products that don't exist yet will be auto-created." />
        </div>
        <p className="text-sm text-muted-foreground">
          Fill in the order details and add line items.
        </p>
      </div>

      <CreatePODialog
        open={dialogOpen}
        onOpenChange={handleClose}
        storeId={storeId ?? ""}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}
