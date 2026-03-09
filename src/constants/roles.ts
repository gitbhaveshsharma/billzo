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

// ============================================================================
// PERMISSION REGISTRY — single source of truth for all permission keys
// ============================================================================

export interface PermissionDef {
  /** Machine key stored in roles.permissions / store_users.custom_permissions */
  key: string;
  /** Human-readable label */
  label: string;
  /** Short description shown below the label */
  description: string;
  /** Grouping category */
  category: PermissionCategory;
}

export type PermissionCategory =
  | "employees"
  | "sales"
  | "inventory"
  | "customers"
  | "reports"
  | "store"
  | "finance";

/** Display metadata for each permission category */
export const PERMISSION_CATEGORIES: Record<
  PermissionCategory,
  { label: string; description: string }
> = {
  employees: {
    label: "Employee Management",
    description: "Manage staff, roles, and access",
  },
  sales: {
    label: "Sales & POS",
    description: "Point of sale operations",
  },
  inventory: {
    label: "Inventory & Products",
    description: "Products, stock, and purchase orders",
  },
  customers: {
    label: "Customers",
    description: "Customer data and relationships",
  },
  reports: {
    label: "Reports & Analytics",
    description: "View and export reports",
  },
  store: {
    label: "Store Settings",
    description: "Store configuration and security",
  },
  finance: {
    label: "Finance & Compliance",
    description: "Taxes, payments, and financial data",
  },
};

/**
 * Complete list of all permissions used in the system.
 * Derived from DB migration `1_create_onboarding_system.sql` +
 * patch `12_fix_role_permissions_and_has_permission.sql`.
 */
export const PERMISSION_REGISTRY: PermissionDef[] = [
  // ── Employees ─────────────────────────────────────────────────────────────
  {
    key: "manage_employees",
    label: "Manage Employees",
    description: "Add, edit, and remove employees",
    category: "employees",
  },
  {
    key: "manage_ip_whitelist",
    label: "Manage IP Whitelist",
    description: "Control allowed login IPs",
    category: "employees",
  },

  // ── Sales & POS ───────────────────────────────────────────────────────────
  {
    key: "process_sales",
    label: "Process Sales",
    description: "Create sales from POS register",
    category: "sales",
  },
  {
    key: "void_transactions",
    label: "Void Transactions",
    description: "Void or cancel completed sales",
    category: "sales",
  },
  {
    key: "process_refunds",
    label: "Process Refunds",
    description: "Process customer refunds",
    category: "sales",
  },
  {
    key: "process_returns",
    label: "Process Returns",
    description: "Accept product returns",
    category: "sales",
  },
  {
    key: "manage_cash_drawer",
    label: "Manage Cash Drawer",
    description: "Open/close cash drawer, reconcile",
    category: "sales",
  },
  {
    key: "apply_discounts",
    label: "Apply Discounts",
    description: "Apply per-item discounts at POS",
    category: "sales",
  },
  {
    key: "apply_bulk_discounts",
    label: "Apply Bulk Discounts",
    description: "Apply store-wide bulk discounts",
    category: "sales",
  },
  {
    key: "manage_discounts",
    label: "Manage Discounts",
    description: "Create and manage discount rules",
    category: "sales",
  },
  {
    key: "hold_transactions",
    label: "Hold Transactions",
    description: "Park/hold sales for later",
    category: "sales",
  },
  {
    key: "split_payments",
    label: "Split Payments",
    description: "Accept split payment methods",
    category: "sales",
  },
  {
    key: "close_day",
    label: "Close Day",
    description: "Perform end-of-day closing",
    category: "sales",
  },
  {
    key: "manage_daily_sales",
    label: "Manage Daily Sales",
    description: "View and manage daily sales log",
    category: "sales",
  },
  {
    key: "modify_closed_sales",
    label: "Modify Closed Sales",
    description: "Edit sales after day close",
    category: "sales",
  },

  // ── Inventory & Products ──────────────────────────────────────────────────
  {
    key: "manage_inventory",
    label: "Manage Inventory",
    description: "Full inventory management access",
    category: "inventory",
  },
  {
    key: "view_inventory",
    label: "View Inventory",
    description: "View stock levels and products",
    category: "inventory",
  },
  {
    key: "manage_products",
    label: "Manage Products",
    description: "Add, edit, and delete products",
    category: "inventory",
  },
  {
    key: "manage_barcodes",
    label: "Manage Barcodes",
    description: "Create and print barcodes",
    category: "inventory",
  },
  {
    key: "manage_categories",
    label: "Manage Categories",
    description: "Create and edit product categories",
    category: "inventory",
  },
  {
    key: "adjust_stock",
    label: "Adjust Stock",
    description: "Make manual stock adjustments",
    category: "inventory",
  },
  {
    key: "manage_purchase_orders",
    label: "Manage Purchase Orders",
    description: "Create and manage purchase orders",
    category: "inventory",
  },
  {
    key: "process_purchase_orders",
    label: "Process Purchase Orders",
    description: "Receive and process purchase orders",
    category: "inventory",
  },
  {
    key: "view_stock_alerts",
    label: "View Stock Alerts",
    description: "See low stock and reorder alerts",
    category: "inventory",
  },
  {
    key: "view_stock_reports",
    label: "View Stock Reports",
    description: "View inventory analytics",
    category: "inventory",
  },
  {
    key: "import_products",
    label: "Import Products",
    description: "Bulk import products from CSV",
    category: "inventory",
  },
  {
    key: "manage_units",
    label: "Manage Units",
    description: "Create and edit measurement units",
    category: "inventory",
  },
  {
    key: "manage_suppliers",
    label: "Manage Suppliers",
    description: "Add and manage supplier records",
    category: "inventory",
  },
  {
    key: "search_products",
    label: "Search Products",
    description: "Search product catalog",
    category: "inventory",
  },
  {
    key: "initiate_stock_transfers",
    label: "Initiate Stock Transfers",
    description: "Transfer stock between locations",
    category: "inventory",
  },

  // ── Customers ─────────────────────────────────────────────────────────────
  {
    key: "manage_customers",
    label: "Manage Customers",
    description: "Add, edit, and manage customers",
    category: "customers",
  },

  // ── Reports & Analytics ───────────────────────────────────────────────────
  {
    key: "view_reports",
    label: "View Reports",
    description: "Access reports and analytics",
    category: "reports",
  },
  {
    key: "view_basic_reports",
    label: "View Basic Reports",
    description: "Access basic daily reports",
    category: "reports",
  },
  {
    key: "export_reports",
    label: "Export Reports",
    description: "Download report data as files",
    category: "reports",
  },
  {
    key: "view_audit_logs",
    label: "View Audit Logs",
    description: "View system audit trail",
    category: "reports",
  },

  // ── Store Settings ────────────────────────────────────────────────────────
  {
    key: "manage_store_settings",
    label: "Manage Store Settings",
    description: "Configure store preferences",
    category: "store",
  },
  {
    key: "manage_backup",
    label: "Manage Backup",
    description: "Create and restore backups",
    category: "store",
  },
  {
    key: "manage_integrations",
    label: "Manage Integrations",
    description: "Configure third-party integrations",
    category: "store",
  },
  {
    key: "manage_payment_methods",
    label: "Manage Payment Methods",
    description: "Configure accepted payment methods",
    category: "store",
  },

  // ── Finance & Compliance ──────────────────────────────────────────────────
  {
    key: "view_financials",
    label: "View Financials",
    description: "Access detailed financial data",
    category: "finance",
  },
  {
    key: "view_basic_financials",
    label: "View Basic Financials",
    description: "Access basic financial summary",
    category: "finance",
  },
  {
    key: "manage_taxes",
    label: "Manage Taxes",
    description: "Configure tax rates and GST",
    category: "finance",
  },
  {
    key: "manage_expenses",
    label: "Manage Expenses",
    description: "Record and manage expenses",
    category: "finance",
  },
  {
    key: "reconcile_payments",
    label: "Reconcile Payments",
    description: "Match payments with sales",
    category: "finance",
  },
  {
    key: "generate_gst_reports",
    label: "Generate GST Reports",
    description: "Create GST-compliant reports",
    category: "finance",
  },
  {
    key: "view_invoices",
    label: "View Invoices",
    description: "Access all invoice records",
    category: "finance",
  },
];

/**
 * Defines which permission categories a given role may receive as *custom*
 * (additive) grants.  Store admin and super admin are unrestricted.
 * All other roles are limited to the categories listed below.
 */
export const ROLE_CATEGORY_ACCESS: Record<
  RoleName,
  PermissionCategory[] | "all"
> = {
  super_admin: "all",
  store_admin: "all",
  manager:           ["sales", "inventory", "customers", "reports", "employees"],
  cashier:           ["sales", "inventory", "customers", "reports"],
  inventory_manager: ["inventory",            "customers", "reports"],
  accountant:        ["finance",  "reports",  "customers", "sales"],
};

/**
 * Get permissions grouped by category.
 * Returns entries in the order defined by PERMISSION_CATEGORIES.
 */
export function getPermissionsByCategory(): Array<{
  category: PermissionCategory;
  label: string;
  description: string;
  permissions: PermissionDef[];
}> {
  const categories = Object.keys(PERMISSION_CATEGORIES) as PermissionCategory[];
  return categories.map((cat) => ({
    category: cat,
    ...PERMISSION_CATEGORIES[cat],
    permissions: PERMISSION_REGISTRY.filter((p) => p.category === cat),
  }));
}
