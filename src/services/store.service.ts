import { createClient } from "@/lib/supabase/client";
import type { Store } from "@/types/store.types";
import type { CreateStoreInput, UserStoreRole, StoreSettings, StoreSettingsUpdate } from "@/types/store.types";
import type { ServiceResponse } from "@/types/api.types";
import { DEFAULT_STORE_CREATOR_ROLE } from "@/constants/roles";
import { parseStoreSettings } from "@/utils/store.utils";

const getClient = () => createClient();

export const storeService = {
  // ==========================================================================
  // STORE CRUD (do NOT modify create)
  // ==========================================================================

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

  // ==========================================================================
  // STORE SETTINGS CRUD
  // ==========================================================================

  /**
   * Get the full store_settings row for a store.
   * Returns typed StoreSettings with all JSONB columns parsed.
   */
  getSettings: async (
    storeId: string
  ): Promise<ServiceResponse<StoreSettings>> => {
    try {
      const { data, error } = await getClient()
        .from("store_settings")
        .select("*")
        .eq("store_id", storeId)
        .single();

      if (error) {
        // If no row exists, create default settings
        if (error.code === "PGRST116") {
          return storeService.createDefaultSettings(storeId);
        }
        return { data: null, error: error.message };
      }

      return {
        data: parseStoreSettings(data as unknown as Record<string, unknown>),
        error: null,
      };
    } catch {
      return { data: null, error: "Failed to fetch store settings" };
    }
  },

  /**
   * Create a default store_settings row for a store (called automatically
   * when getSettings finds no row).
   */
  createDefaultSettings: async (
    storeId: string
  ): Promise<ServiceResponse<StoreSettings>> => {
    try {
      const { data, error } = await getClient()
        .from("store_settings")
        .insert({ store_id: storeId } as never)
        .select()
        .single();

      if (error) return { data: null, error: error.message };

      return {
        data: parseStoreSettings(data as unknown as Record<string, unknown>),
        error: null,
      };
    } catch {
      return { data: null, error: "Failed to create default store settings" };
    }
  },

  /**
   * Update store settings — accepts partial updates for any section.
   * Merges JSONB columns by spreading existing + new values.
   */
  updateSettings: async (
    storeId: string,
    updates: StoreSettingsUpdate
  ): Promise<ServiceResponse<StoreSettings>> => {
    try {
      // First fetch current settings to merge JSONB columns
      const { data: current, error: fetchError } =
        await storeService.getSettings(storeId);
      if (fetchError || !current) {
        return { data: null, error: fetchError ?? "Settings not found" };
      }

      // Build merged payload
      const payload: Record<string, unknown> = {};

      if (updates.tax_settings) {
        payload.tax_settings = {
          ...current.tax_settings,
          ...updates.tax_settings,
        };
      }
      if (updates.payment_gateway) {
        payload.payment_gateway = {
          razorpay: {
            ...current.payment_gateway.razorpay,
            ...updates.payment_gateway.razorpay,
          },
          paytm: {
            ...current.payment_gateway.paytm,
            ...updates.payment_gateway.paytm,
          },
          phonepe: {
            ...current.payment_gateway.phonepe,
            ...updates.payment_gateway.phonepe,
          },
          stripe: {
            ...current.payment_gateway.stripe,
            ...updates.payment_gateway.stripe,
          },
        };
      }
      if (updates.invoice_settings) {
        payload.invoice_settings = {
          ...current.invoice_settings,
          ...updates.invoice_settings,
        };
      }
      if (updates.printer_settings) {
        payload.printer_settings = {
          ...current.printer_settings,
          ...updates.printer_settings,
        };
      }
      if (updates.business_hours) {
        payload.business_hours = {
          ...current.business_hours,
          ...updates.business_hours,
        };
      }
      if (updates.holidays !== undefined) {
        payload.holidays = updates.holidays;
      }
      if (updates.discount_settings) {
        payload.discount_settings = {
          ...current.discount_settings,
          ...updates.discount_settings,
        };
      }
      if (updates.inventory_settings) {
        payload.inventory_settings = {
          ...current.inventory_settings,
          ...updates.inventory_settings,
        };
      }
      if (updates.sales_settings) {
        payload.sales_settings = {
          ...current.sales_settings,
          ...updates.sales_settings,
        };
      }
      if (updates.pos_settings) {
        payload.pos_settings = {
          ...current.pos_settings,
          ...updates.pos_settings,
        };
      }
      if (updates.notification_settings) {
        payload.notification_settings = {
          ...current.notification_settings,
          ...updates.notification_settings,
        };
      }
      if (updates.backup_settings) {
        payload.backup_settings = {
          ...current.backup_settings,
          ...updates.backup_settings,
        };
      }

      // Scalar fields
      if (updates.currency_code !== undefined)
        payload.currency_code = updates.currency_code;
      if (updates.currency_symbol !== undefined)
        payload.currency_symbol = updates.currency_symbol;
      if (updates.currency_position !== undefined)
        payload.currency_position = updates.currency_position;
      if (updates.thousand_separator !== undefined)
        payload.thousand_separator = updates.thousand_separator;
      if (updates.decimal_separator !== undefined)
        payload.decimal_separator = updates.decimal_separator;
      if (updates.decimal_places !== undefined)
        payload.decimal_places = updates.decimal_places;
      if (updates.gst_calculation_method !== undefined)
        payload.gst_calculation_method = updates.gst_calculation_method;

      const { data, error } = await getClient()
        .from("store_settings")
        .update(payload as never)
        .eq("store_id", storeId)
        .select()
        .single();

      if (error) return { data: null, error: error.message };

      return {
        data: parseStoreSettings(data as unknown as Record<string, unknown>),
        error: null,
      };
    } catch {
      return { data: null, error: "Failed to update store settings" };
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
