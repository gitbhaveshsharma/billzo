"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyRole as checkAnyRole } from "@/config/roles.config";
import type { RoleName } from "@/types/database.types";
import { PageLoader } from "@/components/shared/loading-spinner";

interface RoleGuardProps {
    children: ReactNode;
    /** Roles that are allowed to see the content */
    allowedRoles: RoleName[];
    /** Optional fallback rendered when the user lacks access */
    fallback?: ReactNode;
}

/**
 * Renders children only when the current user holds one of the allowed roles.
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
    const { appUser, isInitialized, isLoading } = useAuth();

    if (!isInitialized || isLoading) {
        return <PageLoader />;
    }

    if (!appUser || !checkAnyRole(appUser.role as RoleName, allowedRoles)) {
        return <>{fallback ?? null}</>;
    }

    return <>{children}</>;
}
