"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageLoader } from "@/components/shared/loading-spinner";

interface AuthGuardProps {
    children: ReactNode;
    /** Component to render while auth is loading */
    loader?: ReactNode;
}

/**
 * Requires the user to be authenticated.
 * Shows a loader until the auth state is initialized, then
 * renders children only when a user session exists.
 */
export function AuthGuard({ children, loader }: AuthGuardProps) {
    const { isAuthenticated, isInitialized, isLoading } = useAuth();

    if (!isInitialized || isLoading) {
        return <>{loader ?? <PageLoader />}</>;
    }

    if (!isAuthenticated) {
        return null; // Middleware handles the redirect
    }

    return <>{children}</>;
}
