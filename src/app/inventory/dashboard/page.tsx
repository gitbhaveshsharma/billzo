"use client";

import { InventoryDashboard } from "@/components/dashboard";
import { useInventory } from "@/app/inventory/_context/inventory-context";

export default function InventoryDashboardPage() {
  const { storeName } = useInventory();

  return (
    <InventoryDashboard
      basePath="/inventory"
      title="Inventory Dashboard"
      subtitle="Real-time overview of stock levels, purchases, and suppliers"
      storeName={storeName}
    />
  );
}
