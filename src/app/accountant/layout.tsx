import type { Metadata } from "next";
import { AccountantLayoutClient } from "./accountant-layout-client";

export const metadata: Metadata = {
    title: "Accountant Dashboard",
    description: "Manage finances and generate financial reports",
};

export default function AccountantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AccountantLayoutClient>{children}</AccountantLayoutClient>;
}
