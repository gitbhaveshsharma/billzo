import { createClient } from "@/lib/supabase/client";
import type { ServiceResponse } from "@/types/api.types";
import type { Database } from "@/types/database.types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];

const getClient = () => createClient();

export const sessionService = {
  /** Get active sessions for the current user */
  getActiveSessions: async (): Promise<ServiceResponse<Session[]>> => {
    try {
      const user = (await getClient().auth.getUser()).data.user;
      if (!user) return { data: null, error: "Not authenticated" };

      const { data, error } = await getClient()
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("last_activity", { ascending: false });

      if (error) return { data: null, error: error.message };
      return { data: data ?? [], error: null };
    } catch {
      return { data: null, error: "Failed to fetch sessions" };
    }
  },

  /** Terminate a specific session */
  terminate: async (sessionId: string): Promise<ServiceResponse<null>> => {
    try {
      const { error } = await getClient()
        .from("sessions")
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
          termination_reason: "User terminated",
        } as never)
        .eq("id", sessionId);

      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch {
      return { data: null, error: "Failed to terminate session" };
    }
  },

  /** Terminate all sessions except current */
  terminateOthers: async (
    currentSessionId: string
  ): Promise<ServiceResponse<null>> => {
    try {
      const user = (await getClient().auth.getUser()).data.user;
      if (!user) return { data: null, error: "Not authenticated" };

      const { error } = await getClient()
        .from("sessions")
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
          termination_reason: "User terminated all other sessions",
        } as never)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .neq("id", currentSessionId);

      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch {
      return { data: null, error: "Failed to terminate sessions" };
    }
  },
};
