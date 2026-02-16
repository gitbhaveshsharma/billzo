"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
    checkAllPermissions,
    checkAnyPermission,
} from "@/utils/permission-utils";
import { PageLoader } from "@/components/shared/loading-spinner";

interface PermissionGuardProps {
    children: ReactNode;
    /** Permissions needed to render children */
    requiredPermissions: string[];
    /** When true, the user must have ALL permissions; otherwise ANY suffices */
    requireAll?: boolean;
    /** Optional fallback when the user lacks required permissions */
    fallback?: ReactNode;
}

/**
 * Renders children only when the current user holds the required permissions.
 */
export function PermissionGuard({
    children,
    requiredPermissions,
    requireAll = false,
    fallback,
}: PermissionGuardProps) {
    const { appUser, isInitialized, isLoading } = useAuth();

    if (!isInitialized || isLoading) {
        return <PageLoader />;
    }

    const perms = appUser?.permissions ?? [];

    const hasAccess = requireAll
        ? checkAllPermissions(perms, requiredPermissions)
        : checkAnyPermission(perms, requiredPermissions);

    if (!hasAccess) {
        return <>{fallback ?? null}</>;
    }

    return <>{children}</>;
}
