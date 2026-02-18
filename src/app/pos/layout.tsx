import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout/layout-shell";

export const metadata: Metadata = {
    title: "Point of Sale",
    description: "Manage customer transactions and sales",
};

export default function POSLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutShell>{children}</LayoutShell>;
}
