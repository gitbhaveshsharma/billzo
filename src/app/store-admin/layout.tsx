import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Store Admin Dashboard",
    description: "Manage your store and view analytics",
};

export default function StoreAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
