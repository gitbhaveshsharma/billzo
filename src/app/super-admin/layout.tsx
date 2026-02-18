import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout/layout-shell";

export const metadata: Metadata = {
    title: "Super Admin Dashboard",
    description: "System administration and platform overview",
};

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutShell>{children}</LayoutShell>;
}
