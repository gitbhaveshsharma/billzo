// ============================================================================
// Auth Provider Configuration
// ============================================================================

export const AUTH_CONFIG = {
  /** How often (ms) to check whether the session needs a refresh */
  refreshCheckIntervalMs: 5 * 60 * 1000,

  /** Refresh the token this many minutes before it expires */
  refreshBeforeExpiryMinutes: 10,

  /** Auto-logout after this many minutes of inactivity (0 = disabled) */
  inactivityTimeoutMinutes: 0,

  /** Sync auth state across browser tabs via storage events */
  enableMultiTabSync: true,

  /** LocalStorage key used for cross-tab logout signalling */
  logoutSignalKey: "storepos-logout-signal",

  /** Supabase auth events the provider listens for */
  trackedEvents: [
    "SIGNED_IN",
    "SIGNED_OUT",
    "TOKEN_REFRESHED",
    "USER_UPDATED",
  ] as const,
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
