import type { Metadata } from "next";
import AccountSuspendedPage from "@/components/pages/account-suspended";

export const metadata: Metadata = {
    title: "Account Suspended – StorePOS",
    description: "Your account has been suspended.",
};

export default function Page() {
    return <AccountSuspendedPage />;
}
