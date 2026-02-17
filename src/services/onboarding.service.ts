import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type { OnboardingStatus } from "@/types/onboarding.types";

/**
 * Onboarding Service
 * Handles profile completion tracking and onboarding status
 */
export const onboardingService = {
  /**
   * Get user's onboarding status
   * Calls the database function get_onboarding_status()
   */
  getOnboardingStatus: async (
    userId?: string
  ): Promise<ServiceResponse<OnboardingStatus>> => {
    try {
      const supabase = createClient();

      console.log("📊 [ONBOARDING SERVICE] Fetching status for user:", userId || "current user");

      const { data, error } = await (supabase.rpc as CallableFunction)(
        "get_onboarding_status",
        {
          p_user_id: userId || null,
        }
      );

      if (error) {
        console.error("❌ [ONBOARDING SERVICE] Error:", error);
        return { data: null, error: error.message };
      }

      // The RPC returns a JSONB object, cast it to OnboardingStatus
      const status = data as unknown as OnboardingStatus;

      console.log("✅ [ONBOARDING SERVICE] Status received:", {
        hasOrganization: status.has_organization,
        hasStore: status.has_store,
        storeStatus: status.store_status,
        isStoreUser: status.is_store_user,
        nextStep: status.next_step,
        redirectTo: status.redirect_to,
        isComplete: status.is_onboarding_complete,
      });

      return { data: status, error: null };
    } catch (err) {
      console.error("❌ [ONBOARDING SERVICE] Exception:", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : "Failed to get onboarding status",
      };
    }
  },

  /**
   * Update onboarding progress
   * Calls the database function update_onboarding_progress()
   */
  updateOnboardingProgress: async (
    userId: string,
    step: string,
    metadata?: Record<string, unknown>
  ): Promise<ServiceResponse<boolean>> => {
    try {
      const supabase = createClient();

      const { data, error } = await (supabase.rpc as CallableFunction)(
        "update_onboarding_progress",
        {
          p_user_id: userId,
          p_step: step,
          p_metadata: metadata || null,
        }
      );

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as boolean, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Failed to update onboarding progress",
      };
    }
  },
};
