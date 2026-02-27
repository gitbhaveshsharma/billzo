"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { PageLoader } from "@/components/shared/loading-spinner";
import { StoreDashboard } from "@/components/dashboard";

export default function ManagerDashboardPage() {
    const { isChecking } = useOnboardingRedirect();

    if (isChecking) {
        return <PageLoader text="Loading..." />;
    }

    return (
        <StoreDashboard
            basePath="/manager"
            title="Manager Dashboard"
            subtitle="Oversee store operations and team performance"
        />
    );
}
