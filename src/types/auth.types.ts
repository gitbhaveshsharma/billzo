import type {
  User as SupabaseUser,
  Session as SupabaseSession,
} from "@supabase/supabase-js";
import type { RoleName, StoreStatus } from "./database.types";

export type AuthUser = SupabaseUser;
export type AuthSession = SupabaseSession;

/** OTP verification types */
export type OTPType = "signup" | "login";

/** Auth flow step tracking */
export type AuthStep = "email" | "otp" | "complete";

/** Data stored after successful OTP verification */
export interface VerifiedUserData {
  userId: string;
  email: string;
  isNewUser: boolean;
}

/** Login validation result from login_user() */
export interface LoginValidationResult {
  success: boolean;
  errorCode?: string;
  message: string;
  userId?: string;
  storeId?: string;
  role?: string;
  storeStatus?: string;
}

// ============================================================================
// Enriched User — fetched from the v_user_store_role view
// ============================================================================

export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
  role: RoleName;
  permissions: string[];
  storeId: string | null;
  storeName: string | null;
  storeStatus: StoreStatus | null;
  organizationId: string | null;
  organizationName: string | null;
  isActive: boolean;
  isBanned: boolean;
  bannedReason: string | null;
}

// ============================================================================
// Auth Context Value — exposed by the AuthProvider
// ============================================================================

export interface AuthContextValue {
  /** Supabase auth user */
  authUser: AuthUser | null;
  /** Enriched app user with role/store info */
  appUser: AppUser | null;
  /** Whether the initial auth check has completed */
  isInitialized: boolean;
  /** Whether a session refresh / user fetch is in progress */
  isLoading: boolean;
  /** Convenience flag */
  isAuthenticated: boolean;
  /** Force-refresh the session and user data */
  refreshSession: () => Promise<void>;
  /** Sign out of Supabase and clear state */
  logout: () => Promise<void>;
}
