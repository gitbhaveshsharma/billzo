"use client";

import { useEffect, useMemo } from "react";
import { useStoreAdmin } from "../../_context/store-admin-context";
import { RolesPermissionsView } from "../../_components/employees";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

// ============================================================================
// ROLES & PERMISSIONS PAGE
// ============================================================================

export default function RolesPermissionsPage() {
  const {
    availableRoles,
    role,
    stats,
    storeId,
    isLoading,
    refreshStats,
  } = useStoreAdmin();

  // Ensure stats are loaded (we need by_role counts)
  useEffect(() => {
    if (storeId && !stats) {
      refreshStats();
    }
  }, [storeId, stats, refreshStats]);

  // Build role → user count mapping from stats
  const roleCounts = useMemo(() => {
    if (!stats?.by_role) return undefined;
    return stats.by_role as Record<string, number>;
  }, [stats]);

  if (isLoading && !availableRoles) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading roles..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Roles & Permissions
        </h1>
        <p className="text-sm text-muted-foreground">
          View the permissions assigned to each role in your store. Permissions
          are managed at the role level and can be customised per employee from
          the employee detail page.
        </p>
      </div>

      {/* Roles grid */}
      <RolesPermissionsView
        availableRoles={availableRoles}
        currentUserRole={role}
        roleCounts={roleCounts}
      />
    </div>
  );
}
