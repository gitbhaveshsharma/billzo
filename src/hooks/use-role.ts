"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";
import { hasRoleAccess, hasAnyRole } from "@/config/roles.config";
import type { RoleName } from "@/types/database.types";

/**
 * Helpers to inspect the current user's role.
 */
export function useRole() {
  const { appUser } = useAuth();
  const role = appUser?.role ?? null;

  /** Does the user's role meet or exceed the required level? */
  const hasRole = useCallback(
    (required: RoleName): boolean => {
      if (!role) return false;
      return hasRoleAccess(role, required);
    },
    [role]
  );

  /** Does the user hold any one of the listed roles? */
  const hasAny = useCallback(
    (roles: RoleName[]): boolean => {
      if (!role) return false;
      return hasAnyRole(role, roles);
    },
    [role]
  );

  const isAdmin = useCallback(
    () => hasAny(["super_admin", "store_admin"]),
    [hasAny]
  );

  const isSuperAdmin = useCallback(
    () => role === "super_admin",
    [role]
  );

  return { role, hasRole, hasAnyRole: hasAny, isAdmin, isSuperAdmin };
}
