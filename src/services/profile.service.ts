import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileInsert, ProfileUpdate } from "@/types/profile.types";
import type { ServiceResponse } from "@/types/api.types";

const getClient = () => createClient();

export const profileService = {
  /** Create a new profile after OTP signup verification */
  create: async (data: ProfileInsert): Promise<ServiceResponse<Profile>> => {
    try {
      const { data: profile, error } = await getClient()
        .from("profiles")
        .insert(data as never)
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: profile, error: null };
    } catch {
      return { data: null, error: "Failed to create profile" };
    }
  },

  /** Get profile by user ID */
  getById: async (id: string): Promise<ServiceResponse<Profile>> => {
    try {
      const { data: profile, error } = await getClient()
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return { data: null, error: error.message };
      return { data: profile, error: null };
    } catch {
      return { data: null, error: "Failed to fetch profile" };
    }
  },

  /** Update an existing profile */
  update: async (
    id: string,
    data: ProfileUpdate
  ): Promise<ServiceResponse<Profile>> => {
    try {
      const { data: profile, error } = await getClient()
        .from("profiles")
        .update(data as never)
        .eq("id", id)
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: profile, error: null };
    } catch {
      return { data: null, error: "Failed to update profile" };
    }
  },

  /** Check if a profile exists for the given user ID */
  exists: async (id: string): Promise<ServiceResponse<boolean>> => {
    try {
      const { count, error } = await getClient()
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("id", id);
      if (error) return { data: null, error: error.message };
      return { data: (count ?? 0) > 0, error: null };
    } catch {
      return { data: null, error: "Failed to check profile" };
    }
  },
};
