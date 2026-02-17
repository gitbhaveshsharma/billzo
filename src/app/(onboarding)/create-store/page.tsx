"use client";

import { useEffect } from "react";
import type { Metadata } from "next";
import { StoreForm } from "@/components/onboarding/store-form";

export const dynamic = "force-dynamic";

export default function CreateStorePage() {
    useEffect(() => {
        console.log("📄 [CREATE-STORE PAGE] Mounted");
        return () => {
            console.log("📄 [CREATE-STORE PAGE] Unmounted");
        };
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto py-8">
            <StoreForm />
        </div>
    );
}
