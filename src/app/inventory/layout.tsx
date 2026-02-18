import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout/layout-shell";

export const metadata: Metadata = {
    title: "Inventory Dashboard",
    description: "Manage stock levels and inventory operations",
};

export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutShell>{children}</LayoutShell>;
}
