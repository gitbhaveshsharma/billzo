"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";
import {
  checkPermission,
  checkAllPermissions,
  checkAnyPermission,
} from "@/utils/permission-utils";

/**
 * Helpers to inspect the current user's permissions.
 */
export function usePermission() {
  const { appUser } = useAuth();
  const permissions = appUser?.permissions ?? [];

  /** Check a single permission */
  const hasPermission = useCallback(
    (perm: string): boolean => checkPermission(permissions, perm),
    [permissions]
  );

  /** Check that ALL listed permissions are present (AND) */
  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => checkAllPermissions(permissions, perms),
    [permissions]
  );

  /** Check that ANY listed permission is present (OR) */
  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => checkAnyPermission(permissions, perms),
    [permissions]
  );

  return { permissions, hasPermission, hasAllPermissions, hasAnyPermission };
}
