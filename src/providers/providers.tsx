"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";

/**
 * Combined providers wrapper.
 * Add any future providers (Theme, Feature flags, etc.) here.
 */
export function Providers({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
