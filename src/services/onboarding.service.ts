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

      const { data, error } = await (supabase.rpc as CallableFunction)(
        "get_onboarding_status",
        {
          p_user_id: userId || null,
        }
      );

      if (error) {
        return { data: null, error: error.message };
      }

      // The RPC returns a JSONB object, cast it to OnboardingStatus
      const status = data as unknown as OnboardingStatus;

      return { data: status, error: null };
    } catch (err) {
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
