"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StoreAdminProvider } from "./_context/store-admin-context";

export default function StoreAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout requiredRole={["store_admin", "manager"]}>
            <StoreAdminProvider>{children}</StoreAdminProvider>
        </DashboardLayout>
    );
}
