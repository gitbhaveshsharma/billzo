import type { RoleName } from "@/types/database.types";

/** Role hierarchy - higher priority = more access */
export const ROLE_PRIORITY: Record<RoleName, number> = {
  super_admin: 100,
  store_admin: 80,
  manager: 60,
  accountant: 50,
  inventory_manager: 40,
  cashier: 20,
};

/** Default role for store creators */
export const DEFAULT_STORE_CREATOR_ROLE: RoleName = "store_admin";

/** Roles that can manage employees */
export const EMPLOYEE_MANAGEMENT_ROLES: RoleName[] = [
  "super_admin",
  "store_admin",
  "manager",
];
