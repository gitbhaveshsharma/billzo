"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./use-auth";
import { onboardingService } from "@/services/onboarding.service";
import type { OnboardingStatus } from "@/types/onboarding.types";

/**
 * Hook to handle onboarding redirects
 * Checks user's onboarding status and redirects to appropriate page
 */
export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, authUser, isInitialized } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    // Don't check until auth is initialized
    if (!isInitialized) {
      return;
    }

    // If not authenticated, skip check
    if (!isAuthenticated || !authUser) {
      setIsChecking(false);
      return;
    }

    // Skip check for certain routes
    const skipRoutes = [
      "/login",
      "/signup",
      "/verify-otp",
      "/unauthorized",
      "/account-suspended",
    ];

    if (skipRoutes.some((route) => pathname.startsWith(route))) {
      setIsChecking(false);
      return;
    }

    // Check onboarding status
    const checkOnboarding = async () => {
      try {
        setIsChecking(true);
        const { data, error } = await onboardingService.getOnboardingStatus(authUser.id);

        if (error || !data) {
          console.error("Failed to get onboarding status:", error);
          setIsChecking(false);
          return;
        }

        setOnboardingStatus(data);

        // Only redirect if:
        // 1. Onboarding is not complete
        // 2. Current path doesn't match the redirect target
        // 3. Current path is not already an onboarding route
        if (!data.is_onboarding_complete && pathname !== data.redirect_to) {
          const isOnOnboardingRoute = [
            "/create-organization",
            "/create-store",
            "/pending-approval",
          ].some((route) => pathname.startsWith(route));

          // If already on an onboarding route, only redirect if it's the wrong step
          if (!isOnOnboardingRoute) {
            console.log(`Redirecting to ${data.redirect_to} (current: ${pathname})`);
            router.push(data.redirect_to);
          } else if (pathname !== data.redirect_to) {
            // On onboarding route but wrong step
            console.log(`Wrong onboarding step, redirecting to ${data.redirect_to}`);
            router.push(data.redirect_to);
          }
        }
      } catch (err) {
        console.error("Error checking onboarding:", err);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [isAuthenticated, authUser, isInitialized, pathname, router]);

  return {
    isChecking,
    onboardingStatus,
    isOnboardingComplete: onboardingStatus?.is_onboarding_complete ?? false,
  };
}
