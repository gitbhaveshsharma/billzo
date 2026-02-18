"use client";

import { StoreAdminProvider } from "./_context/store-admin-context";

export default function StoreAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <StoreAdminProvider>{children}</StoreAdminProvider>;
}