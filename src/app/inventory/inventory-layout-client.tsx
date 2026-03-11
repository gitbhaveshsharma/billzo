"use client";

import { InventoryProvider } from "./_context/inventory-context";
import { ConditionalLayout } from "@/components/layout";

export function InventoryLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InventoryProvider>
      <ConditionalLayout>{children}</ConditionalLayout>
    </InventoryProvider>
  );
}
