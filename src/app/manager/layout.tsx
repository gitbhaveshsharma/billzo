import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout/layout-shell";

export const metadata: Metadata = {
    title: "Manager Dashboard",
    description: "Oversee store operations and team performance",
};

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutShell>{children}</LayoutShell>;
}
