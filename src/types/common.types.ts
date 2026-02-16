import type { StoreStatus, RoleName } from "./database.types";

/** Onboarding step tracking */
export type OnboardingStep =
  | "signup"
  | "verify-otp"
  | "create-organization"
  | "create-store"
  | "pending-approval"
  | "complete";

/** Store status display mapping */
export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  pending: "Pending Verification",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
  closed: "Closed",
};

/** Role display mapping */
export const ROLE_LABELS: Record<RoleName, string> = {
  super_admin: "Super Admin",
  store_admin: "Store Admin",
  manager: "Store Manager",
  cashier: "Cashier",
  accountant: "Accountant",
  inventory_manager: "Inventory Manager",
};
