// ============================================================================
// Middleware Configuration — Controls logging, sessions, redirects, security
// ============================================================================

export const MIDDLEWARE_CONFIG = {
  // ── Logging ──────────────────────────────────────────────────────────────
  logging: {
    enabled: true,
    level: "info" as "debug" | "info" | "warn" | "error",
    logAuthAttempts: true,
    logRouteAccess: true,
    logUnauthorizedAccess: true,
  },

  // ── Session ──────────────────────────────────────────────────────────────
  session: {
    /** Minutes before expiry to trigger an auto-refresh */
    refreshThresholdMinutes: 10,
    /** Interval (minutes) between refresh checks in the auth provider */
    refreshCheckIntervalMinutes: 5,
  },

  // ── Security ─────────────────────────────────────────────────────────────
  security: {
    enableIPCheck: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },

  // ── Redirects ────────────────────────────────────────────────────────────
  redirects: {
    defaultAuthRedirect: "/dashboard",
    defaultUnauthRedirect: "/login",
    defaultUnauthorizedRedirect: "/unauthorized",
    pendingStoreRedirect: "/pending-approval",
    bannedUserRedirect: "/account-suspended",
    onboardingRedirect: "/create-organization",
  },

  // ── Store Status ─────────────────────────────────────────────────────────
  storeStatus: {
    handlePendingStores: true,
  },

  // ── Development Overrides ────────────────────────────────────────────────
  dev: {
    bypassAuth: false,
    mockUser: undefined as
      | { id: string; email: string; role: string }
      | undefined,
  },
} as const;

export type MiddlewareConfig = typeof MIDDLEWARE_CONFIG;
