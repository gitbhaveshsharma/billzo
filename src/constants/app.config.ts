export const APP_CONFIG = {
  name: "StorePOS",
  description: "Multi-tenant SaaS POS System",
  version: "1.0.0",

  /** OTP settings */
  otp: {
    length: 6,
    expiryMinutes: 10,
    resendCooldownSeconds: 60,
  },

  /** Session settings */
  session: {
    expiryDays: 7,
  },

  /** Polling intervals (ms) */
  polling: {
    storeApproval: 30_000,
  },

  /** Route paths */
  routes: {
    home: "/",
    login: "/login",
    signup: "/signup",
    verifyOtp: "/verify-otp",
    createOrganization: "/create-organization",
    createStore: "/create-store",
    pendingApproval: "/pending-approval",
    dashboard: "/dashboard",
    inviteAccept: "/invite/accept",
  },

  /** Supported store types */
  storeTypes: [
    { value: "retail", label: "Retail Store" },
    { value: "warehouse", label: "Warehouse" },
    { value: "franchise", label: "Franchise" },
    { value: "outlet", label: "Outlet" },
    { value: "kiosk", label: "Kiosk" },
  ] as const,

  /** Registration types */
  registrationTypes: [
    { value: "proprietorship", label: "Proprietorship" },
    { value: "partnership", label: "Partnership" },
    { value: "private_limited", label: "Private Limited" },
    { value: "public_limited", label: "Public Limited" },
    { value: "llp", label: "LLP" },
    { value: "other", label: "Other" },
  ] as const,
} as const;
