import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type { Database } from "@/types/database.types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

const getClient = () => createClient();

export const auditLogService = {
  /** Log a manual audit entry (most audit logs are trigger-based) */
  create: async (
    data: Database["public"]["Tables"]["audit_logs"]["Insert"]
  ): Promise<ServiceResponse<null>> => {
    try {
      const { error } = await getClient().from("audit_logs").insert(data as never);
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch {
      return { data: null, error: "Failed to create audit log" };
    }
  },

  /** Query audit logs for a store (admin only via RLS) */
  getByStore: async (
    storeId: string,
    limit = 50
  ): Promise<ServiceResponse<AuditLog[]>> => {
    try {
      const { data, error } = await getClient()
        .from("audit_logs")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return { data: null, error: error.message };
      return { data: data ?? [], error: null };
    } catch {
      return { data: null, error: "Failed to fetch audit logs" };
    }
  },

  /** Query audit logs by user */
  getByUser: async (
    userId: string,
    limit = 50
  ): Promise<ServiceResponse<AuditLog[]>> => {
    try {
      const { data, error } = await getClient()
        .from("audit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return { data: null, error: error.message };
      return { data: data ?? [], error: null };
    } catch {
      return { data: null, error: "Failed to fetch audit logs" };
    }
  },
};
