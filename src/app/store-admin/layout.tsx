"use client";

import { StoreAdminProvider } from "./_context/store-admin-context";
import { ConditionalLayout } from "@/components/layout";

export default function StoreAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <StoreAdminProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
        </StoreAdminProvider>
    );
}