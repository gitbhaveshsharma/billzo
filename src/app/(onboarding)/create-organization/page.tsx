"use client";

import { useEffect } from "react";
import type { Metadata } from "next";
import { OrganizationForm } from "@/components/onboarding/organization-form";

export const dynamic = "force-dynamic";

export default function CreateOrganizationPage() {
    useEffect(() => {
        console.log("📄 [CREATE-ORGANIZATION PAGE] Mounted");
        return () => {
            console.log("📄 [CREATE-ORGANIZATION PAGE] Unmounted");
        };
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto py-8">
            <OrganizationForm />
        </div>
    );
}
