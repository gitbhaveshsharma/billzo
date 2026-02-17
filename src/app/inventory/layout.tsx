import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Inventory Dashboard",
    description: "Manage stock levels and inventory operations",
};

export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
