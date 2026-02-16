import type { RoleName } from "@/types/database.types";

// ============================================================================
// Role Hierarchy & Permissions Configuration
// ============================================================================

/** Role hierarchy — higher number = more access */
export const ROLE_HIERARCHY: Record<RoleName, number> = {
  super_admin: 100,
  store_admin: 80,
  manager: 60,
  accountant: 50,
  inventory_manager: 40,
  cashier: 20,
} as const;

/** All possible permissions in the system */
export const PERMISSIONS = {
  // Platform-level
  manage_platform: "manage_platform",
  manage_organizations: "manage_organizations",
  manage_stores: "manage_stores",
  approve_stores: "approve_stores",

  // Employee management
  manage_employees: "manage_employees",
  view_employees: "view_employees",

  // Store settings
  manage_store_settings: "manage_store_settings",
  manage_ip_whitelist: "manage_ip_whitelist",

  // Sales
  process_sales: "process_sales",
  void_transactions: "void_transactions",
  process_refunds: "process_refunds",

  // Inventory
  manage_inventory: "manage_inventory",
  view_inventory: "view_inventory",

  // Reports
  view_reports: "view_reports",
  view_financials: "view_financials",
  export_reports: "export_reports",

  // Audit
  view_audit_logs: "view_audit_logs",

  // CRM
  manage_customers: "manage_customers",
  manage_suppliers: "manage_suppliers",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Default permissions assigned to each role */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),

  store_admin: [
    PERMISSIONS.manage_employees,
    PERMISSIONS.view_employees,
    PERMISSIONS.manage_store_settings,
    PERMISSIONS.manage_ip_whitelist,
    PERMISSIONS.process_sales,
    PERMISSIONS.void_transactions,
    PERMISSIONS.process_refunds,
    PERMISSIONS.manage_inventory,
    PERMISSIONS.view_inventory,
    PERMISSIONS.view_reports,
    PERMISSIONS.view_financials,
    PERMISSIONS.export_reports,
    PERMISSIONS.view_audit_logs,
    PERMISSIONS.manage_customers,
    PERMISSIONS.manage_suppliers,
  ],

  manager: [
    PERMISSIONS.manage_employees,
    PERMISSIONS.view_employees,
    PERMISSIONS.process_sales,
    PERMISSIONS.void_transactions,
    PERMISSIONS.process_refunds,
    PERMISSIONS.manage_inventory,
    PERMISSIONS.view_inventory,
    PERMISSIONS.view_reports,
    PERMISSIONS.manage_customers,
    PERMISSIONS.manage_suppliers,
  ],

  accountant: [
    PERMISSIONS.view_employees,
    PERMISSIONS.view_reports,
    PERMISSIONS.view_financials,
    PERMISSIONS.export_reports,
  ],

  inventory_manager: [
    PERMISSIONS.manage_inventory,
    PERMISSIONS.view_inventory,
    PERMISSIONS.view_reports,
    PERMISSIONS.manage_suppliers,
  ],

  cashier: [
    PERMISSIONS.process_sales,
    PERMISSIONS.view_inventory,
    PERMISSIONS.manage_customers,
  ],
};

/** Check if userRole meets the required role level */
export function hasRoleAccess(
  userRole: RoleName,
  requiredRole: RoleName
): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/** Check if userRole is one of the allowed roles */
export function hasAnyRole(
  userRole: RoleName,
  allowedRoles: RoleName[]
): boolean {
  return allowedRoles.includes(userRole);
}

/** Check if the user has a specific permission */
export function hasPermission(
  userPermissions: string[],
  required: string
): boolean {
  return userPermissions.includes(required);
}

/** Get all permissions for a given role (from config, not DB) */
export function getDefaultPermissions(role: RoleName): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
