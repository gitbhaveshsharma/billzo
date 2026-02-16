"use client";

import {
    createContext,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { logAuthEvent } from "@/utils/logger";
import type { AuthContextValue } from "@/types/auth.types";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// ============================================================================
// Context
// ============================================================================

export const AuthContext = createContext<AuthContextValue | null>(null);

// Get the browser client (singleton with cookie storage)
const supabase = createClient();

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
    // Get individual methods instead of entire store to prevent unnecessary re-renders
    // ALL hooks must be at the top level
    const setUser = useAuthStore(state => state.setUser);
    const setSession = useAuthStore(state => state.setSession);
    const setAppUser = useAuthStore(state => state.setAppUser);
    const setLoading = useAuthStore(state => state.setLoading);
    const setInitialized = useAuthStore(state => state.setInitialized);
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    const isInitialized = useAuthStore(state => state.isInitialized);
    const appUser = useAuthStore(state => state.appUser);
    const isLoading = useAuthStore(state => state.isLoading);

    const currentTokenRef = useRef<string | null>(null);
    const isProcessingRef = useRef(false);

    // ── Fetch enriched user from the database ────────────────────────────────
    const loadAppUser = useCallback(async () => {
        try {
            const { data } = await authService.getCurrentUser();
            setAppUser(data);
        } catch (error) {
            logAuthEvent("error", "Failed to load app user", { error });
        }
    }, [setAppUser]);

    // ── Refresh session (public API) ─────────────────────────────────────────
    const refreshSession = useCallback(async () => {
        try {
            await supabase.auth.refreshSession();
            logAuthEvent("debug", "Session refreshed manually");
        } catch (error) {
            logAuthEvent("error", "Session refresh failed", { error });
        }
    }, []);

    // ── Logout ───────────────────────────────────────────────────────────────
    const logoutUser = useCallback(async () => {
        try {
            await authService.logout();
            logout();
            console.log("User logged out");
            logAuthEvent("info", "User logged out");
        } catch (error) {
            logAuthEvent("error", "Logout failed", { error });
        }
    }, [logout]);

    // ── Initialize and listen to auth state changes ──────────────────────────
    useEffect(() => {
        let mounted = true;

        // Get initial session
        const initSession = async () => {
            try {
                console.log("🔄 [AuthProvider] Initializing session...");
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                console.log("🔄 [AuthProvider] Session result:", {
                    hasSession: !!session,
                    hasUser: !!session?.user,
                    userId: session?.user?.id,
                });

                if (!mounted) return;

                if (session?.user) {
                    currentTokenRef.current = session.access_token;
                    setUser(session.user);
                    setSession(session);

                    console.log("✅ [AuthProvider] Session restored from cookies");

                    // Load profile in background
                    queueMicrotask(async () => {
                        if (!mounted) return;
                        await loadAppUser();
                    });
                } else {
                    console.log("❌ [AuthProvider] No session found in cookies");
                    setUser(null);
                    setAppUser(null);
                }
            } catch (error) {
                console.error("❌ [AuthProvider] Error in initSession:", error);
                logAuthEvent("error", "Error in initSession", { error });
                if (mounted) {
                    setUser(null);
                    setAppUser(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                    setInitialized(true);
                }
            }
        };

        initSession();

        // Listen to auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                if (!mounted) return;

                logAuthEvent("debug", `Auth event: ${event}`);

                const newToken = session?.access_token || null;

                switch (event) {
                    case "SIGNED_IN":
                        // Skip if same token (prevent duplicate processing)
                        if (newToken === currentTokenRef.current) return;
                        if (isProcessingRef.current) return;

                        if (session?.user) {
                            isProcessingRef.current = true;
                            currentTokenRef.current = newToken;
                            setUser(session.user);
                            setSession(session);

                            // Defer profile loading
                            setTimeout(async () => {
                                if (!mounted) {
                                    isProcessingRef.current = false;
                                    return;
                                }
                                await loadAppUser();
                                isProcessingRef.current = false;
                            }, 0);
                        }
                        break;

                    case "TOKEN_REFRESHED":
                        // Update token only, don't reload profile
                        if (session?.user) {
                            currentTokenRef.current = newToken;
                            setUser(session.user);
                            setSession(session);
                        }
                        break;

                    case "USER_UPDATED":
                        if (session?.user) {
                            currentTokenRef.current = newToken;
                            setUser(session.user);
                            setSession(session);

                            // Defer profile reload
                            setTimeout(async () => {
                                if (!mounted) return;
                                await loadAppUser();
                            }, 0);
                        }
                        break;

                    case "SIGNED_OUT":
                        currentTokenRef.current = null;
                        isProcessingRef.current = false;
                        logout();
                        break;
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadAppUser, setUser, setSession, setAppUser, setLoading, setInitialized, logout]);

    // ── Context value ────────────────────────────────────────────────────────
    const value: AuthContextValue = {
        authUser: user,
        appUser: appUser,
        isInitialized,
        isLoading: isLoading,
        isAuthenticated: !!user,
        refreshSession,
        logout: logoutUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
