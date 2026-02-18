// ============================================================================
// Middleware Configuration — Controls logging, sessions, redirects, security
// Single source of truth for all middleware behavior
// ============================================================================

// ── Route protection levels ────────────────────────────────────────────────
// Defines which paths belong to which protection category.
// The middleware uses this instead of hardcoding path checks.

export const ROUTE_PROTECTION = {
  /** Paths that bypass middleware entirely (static assets, internals) */
  bypass: [
    "/_next/static",
    "/_next/image",
    "/favicon.ico",
    "/sitemap.xml",
    "/robots.txt",
    "/images",
    "/fonts",
    "/api/webhooks",
  ],

  /** Onboarding-flow pages: completed users must NOT access these */
  onboarding: ["/create-organization", "/create-store", "/pending-approval"],

  /** Routes where unauthenticated users should be (login/signup/otp) */
  auth: ["/login", "/signup", "/verify-otp"],

  /** Routes that should never be checked by the client-side onboarding hook */
  skipOnboardingCheck: [
    "/login",
    "/signup",
    "/verify-otp",
    "/unauthorized",
    "/account-suspended",
  ],
} as const;

// ── Rate limiting ──────────────────────────────────────────────────────────

export interface RateLimitRule {
  /** Glob-style path prefix to match */
  pathPrefix: string;
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export const RATE_LIMIT_CONFIG = {
  /** Whether rate limiting is enabled */
  enabled: true,
  /** Default rate limit for all authenticated routes */
  defaultLimit: {
    maxRequests: 100,
    windowSeconds: 60,
  },
  /** Per-route overrides (more restrictive for sensitive routes) */
  rules: [
    { pathPrefix: "/api/", maxRequests: 60, windowSeconds: 60 },
    { pathPrefix: "/login", maxRequests: 10, windowSeconds: 60 },
    { pathPrefix: "/signup", maxRequests: 5, windowSeconds: 60 },
    { pathPrefix: "/verify-otp", maxRequests: 10, windowSeconds: 60 },
    { pathPrefix: "/super-admin", maxRequests: 120, windowSeconds: 60 },
  ] as RateLimitRule[],
} as const;

// ── Main config ────────────────────────────────────────────────────────────

export const MIDDLEWARE_CONFIG = {
  // ── Logging ────────────────────────────────────────────────────────────
  logging: {
    enabled: true,
    level: "info" as "debug" | "info" | "warn" | "error",
    /** Log auth state checks */
    logAuthAttempts: true,
    /** Log every route access */
    logRouteAccess: true,
    /** Log unauthorized/forbidden access */
    logUnauthorizedAccess: true,
    /** Verbose console.log statements (disable in production) */
    verboseConsole: process.env.NODE_ENV === "development",
  },

  // ── Session ────────────────────────────────────────────────────────────
  session: {
    /** Minutes before expiry to trigger an auto-refresh */
    refreshThresholdMinutes: 10,
    /** Interval (minutes) between refresh checks in the auth provider */
    refreshCheckIntervalMinutes: 5,
  },

  // ── Security ───────────────────────────────────────────────────────────
  security: {
    enableIPCheck: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },

  // ── Redirects ──────────────────────────────────────────────────────────
  redirects: {
    /** Where authenticated users go from login/signup */
    afterAuth: "/dashboard",
    /** Where unauthenticated users go when they hit a protected route */
    unauthenticated: "/login",
    /** Where role-check failures redirect to */
    unauthorized: "/unauthorized",
    /** Where pending-store users go */
    pendingStore: "/pending-approval",
    /** Where banned/suspended users go */
    banned: "/account-suspended",
    /** First onboarding step for users with no org */
    onboardingStart: "/create-organization",
  },

  // ── Store Status ───────────────────────────────────────────────────────
  storeStatus: {
    handlePendingStores: true,
  },

  // ── Rate Limiting ──────────────────────────────────────────────────────
  rateLimit: RATE_LIMIT_CONFIG,

  // ── Route Protection ───────────────────────────────────────────────────
  routes: ROUTE_PROTECTION,

  // ── Development Overrides ──────────────────────────────────────────────
  dev: {
    bypassAuth: false,
    mockUser: undefined as
      | { id: string; email: string; role: string }
      | undefined,
  },
} as const;

export type MiddlewareConfig = typeof MIDDLEWARE_CONFIG;
