import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Accountant Dashboard",
    description: "Manage finances and generate financial reports",
};

export default function AccountantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
