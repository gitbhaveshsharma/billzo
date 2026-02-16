import type { Metadata } from "next";
import { OrganizationForm } from "@/components/onboarding/organization-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Create Organization – StorePOS",
    description: "Set up your organization to get started",
};

export default function CreateOrganizationPage() {
    return (
        <div className="w-full max-w-2xl mx-auto py-8">
            <OrganizationForm />
        </div>
    );
}
