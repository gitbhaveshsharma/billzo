import type { Metadata } from "next";
import { PendingApprovalCard } from "@/components/onboarding/pending-approval-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Pending Approval – StorePOS",
    description: "Your store is awaiting verification",
};

export default function PendingApprovalPage() {
    return (
        <div className="w-full max-w-lg mx-auto py-8">
            <PendingApprovalCard />
        </div>
    );
}
