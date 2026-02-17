import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse, LoginUserResponse } from "@/types/api.types";
import type { AppUser } from "@/types/auth.types";
import type { RoleName, StoreStatus, Json } from "@/types/database.types";
import type { OnboardingStatus } from "@/types/onboarding.types";
import { getDefaultPermissions } from "@/config/roles.config";

const getClient = () => createClient();

export const authService = {
  /**
   * Send OTP to email for signup.
   * Creates a new user in auth.users if not exists.
   */
  signUpWithOTP: async (email: string): Promise<ServiceResponse<null>> => {
    try {
      const { error } = await getClient().auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch {
      return { data: null, error: "Failed to send verification code" };
    }
  },

  /**
   * Send OTP to email for login.
   * Does NOT create a new user — only existing users can login.
   */
  loginWithOTP: async (email: string): Promise<ServiceResponse<null>> => {
    try {
      const { error } = await getClient().auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch {
      return { data: null, error: "Failed to send login code" };
    }
  },

  /**
   * Verify OTP code entered by the user.
   * Works for both signup and login flows.
   */
  verifyOTP: async (
    email: string,
    token: string
  ): Promise<ServiceResponse<{ userId: string }>> => {
    try {
      const { data, error } = await getClient().auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) return { data: null, error: error.message };
      if (!data.user) return { data: null, error: "Verification failed" };
      return { data: { userId: data.user.id }, error: null };
    } catch {
      return { data: null, error: "Failed to verify code" };
    }
  },

  /**
   * Call the login_user() database function to validate
   * store assignment, bans, IP whitelist, etc.
   */
  validateLogin: async (
    email: string,
    ip: string
  ): Promise<ServiceResponse<LoginUserResponse>> => {
    try {
      const { data, error } = await (getClient().rpc as CallableFunction)(
        "login_user",
        {
          p_email: email,
          p_ip: ip,
          p_user_agent: navigator.userAgent,
          p_device_info: {
            type: "web",
            browser: navigator.userAgent,
            platform: navigator.platform,
          },
        }
      );
      if (error) return { data: null, error: error.message };
      return { data: data as unknown as LoginUserResponse, error: null };
    } catch {
      return { data: null, error: "Login validation failed" };
    }
  },

  /** Get current authenticated session */
  getSession: async () => {
    try {
      const { data, error } = await getClient().auth.getSession();
      if (error) return { data: null, error: error.message };
      return { data: data.session, error: null };
    } catch {
      return { data: null, error: "Failed to get session" };
    }
  },

  /** Get current authenticated user */
  getUser: async () => {
    try {
      const { data, error } = await getClient().auth.getUser();
      if (error) return { data: null, error: error.message };
      return { data: data.user, error: null };
    } catch {
      return { data: null, error: "Failed to get user" };
    }
  },

  /** Sign out and clear session */
  logout: async (): Promise<ServiceResponse<null>> => {
    try {
      const { error } = await getClient().auth.signOut();
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch {
      return { data: null, error: "Failed to sign out" };
    }
  },

  /** Refresh the current session token */
  refreshSession: async () => {
    try {
      const { data, error } = await getClient().auth.refreshSession();
      if (error) return { data: null, error: error.message };
      return { data: data.session, error: null };
    } catch {
      return { data: null, error: "Failed to refresh session" };
    }
  },

  /**
   * Fetch the enriched AppUser from the v_user_store_role view.
   * Falls back gracefully when the user has no store assignment yet.
   * During onboarding, fetches organization and store data separately.
   */
  getCurrentUser: async (): Promise<ServiceResponse<AppUser>> => {
    try {
      const { data: authData, error: authError } =
        await getClient().auth.getUser();
      if (authError || !authData.user) {
        return { data: null, error: authError?.message ?? "Not authenticated" };
      }

      const supabaseUser = authData.user;

      // Try to load the enriched view row
      const { data: row, error: viewError } = await getClient()
        .from("v_user_store_role")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .maybeSingle();

      if (viewError) {
        return { data: null, error: viewError.message };
      }

      // User exists in auth but has no store assignment yet (onboarding)
      if (!row) {
        // Fetch profile to get full name
        const { data: profile } = await getClient()
          .from("profiles")
          .select("full_name")
          .eq("id", supabaseUser.id)
          .single();

        // Check if user has created an organization (during onboarding)
        const { data: organization } = await getClient()
          .from("organizations")
          .select("id, name")
          .eq("created_by", supabaseUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check if user has created a store (during onboarding)
        const { data: store } = await getClient()
          .from("stores")
          .select("id, name, status")
          .eq("created_by", supabaseUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const appUser: AppUser = {
          id: supabaseUser.id,
          email: supabaseUser.email ?? "",
          fullName: profile?.full_name ?? null,
          role: "cashier",
          permissions: [],
          storeId: store?.id ?? null,
          storeName: store?.name ?? null,
          storeStatus: (store?.status as StoreStatus) ?? null,
          organizationId: organization?.id ?? null,
          organizationName: organization?.name ?? null,
          isActive: true,
          isBanned: false,
          bannedReason: null,
        };
        return { data: appUser, error: null };
      }

      // Parse permissions from DB JSON
      const rawPerms = row.permissions;
      const dbPermissions = parsePermissions(rawPerms);

      // Merge DB permissions with role defaults
      const rolePerms = getDefaultPermissions(row.role_name as RoleName);
      const merged = [...new Set([...dbPermissions, ...rolePerms])];

      const appUser: AppUser = {
        id: row.user_id,
        email: row.email,
        fullName: row.full_name,
        role: row.role_name as RoleName,
        permissions: merged,
        storeId: row.store_id,
        storeName: row.store_name,
        storeStatus: row.store_status as StoreStatus,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        isActive: row.is_active,
        isBanned: row.is_banned,
        bannedReason: null,
      };

      return { data: appUser, error: null };
    } catch {
      return { data: null, error: "Failed to fetch current user" };
    }
  },

  /**
   * Get user's onboarding status
   * Calls the database function get_onboarding_status()
   */
  getOnboardingStatus: async (
    userId?: string
  ): Promise<ServiceResponse<OnboardingStatus>> => {
    try {
      const { data, error } = await (getClient().rpc as CallableFunction)(
        "get_onboarding_status",
        {
          p_user_id: userId || null,
        }
      );

      if (error) {
        return { data: null, error: error.message };
      }

      const status = data as unknown as OnboardingStatus;
      return { data: status, error: null };
    } catch {
      return { data: null, error: "Failed to get onboarding status" };
    }
  },
};

/** Safely parse a Json column into a string array of permissions */
function parsePermissions(raw: Json): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw === "object" && raw !== null) {
    return Object.entries(raw)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}
