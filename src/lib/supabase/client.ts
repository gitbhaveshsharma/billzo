/**
 * Browser Supabase Client with Cookie Storage
 *
 * CRITICAL: This client stores auth tokens in COOKIES, not localStorage
 * This enables SSR and server components to access auth state
 *
 * Usage:
 * - Import in client components
 * - Import in client-side services
 * - DO NOT use in server components (use server.ts instead)
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// Global singleton instance - only one instance per browser context
let globalClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Get or create the singleton Supabase browser client
 * This ensures only ONE instance exists across the entire application
 */
export function createClient() {
  // Return existing instance if available
  if (globalClient) {
    return globalClient;
  }

  // Create new instance only if it doesn't exist
  globalClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // CRITICAL: flowType must be 'pkce' for cookie-based auth
        flowType: "pkce",

        // Auto-refresh tokens before they expire
        autoRefreshToken: true,

        // Detect session from URL (OAuth callbacks)
        detectSessionInUrl: true,

        // Persist session across browser tabs
        persistSession: true,
      },
      // Cookie storage is handled automatically by createBrowserClient
      // It will store tokens in cookies prefixed with: sb-{project-ref}-auth-token

      // Global fetch options for better performance
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            // Add keepalive for better connection reuse
            keepalive: true,
          });
        },
      },
    }
  );

  // Log instance creation in development
  if (process.env.NODE_ENV === "development") {
    console.log("[SUPABASE CLIENT] Created global singleton instance");
  }

  return globalClient;
}
