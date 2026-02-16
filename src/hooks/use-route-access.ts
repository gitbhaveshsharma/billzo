"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";
import { getRouteConfig } from "@/config/routes.config";
import { hasAnyRole } from "@/config/roles.config";
import { checkAnyPermission } from "@/utils/permission-utils";
import type { RoleName } from "@/types/database.types";

/**
 * Check whether the current user can access a given route.
 * Useful for conditionally rendering navigation links.
 */
export function useRouteAccess() {
  const { appUser, isAuthenticated } = useAuth();

  const canAccessRoute = useCallback(
    (path: string): boolean => {
      const config = getRouteConfig(path);
      if (!config) return true; // Unknown route — let middleware handle
      if (config.type === "public") return true;
      if (config.type === "auth") return !isAuthenticated;
      if (!isAuthenticated || !appUser) return false;
      if (config.type === "onboarding" || config.type === "protected") {
        return true;
      }
      // role-based
      if (config.allowedRoles) {
        if (!hasAnyRole(appUser.role as RoleName, config.allowedRoles)) {
          return false;
        }
      }
      if (config.requiredPermissions?.length) {
        if (!checkAnyPermission(appUser.permissions, config.requiredPermissions)) {
          return false;
        }
      }
      return true;
    },
    [appUser, isAuthenticated]
  );

  /** Filter an array of paths down to only those the user can access */
  const getAccessibleRoutes = useCallback(
    (paths: string[]): string[] => paths.filter(canAccessRoute),
    [canAccessRoute]
  );

  return { canAccessRoute, getAccessibleRoutes };
}
