import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manager Dashboard",
    description: "Oversee store operations and team performance",
};

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
