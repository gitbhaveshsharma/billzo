import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization } from "@/types/organization.types";
import { organizationService } from "@/services/organization.service";

interface OrganizationState {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;

  setOrganization: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /** Fetch org by ID and populate state (skips if already loaded for same ID) */
  fetchOrganization: (orgId: string) => Promise<void>;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      organization: null,
      isLoading: false,
      error: null,

      setOrganization: (organization) =>
        set({ organization, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      fetchOrganization: async (orgId: string) => {
        // Skip if already loaded for this org
        if (get().organization?.id === orgId) return;
        set({ isLoading: true, error: null });
        const { data, error } = await organizationService.getById(orgId);
        if (error || !data) {
          set({ isLoading: false, error: error ?? "Failed to fetch organization" });
          return;
        }
        set({ organization: data, isLoading: false, error: null });
      },

      reset: () =>
        set({ organization: null, isLoading: false, error: null }),
    }),
    {
      name: "organization-storage",
      partialize: (state) => ({
        organization: state.organization,
      }),
    }
  )
);
