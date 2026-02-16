import { createClient } from "@/lib/supabase/client";
import type { Store } from "@/types/store.types";
import type { CreateStoreInput, UserStoreRole } from "@/types/store.types";
import type { ServiceResponse } from "@/types/api.types";
import { DEFAULT_STORE_CREATOR_ROLE } from "@/constants/roles";

const getClient = () => createClient();

export const storeService = {
  /**
   * Create a store and assign the current user as store_admin.
   * Store is created with status='pending' (enforced by RLS).
   */
  create: async (data: CreateStoreInput): Promise<ServiceResponse<Store>> => {
    try {
      const user = (await getClient().auth.getUser()).data.user;
      if (!user) return { data: null, error: "Not authenticated" };

      const { data: store, error } = await getClient()
        .from("stores")
        .insert({
          ...data,
          status: "pending",
          created_by: user.id,
        } as never)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      if (!store) return { data: null, error: "Store creation failed" };

      // Assign user as store_admin
      const assignError = await assignUserAsAdmin(store.id, user.id);
      if (assignError) return { data: store, error: assignError };

      return { data: store, error: null };
    } catch {
      return { data: null, error: "Failed to create store" };
    }
  },

  /** Get store by ID */
  getById: async (id: string): Promise<ServiceResponse<Store>> => {
    try {
      const { data: store, error } = await getClient()
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return { data: null, error: error.message };
      return { data: store, error: null };
    } catch {
      return { data: null, error: "Failed to fetch store" };
    }
  },

  /** Get stores created by or assigned to the current user */
  getMyStores: async (): Promise<ServiceResponse<Store[]>> => {
    try {
      const user = (await getClient().auth.getUser()).data.user;
      if (!user) return { data: null, error: "Not authenticated" };

      const { data: stores, error } = await getClient()
        .from("stores")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) return { data: null, error: error.message };
      return { data: stores ?? [], error: null };
    } catch {
      return { data: null, error: "Failed to fetch stores" };
    }
  },

  /** Get user's store-role info from the view */
  getUserStoreRole: async (): Promise<ServiceResponse<UserStoreRole | null>> => {
    try {
      const user = (await getClient().auth.getUser()).data.user;
      if (!user) return { data: null, error: "Not authenticated" };

      const { data, error } = await getClient()
        .from("v_user_store_role")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) return { data: null, error: error.message };
      return { data: data ?? null, error: null };
    } catch {
      return { data: null, error: "Failed to fetch store role" };
    }
  },

  /** Check store approval status (for polling) */
  checkStatus: async (
    storeId: string
  ): Promise<ServiceResponse<{ status: string; rejection_reason: string | null }>> => {
    try {
      const { data, error } = await getClient()
        .from("stores")
        .select("status, rejection_reason")
        .eq("id", storeId)
        .single();
      if (error) return { data: null, error: error.message };
      return { data, error: null };
    } catch {
      return { data: null, error: "Failed to check store status" };
    }
  },
};

/**
 * Helper: assign user as store_admin by looking up the role ID first.
 * Returns error string or null on success.
 */
async function assignUserAsAdmin(
  storeId: string,
  userId: string
): Promise<string | null> {
  try {
    const { data: role, error: roleError } = await getClient()
      .from("roles")
      .select("id")
      .eq("name", DEFAULT_STORE_CREATOR_ROLE)
      .single();

    if (roleError || !role) return "Failed to find store_admin role";

    const { error } = await getClient().from("store_users").insert({
      store_id: storeId,
      user_id: userId,
      role_id: role.id,
      is_active: true,
      created_by: userId,
    } as never);

    if (error) return error.message;
    return null;
  } catch {
    return "Failed to assign user to store";
  }
}
