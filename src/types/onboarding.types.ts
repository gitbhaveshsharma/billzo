// ============================================================================
// Onboarding Types
// Matches the get_onboarding_status() function from database migration
// ============================================================================

export type OnboardingStep =
  | "create_organization"
  | "create_store"
  | "pending_approval"
  | "completed"
  | "store_rejected"
  | "store_suspended"
  | "unknown";

export interface OnboardingStatus {
  /** Whether user has created an organization */
  has_organization: boolean;
  /** Whether user has created a store */
  has_store: boolean;
  /** Current store status (pending, active, rejected, suspended) */
  store_status: string | null;
  /** Whether user is assigned to any active store */
  is_store_user: boolean;
  /** Next step in onboarding process */
  next_step: OnboardingStep;
  /** Where to redirect the user */
  redirect_to: string;
  /** Whether onboarding is fully complete */
  is_onboarding_complete: boolean;
}

export interface OnboardingMetadata {
  has_organization: boolean;
  has_store: boolean;
  store_approved: boolean;
  last_step: string | null;
  skipped_steps: string[];
  organization_id?: string;
  organization_name?: string;
  store_id?: string;
  store_name?: string;
  store_status?: string;
  joined_via?: "invitation" | "creation";
  invited_by?: string;
  accepted_at?: string;
  approved_at?: string;
  approved_by?: string;
}
