import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  Settings,
  Building2,
  Shield,
  UserCog,
  Receipt,
  TrendingUp,
  FileText,
  Boxes,
  Truck,
  ClipboardList,
  DollarSign,
  CreditCard,
  UserCheck,
  Store,
  Activity,
  Bell,
  Lock,
  Globe,
  Wallet,
  ArrowLeftRight,
  PackageSearch,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import type { RoleName } from "@/types/database.types";
import type {
  LayoutConfig,
  PageType,
  SidebarItem,
  HeaderConfig,
  SidebarConfig,
  ResponsiveConfig,
} from "./types";

// ============================================================================
// Sidebar Items — Centralized definition, filtered by role at runtime
// ============================================================================

/** Super Admin sidebar items */
const SUPER_ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "sa-dashboard",
    label: "Dashboard",
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
    shortcut: "Alt+D",
    roles: ["super_admin"],
  },
  {
    id: "sa-stores",
    label: "Store Management",
    href: "/super-admin/stores",
    icon: Store,
    roles: ["super_admin"],
    children: [
      {
        id: "sa-stores-all",
        label: "All Stores",
        href: "/super-admin/stores",
        roles: ["super_admin"],
      },
      {
        id: "sa-stores-pending",
        label: "Pending Approvals",
        href: "/super-admin/stores/pending",
        roles: ["super_admin"],
      },
      {
        id: "sa-stores-suspended",
        label: "Suspended Stores",
        href: "/super-admin/stores/suspended",
        roles: ["super_admin"],
      },
    ],
  },
  {
    id: "sa-users",
    label: "User Management",
    href: "/super-admin/users",
    icon: Users,
    roles: ["super_admin"],
    children: [
      {
        id: "sa-users-all",
        label: "All Users",
        href: "/super-admin/users",
        roles: ["super_admin"],
      },
      {
        id: "sa-users-banned",
        label: "Banned Users",
        href: "/super-admin/users/banned",
        roles: ["super_admin"],
      },
      {
        id: "sa-users-permissions",
        label: "Permissions",
        href: "/super-admin/users/permissions",
        roles: ["super_admin"],
      },
    ],
  },
  {
    id: "sa-organizations",
    label: "Organizations",
    href: "/super-admin/organizations",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    id: "sa-reports",
    label: "Reports & Analytics",
    href: "/super-admin/reports",
    icon: BarChart3,
    roles: ["super_admin"],
    children: [
      {
        id: "sa-reports-analytics",
        label: "System Analytics",
        href: "/super-admin/reports/analytics",
        roles: ["super_admin"],
      },
      {
        id: "sa-reports-audit",
        label: "Audit Logs",
        href: "/super-admin/reports/audit",
        roles: ["super_admin"],
      },
      {
        id: "sa-reports-performance",
        label: "Performance",
        href: "/super-admin/reports/performance",
        roles: ["super_admin"],
      },
    ],
  },
  {
    id: "sa-platform",
    label: "Platform Settings",
    href: "/super-admin/settings",
    icon: Settings,
    roles: ["super_admin"],
    children: [
      {
        id: "sa-settings-general",
        label: "General",
        href: "/super-admin/settings",
        roles: ["super_admin"],
      },
      {
        id: "sa-settings-features",
        label: "Feature Flags",
        href: "/super-admin/settings/features",
        roles: ["super_admin"],
      },
      {
        id: "sa-settings-notifications",
        label: "Notifications",
        href: "/super-admin/settings/notifications",
        roles: ["super_admin"],
      },
    ],
  },
];

/** Store Admin sidebar items */
const STORE_ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "admin-dashboard",
    label: "Dashboard",
    href: "/store-admin/dashboard",
    icon: LayoutDashboard,
    shortcut: "Alt+D",
    roles: ["store_admin", "super_admin"],
  },
  {
    id: "admin-pos",
    label: "Point of Sale",
    href: "/pos",
    icon: ShoppingCart,
    shortcut: "Alt+P",
    roles: ["store_admin", "super_admin"],
  },
  {
    id: "admin-employees",
    label: "Employees",
    href: "/store-admin/employees",
    icon: Users,
    roles: ["store_admin", "super_admin"],
    permissions: ["manage_employees"],
    children: [
      {
        id: "admin-employees-list",
        label: "All Employees",
        href: "/store-admin/employees",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-employees-roles",
        label: "Roles & Permissions",
        href: "/store-admin/employees/roles",
        roles: ["store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "admin-inventory",
    label: "Inventory",
    href: "/store-admin/inventory",
    icon: Package,
    roles: ["store_admin", "super_admin"],
    permissions: ["manage_inventory"],
    children: [
      {
        id: "admin-inventory-products",
        label: "Products",
        href: "/store-admin/products",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-inventory-stock",
        label: "Stock Levels",
        href: "/store-admin/stock",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-inventory-purchases",
        label: "Purchases",
        href: "/store-admin/purchase",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-inventory-suppliers",
        label: "Suppliers",
        href: "/store-admin/suppliers",
        roles: ["store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "admin-reports",
    label: "Reports",
    href: "/store-admin/reports",
    icon: BarChart3,
    roles: ["store_admin", "super_admin"],
    permissions: ["view_reports"],
    children: [
      {
        id: "admin-reports-sales",
        label: "Sales Report",
        href: "/store-admin/reports/sales",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-reports-revenue",
        label: "Revenue Analytics",
        href: "/store-admin/reports/revenue",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-reports-staff",
        label: "Staff Performance",
        href: "/store-admin/reports/staff",
        roles: ["store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "admin-customers",
    label: "Customers",
    href: "/store-admin/customers",
    icon: UserCheck,
    roles: ["store_admin", "super_admin"],
    permissions: ["manage_customers"],
  },
  {
    id: "admin-settings",
    label: "Store Settings",
    href: "/store-admin/settings",
    icon: Settings,
    shortcut: "Alt+S",
    roles: ["store_admin", "super_admin"],
    permissions: ["manage_store_settings"],
    children: [
      {
        id: "admin-settings-general",
        label: "General",
        href: "/store-admin/settings",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-settings-security",
        label: "Security",
        href: "/store-admin/settings/security",
        roles: ["store_admin", "super_admin"],
      },
      {
        id: "admin-settings-ip",
        label: "IP Whitelist",
        href: "/store-admin/settings/ip-whitelist",
        roles: ["store_admin", "super_admin"],
      },
    ],
  },
];

/** Manager sidebar items */
const MANAGER_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "mgr-dashboard",
    label: "Dashboard",
    href: "/manager/dashboard",
    icon: LayoutDashboard,
    shortcut: "Alt+D",
    roles: ["manager", "store_admin", "super_admin"],
  },
  {
    id: "mgr-pos",
    label: "Point of Sale",
    href: "/pos",
    icon: ShoppingCart,
    shortcut: "Alt+P",
    roles: ["manager", "store_admin", "super_admin"],
  },
  {
    id: "mgr-team",
    label: "Team",
    href: "/manager/team",
    icon: Users,
    roles: ["manager", "store_admin", "super_admin"],
    permissions: ["manage_employees"],
    children: [
      {
        id: "mgr-team-staff",
        label: "Staff List",
        href: "/manager/team",
        roles: ["manager", "store_admin", "super_admin"],
      },
      {
        id: "mgr-team-shifts",
        label: "Shifts",
        href: "/manager/team/shifts",
        roles: ["manager", "store_admin", "super_admin"],
      },
      {
        id: "mgr-team-performance",
        label: "Performance",
        href: "/manager/team/performance",
        roles: ["manager", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "mgr-inventory",
    label: "Inventory",
    href: "/manager/inventory",
    icon: Package,
    roles: ["manager", "store_admin", "super_admin"],
    permissions: ["manage_inventory"],
  },
  {
    id: "mgr-operations",
    label: "Operations",
    href: "/manager/operations",
    icon: Activity,
    roles: ["manager", "store_admin", "super_admin"],
    children: [
      {
        id: "mgr-ops-daily",
        label: "Daily Ops",
        href: "/manager/operations/daily",
        roles: ["manager", "store_admin", "super_admin"],
      },
      {
        id: "mgr-ops-quality",
        label: "Quality Control",
        href: "/manager/operations/quality",
        roles: ["manager", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "mgr-reports",
    label: "Reports",
    href: "/manager/reports",
    icon: BarChart3,
    roles: ["manager", "store_admin", "super_admin"],
    permissions: ["view_reports"],
  },
  {
    id: "mgr-customers",
    label: "Customers",
    href: "/manager/customers",
    icon: UserCheck,
    roles: ["manager", "store_admin", "super_admin"],
    permissions: ["manage_customers"],
  },
];

/** POS / Cashier sidebar items */
const POS_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "pos-register",
    label: "Register",
    href: "/pos",
    icon: ShoppingCart,
    shortcut: "Alt+R",
    roles: ["cashier", "manager", "store_admin", "super_admin"],
  },
  {
    id: "pos-orders",
    label: "Orders",
    href: "/pos/orders",
    icon: Receipt,
    shortcut: "Alt+O",
    roles: ["cashier", "manager", "store_admin", "super_admin"],
  },
  {
    id: "pos-customers",
    label: "Customers",
    href: "/pos/customers",
    icon: UserCheck,
    roles: ["cashier", "manager", "store_admin", "super_admin"],
    permissions: ["manage_customers"],
  },
  {
    id: "pos-refunds",
    label: "Refunds",
    href: "/pos/refunds",
    icon: ArrowLeftRight,
    roles: ["manager", "store_admin", "super_admin"],
    permissions: ["process_refunds"],
  },
  {
    id: "pos-daily-report",
    label: "Daily Report",
    href: "/pos/daily-report",
    icon: FileText,
    roles: ["cashier", "manager", "store_admin", "super_admin"],
  },
];

/** Accountant sidebar items */
const ACCOUNTANT_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "acc-dashboard",
    label: "Dashboard",
    href: "/accountant/dashboard",
    icon: LayoutDashboard,
    shortcut: "Alt+D",
    roles: ["accountant", "store_admin", "super_admin"],
  },
  {
    id: "acc-transactions",
    label: "Transactions",
    href: "/accountant/transactions",
    icon: CreditCard,
    roles: ["accountant", "store_admin", "super_admin"],
    children: [
      {
        id: "acc-txn-all",
        label: "All Transactions",
        href: "/accountant/transactions",
        roles: ["accountant", "store_admin", "super_admin"],
      },
      {
        id: "acc-txn-expenses",
        label: "Expenses",
        href: "/accountant/transactions/expenses",
        roles: ["accountant", "store_admin", "super_admin"],
      },
      {
        id: "acc-txn-reconcile",
        label: "Reconciliation",
        href: "/accountant/transactions/reconcile",
        roles: ["accountant", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "acc-reports",
    label: "Financial Reports",
    href: "/accountant/reports",
    icon: BarChart3,
    roles: ["accountant", "store_admin", "super_admin"],
    permissions: ["view_financials"],
    children: [
      {
        id: "acc-reports-income",
        label: "Income Statement",
        href: "/accountant/reports/income",
        roles: ["accountant", "store_admin", "super_admin"],
      },
      {
        id: "acc-reports-balance",
        label: "Balance Sheet",
        href: "/accountant/reports/balance",
        roles: ["accountant", "store_admin", "super_admin"],
      },
      {
        id: "acc-reports-tax",
        label: "Tax Report",
        href: "/accountant/reports/tax",
        roles: ["accountant", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "acc-invoices",
    label: "Invoices & Billing",
    href: "/accountant/invoices",
    icon: FileText,
    roles: ["accountant", "store_admin", "super_admin"],
    children: [
      {
        id: "acc-inv-manage",
        label: "Manage Invoices",
        href: "/accountant/invoices",
        roles: ["accountant", "store_admin", "super_admin"],
      },
      {
        id: "acc-inv-customers",
        label: "Customer Accounts",
        href: "/accountant/invoices/customers",
        roles: ["accountant", "store_admin", "super_admin"],
      },
      {
        id: "acc-inv-terms",
        label: "Payment Terms",
        href: "/accountant/invoices/terms",
        roles: ["accountant", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "acc-payroll",
    label: "Payroll",
    href: "/accountant/payroll",
    icon: Wallet,
    roles: ["accountant", "store_admin", "super_admin"],
  },
];

/** Inventory Manager sidebar items */
const INVENTORY_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "inv-dashboard",
    label: "Dashboard",
    href: "/inventory/dashboard",
    icon: LayoutDashboard,
    shortcut: "Alt+D",
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
  },
  {
    id: "inv-products",
    label: "Products",
    href: "/inventory/products",
    icon: Boxes,
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    permissions: ["manage_inventory"],
    children: [
      {
        id: "inv-products-all",
        label: "All Products",
        href: "/inventory/products",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-products-categories",
        label: "Categories",
        href: "/inventory/products/categories",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "inv-stock",
    label: "Stock Management",
    href: "/inventory/stock",
    icon: Package,
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    permissions: ["manage_inventory"],
    children: [
      {
        id: "inv-stock-levels",
        label: "Stock Levels",
        href: "/inventory/stock",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-stock-low",
        label: "Low Stock Alerts",
        href: "/inventory/stock/low",
        icon: AlertTriangle,
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-stock-transfer",
        label: "Stock Transfer",
        href: "/inventory/stock/transfer",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "inv-purchase-orders",
    label: "Purchase Orders",
    href: "/inventory/purchase-orders",
    icon: ClipboardList,
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    children: [
      {
        id: "inv-po-new",
        label: "New Order",
        href: "/inventory/purchase-orders/new",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-po-active",
        label: "Active Orders",
        href: "/inventory/purchase-orders",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-po-receiving",
        label: "Receiving",
        href: "/inventory/purchase-orders/receiving",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "inv-suppliers",
    label: "Suppliers",
    href: "/inventory/suppliers",
    icon: Truck,
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    permissions: ["manage_suppliers"],
  },
  {
    id: "inv-reports",
    label: "Inventory Reports",
    href: "/inventory/reports",
    icon: BarChart3,
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    permissions: ["view_reports"],
    children: [
      {
        id: "inv-reports-valuation",
        label: "Valuation",
        href: "/inventory/reports/valuation",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-reports-shrinkage",
        label: "Shrinkage Analysis",
        href: "/inventory/reports/shrinkage",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
    ],
  },
  {
    id: "inv-audits",
    label: "Audits & Adjustments",
    href: "/inventory/audits",
    icon: PackageSearch,
    roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    children: [
      {
        id: "inv-audits-count",
        label: "Physical Count",
        href: "/inventory/audits/count",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
      {
        id: "inv-audits-adjust",
        label: "Stock Adjustment",
        href: "/inventory/audits/adjust",
        roles: ["inventory_manager", "manager", "store_admin", "super_admin"],
      },
    ],
  },
];

// ============================================================================
// Header Configs — Per page type
// ============================================================================

const HEADER_CONFIGS: Record<PageType, HeaderConfig> = {
  "super-admin": {
    type: "dashboard",
    title: "Super Admin",
    subtitle: "Platform Administration",
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    showSidebarToggle: true,
  },
  "store-admin": {
    type: "dashboard",
    title: "Store Admin",
    subtitle: "Store Management",
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    showSidebarToggle: true,
  },
  manager: {
    type: "dashboard",
    title: "Manager",
    subtitle: "Store Operations",
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    showSidebarToggle: true,
  },
  pos: {
    type: "pos",
    title: "Point of Sale",
    subtitle: "",
    showSearch: true,
    showNotifications: false,
    showUserMenu: true,
    showBreadcrumbs: false,
    showSidebarToggle: true,
  },
  accountant: {
    type: "dashboard",
    title: "Accountant",
    subtitle: "Financial Management",
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    showSidebarToggle: true,
  },
  inventory: {
    type: "dashboard",
    title: "Inventory",
    subtitle: "Stock Management",
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    showBreadcrumbs: true,
    showSidebarToggle: true,
  },
};

// ============================================================================
// Sidebar Configs — Per page type
// ============================================================================

const SIDEBAR_CONFIGS: Record<PageType, Omit<SidebarConfig, "items"> & { items: SidebarItem[] }> = {
  "super-admin": {
    enabled: true,
    defaultOpen: true,
    collapsible: true,
    items: SUPER_ADMIN_SIDEBAR_ITEMS,
  },
  "store-admin": {
    enabled: true,
    defaultOpen: true,
    collapsible: true,
    items: STORE_ADMIN_SIDEBAR_ITEMS,
  },
  manager: {
    enabled: true,
    defaultOpen: true,
    collapsible: true,
    items: MANAGER_SIDEBAR_ITEMS,
  },
  pos: {
    enabled: true,
    defaultOpen: false,
    collapsible: true,
    items: POS_SIDEBAR_ITEMS,
  },
  accountant: {
    enabled: true,
    defaultOpen: true,
    collapsible: true,
    items: ACCOUNTANT_SIDEBAR_ITEMS,
  },
  inventory: {
    enabled: true,
    defaultOpen: true,
    collapsible: true,
    items: INVENTORY_SIDEBAR_ITEMS,
  },
};

// ============================================================================
// Responsive Configs — Per page type
// ============================================================================

const RESPONSIVE_CONFIGS: Record<PageType, ResponsiveConfig> = {
  "super-admin": {
    mobile: { sidebarMode: "sheet", headerCompact: false },
  },
  "store-admin": {
    mobile: { sidebarMode: "sheet", headerCompact: false },
  },
  manager: {
    mobile: { sidebarMode: "sheet", headerCompact: false },
  },
  pos: {
    mobile: { sidebarMode: "hidden", headerCompact: true },
  },
  accountant: {
    mobile: { sidebarMode: "sheet", headerCompact: false },
  },
  inventory: {
    mobile: { sidebarMode: "sheet", headerCompact: false },
  },
};

// ============================================================================
// Main Config Getter
// ============================================================================

/** Page types that should NOT show a footer */
const PAGES_WITHOUT_FOOTER: PageType[] = ["pos", "store-admin"];

/** Get full layout configuration for a page type */
export function getLayoutConfig(page: PageType): LayoutConfig {
  return {
    page,
    header: HEADER_CONFIGS[page],
    sidebar: SIDEBAR_CONFIGS[page],
    footer: { enabled: !PAGES_WITHOUT_FOOTER.includes(page) },
    responsive: RESPONSIVE_CONFIGS[page],
  };
}

/** Resolve page type from pathname */
export function resolvePageType(pathname: string): PageType | null {
  if (pathname.startsWith("/super-admin")) return "super-admin";
  if (pathname.startsWith("/store-admin")) return "store-admin";
  if (pathname.startsWith("/manager")) return "manager";
  if (pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/accountant")) return "accountant";
  if (pathname.startsWith("/inventory")) return "inventory";
  return null;
}

/** Filter sidebar items based on user role and permissions */
export function filterSidebarItems(
  items: SidebarItem[],
  userRole: RoleName,
  userPermissions: string[] = []
): SidebarItem[] {
  return items
    .filter((item) => {
      // Check role access
      if (!item.roles.includes(userRole)) return false;
      // Check permissions (if required — any match is sufficient)
      if (item.permissions && item.permissions.length > 0) {
        return item.permissions.some((p) => userPermissions.includes(p));
      }
      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => {
        if (!child.roles.includes(userRole)) return false;
        if (child.permissions && child.permissions.length > 0) {
          return child.permissions.some((p) => userPermissions.includes(p));
        }
        return true;
      }),
    }));
}

/** Merge a partial override config with the base config */
export function mergeLayoutConfig(
  base: LayoutConfig,
  override: Partial<LayoutConfig>
): LayoutConfig {
  return {
    page: override.page ?? base.page,
    header: override.header ? { ...base.header, ...override.header } : base.header,
    sidebar: override.sidebar ? { ...base.sidebar, ...override.sidebar } : base.sidebar,
    footer: override.footer ? { ...base.footer, ...override.footer } : base.footer,
    responsive: override.responsive
      ? {
        mobile: {
          ...base.responsive.mobile,
          ...override.responsive.mobile,
        },
      }
      : base.responsive,
  };
}
