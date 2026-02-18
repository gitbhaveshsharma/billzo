import type { RoleName } from "@/types/database.types";

// ============================================================================
// Route Configuration — Single source of truth for all route access rules
// ============================================================================

export type RouteType = "public" | "auth" | "onboarding" | "protected" | "role-based";

export interface RouteRedirects {
  authenticated?: string;
  unauthenticated?: string;
  unauthorized?: string;
}

export interface RouteConfig {
  /** Route path — supports trailing wildcard with * */
  path: string;
  /** Route protection type */
  type: RouteType;
  /** Roles permitted to access (role-based routes only) */
  allowedRoles?: RoleName[];
  /** Granular permissions required (role-based routes only) */
  requiredPermissions?: string[];
  /** Redirect targets for various auth states */
  redirect?: RouteRedirects;
  /** Human-readable description for logging */
  description?: string;
}

// ---------------------------------------------------------------------------
// Route Definitions
// ---------------------------------------------------------------------------

export const ROUTE_CONFIGS: RouteConfig[] = [
  // ── Public Routes ────────────────────────────────────────────────────────
  {
    path: "/",
    type: "public",
    redirect: { authenticated: "/dashboard" },
    description: "Landing page",
  },

  // ── Auth Routes (unauthenticated only) ───────────────────────────────────
  {
    path: "/login",
    type: "auth",
    redirect: { authenticated: "/dashboard" },
    description: "Login page",
  },
  {
    path: "/signup",
    type: "auth",
    redirect: { authenticated: "/create-organization" },
    description: "Signup page",
  },
  {
    path: "/verify-otp",
    type: "auth",
    description: "OTP verification",
  },

  // ── Onboarding Routes (authenticated, may not have store) ────────────────
  {
    path: "/create-organization",
    type: "onboarding",
    redirect: { unauthenticated: "/login" },
    description: "Create organization",
  },
  {
    path: "/create-store",
    type: "onboarding",
    redirect: { unauthenticated: "/login" },
    description: "Create store",
  },
  {
    path: "/pending-approval",
    type: "onboarding",
    redirect: { unauthenticated: "/login" },
    description: "Store pending approval",
  },

  // ── Protected Routes (any authenticated user with active store) ──────────
  {
    path: "/dashboard",
    type: "protected",
    redirect: { unauthenticated: "/login" },
    description: "Main dashboard",
  },
  {
    path: "/profile",
    type: "protected",
    redirect: { unauthenticated: "/login" },
    description: "User profile",
  },
  {
    path: "/settings",
    type: "protected",
    redirect: { unauthenticated: "/login" },
    description: "User settings",
  },
  // ── Role-Based Dashboard Routes ─────────────────────────────────────────
  {
    path: "/pos",
    type: "role-based",
    allowedRoles: ["cashier", "manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Point of Sale System",
  },
  {
    path: "/pos/*",
    type: "role-based",
    allowedRoles: ["cashier", "manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "POS sub-pages",
  },
  {
    path: "/store-admin/dashboard",
    type: "role-based",
    allowedRoles: ["store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Store Admin Dashboard",
  },
  {
    path: "/store-admin/*",
    type: "role-based",
    allowedRoles: ["store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Store Admin area",
  },
  {
    path: "/manager/dashboard",
    type: "role-based",
    allowedRoles: ["manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Manager Dashboard",
  },
  {
    path: "/manager/*",
    type: "role-based",
    allowedRoles: ["manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Manager area",
  },
  {
    path: "/accountant/dashboard",
    type: "role-based",
    allowedRoles: ["accountant", "manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Accountant Dashboard",
  },
  {
    path: "/accountant/*",
    type: "role-based",
    allowedRoles: ["accountant", "manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Accountant area",
  },
  {
    path: "/inventory/dashboard",
    type: "role-based",
    allowedRoles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Inventory Dashboard",
  },
  {
    path: "/inventory/*",
    type: "role-based",
    allowedRoles: ["inventory_manager", "manager", "store_admin", "super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Inventory area",
  },
  {
    path: "/super-admin/dashboard",
    type: "role-based",
    allowedRoles: ["super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Super Admin Dashboard",
  },
  {
    path: "/super-admin/*",
    type: "role-based",
    allowedRoles: ["super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Super Admin area",
  },

  // ── Role-Based Routes ────────────────────────────────────────────────────
  {
    path: "/admin/*",
    type: "role-based",
    allowedRoles: ["super_admin"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Super admin area",
  },
  {
    path: "/admin/stores",
    type: "role-based",
    allowedRoles: ["super_admin"],
    requiredPermissions: ["approve_stores"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Store management (super admin)",
  },
  {
    path: "/employees",
    type: "role-based",
    allowedRoles: ["super_admin", "store_admin", "manager"],
    requiredPermissions: ["manage_employees"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Employee management",
  },
  {
    path: "/store/settings",
    type: "role-based",
    allowedRoles: ["super_admin", "store_admin"],
    requiredPermissions: ["manage_store_settings"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Store settings",
  },
  {
    path: "/store/ip-whitelist",
    type: "role-based",
    allowedRoles: ["super_admin", "store_admin"],
    requiredPermissions: ["manage_ip_whitelist"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "IP whitelist management",
  },
  {
    path: "/reports",
    type: "role-based",
    allowedRoles: ["super_admin", "store_admin", "manager", "accountant"],
    requiredPermissions: ["view_reports"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Reports",
  },
  {
    path: "/reports/financials",
    type: "role-based",
    allowedRoles: ["super_admin", "store_admin", "accountant"],
    requiredPermissions: ["view_financials"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Financial reports",
  },
  {
    path: "/inventory",
    type: "role-based",
    allowedRoles: ["super_admin", "store_admin", "manager", "inventory_manager"],
    requiredPermissions: ["view_inventory"],
    redirect: { unauthenticated: "/login", unauthorized: "/unauthorized" },
    description: "Inventory management",
  },
];

// ---------------------------------------------------------------------------
// Paths that bypass middleware entirely (Next.js internals, static assets)
// ---------------------------------------------------------------------------
export const MIDDLEWARE_BYPASS_PATTERNS = [
  "/_next",
  "/api/webhooks",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/images",
  "/fonts",
] as const;

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Find the route config that matches a given pathname */
export function getRouteConfig(pathname: string): RouteConfig | undefined {
  // Try exact match first
  const exact = ROUTE_CONFIGS.find((r) => r.path === pathname);
  if (exact) return exact;

  // Try wildcard match (e.g., /admin/* matches /admin/stores)
  return ROUTE_CONFIGS.find((r) => {
    if (!r.path.endsWith("/*")) return false;
    const base = r.path.slice(0, -2);
    return pathname.startsWith(base);
  });
}

/** Check whether a path should bypass middleware */
export function shouldBypassMiddleware(pathname: string): boolean {
  return MIDDLEWARE_BYPASS_PATTERNS.some((p) => pathname.startsWith(p));
}

/** Check whether the route is public */
export function isPublicRoute(pathname: string): boolean {
  const config = getRouteConfig(pathname);
  return config?.type === "public";
}

/** Check whether the route is auth-only (unauthenticated users) */
export function isAuthRoute(pathname: string): boolean {
  const config = getRouteConfig(pathname);
  return config?.type === "auth";
}

/** Check whether the route requires authentication */
export function requiresAuth(pathname: string): boolean {
  const config = getRouteConfig(pathname);
  if (!config) return false;
  return ["onboarding", "protected", "role-based"].includes(config.type);
}
