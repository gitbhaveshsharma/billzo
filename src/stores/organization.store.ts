import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization } from "@/types/organization.types";

interface OrganizationState {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;

  setOrganization: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      organization: null,
      isLoading: false,
      error: null,

      setOrganization: (organization) =>
        set({ organization, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
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
