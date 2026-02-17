import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Super Admin Dashboard",
    description: "System administration and platform overview",
};

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
