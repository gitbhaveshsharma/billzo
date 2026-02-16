import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, AuthSession, OTPType, AppUser } from "@/types/auth.types";

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  appUser: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // OTP flow state
  otpEmail: string | null;
  otpType: OTPType | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setAppUser: (appUser: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  setOtpFlow: (email: string, type: OTPType) => void;
  clearOtpFlow: () => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      appUser: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      otpEmail: null,
      otpType: null,

      setUser: (user) => set({ user, error: null }),
      setSession: (session) => set({ session }),
      setAppUser: (appUser) => set({ appUser }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      setError: (error) => set({ error, isLoading: false }),
      setOtpFlow: (email, type) => set({ otpEmail: email, otpType: type }),
      clearOtpFlow: () => set({ otpEmail: null, otpType: null }),

      logout: () =>
        set({
          user: null,
          session: null,
          appUser: null,
          error: null,
          otpEmail: null,
          otpType: null,
          isInitialized: true,
        }),

      reset: () =>
        set({
          user: null,
          session: null,
          appUser: null,
          isLoading: false,
          isInitialized: false,
          error: null,
          otpEmail: null,
          otpType: null,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        otpEmail: state.otpEmail,
        otpType: state.otpType,
      }),
    }
  )
);
