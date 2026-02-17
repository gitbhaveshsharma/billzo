"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Combined providers wrapper.
 * Add any future providers (Theme, Feature flags, etc.) here.
 */
export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <TooltipProvider delayDuration={300}>
                {children}
            </TooltipProvider>
        </AuthProvider>
    );
}
