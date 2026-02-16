import type { Metadata } from "next";
import UnauthorizedPage from "@/components/pages/unauthorized";

export const metadata: Metadata = {
    title: "Unauthorized – StorePOS",
    description: "You don't have permission to access this page.",
};

export default function Page() {
    return <UnauthorizedPage />;
}
