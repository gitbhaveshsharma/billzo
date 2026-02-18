import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout/layout-shell";

export const metadata: Metadata = {
    title: "Accountant Dashboard",
    description: "Manage finances and generate financial reports",
};

export default function AccountantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutShell>{children}</LayoutShell>;
}
