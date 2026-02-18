"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./use-auth";
import { onboardingService } from "@/services/onboarding.service";
import { ROUTE_PROTECTION } from "@/config/middleware.config";
import { MIDDLEWARE_CONFIG } from "@/config/middleware.config";
import type { OnboardingStatus } from "@/types/onboarding.types";

// ============================================================================
// Client-side onboarding redirect hook
//
// Acts as a safety net on top of the middleware. The middleware handles the
// primary redirect logic; this hook covers edge-cases like client-side
// navigations that skip middleware (e.g., router.push inside an SPA).
// ============================================================================

/** Check if `pathname` starts with any prefix in `list` */
function matchesAny(pathname: string, list: readonly string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, authUser, isInitialized } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    // Wait for auth to initialize
    if (!isInitialized) return;

    // Unauthenticated → nothing to check
    if (!isAuthenticated || !authUser) {
      setIsChecking(false);
      return;
    }

    // Config-driven skip list (login, signup, otp, unauthorized, etc.)
    if (matchesAny(pathname, ROUTE_PROTECTION.skipOnboardingCheck)) {
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        setIsChecking(true);
        const { data, error } = await onboardingService.getOnboardingStatus(authUser.id);

        if (cancelled) return;
        if (error || !data) {
          console.error("[onboarding-hook] status fetch failed", error);
          setIsChecking(false);
          return;
        }

        setOnboardingStatus(data);

        const { redirects } = MIDDLEWARE_CONFIG;
        const isOnOnboardingRoute = matchesAny(pathname, ROUTE_PROTECTION.onboarding);

        // ── 1. Completed users must NOT stay on onboarding pages ─────────
        if (data.is_onboarding_complete && isOnOnboardingRoute) {
          const target = data.redirect_to || redirects.afterAuth;
          router.replace(target);
          return;
        }

        // ── 2. Generic /dashboard → role-specific dashboard ─────────────
        if (
          data.is_onboarding_complete &&
          pathname === "/dashboard" &&
          data.redirect_to &&
          data.redirect_to !== "/dashboard"
        ) {
          router.replace(data.redirect_to);
          return;
        }

        // ── 3. Store pending → /pending-approval ────────────────────────
        if (data.store_status === "pending" && pathname !== redirects.pendingStore) {
          router.replace(redirects.pendingStore);
          return;
        }

        // ── 4. Incomplete onboarding → correct step ─────────────────────
        if (!data.is_onboarding_complete && pathname !== data.redirect_to) {
          router.replace(data.redirect_to);
          return;
        }
      } catch (err) {
        console.error("[onboarding-hook] error", err);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authUser, isInitialized, pathname, router]);

  return {
    isChecking,
    onboardingStatus,
    isOnboardingComplete: onboardingStatus?.is_onboarding_complete ?? false,
  };
}
