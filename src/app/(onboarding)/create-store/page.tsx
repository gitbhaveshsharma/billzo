import type { Metadata } from "next";
import { StoreForm } from "@/components/onboarding/store-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Create Store – StorePOS",
    description: "Add your first store location",
};

export default function CreateStorePage() {
    return (
        <div className="w-full max-w-2xl mx-auto py-8">
            <StoreForm />
        </div>
    );
}
