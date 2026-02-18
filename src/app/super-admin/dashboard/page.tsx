"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/loading-spinner";

export default function SuperAdminDashboardPage() {
    const { isChecking } = useOnboardingRedirect();

    if (isChecking) {
        return <PageLoader text="Loading..." />;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">System administration and platform overview</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Platform Stats */}
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Stores</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Active stores</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Users</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Registered users</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Platform Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">Total</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Approvals</h3>
                    <p className="text-3xl font-bold text-yellow-600">0</p>
                    <p className="text-xs text-gray-500 mt-2">Stores to review</p>
                </Card>
            </div>

            {/* System Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Store Management */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Store Management</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            View All Stores
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Pending Approvals
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Manage Suspensions
                        </Button>
                    </div>
                </Card>

                {/* User Management */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">User Management</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            All Users
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Banned Users
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            User Permissions
                        </Button>
                    </div>
                </Card>
            </div>

            {/* System Administration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Organization Management */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Organization Management</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            View Organizations
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Organization Settings
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Role Management
                        </Button>
                    </div>
                </Card>

                {/* System Reports */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">System Reports</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            System Analytics
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Audit Logs
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Performance Metrics
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Platform Configuration */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Platform Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button variant="outline" className="h-10 justify-start">
                        System Settings
                    </Button>
                    <Button variant="outline" className="h-10 justify-start">
                        Feature Flags
                    </Button>
                    <Button variant="outline" className="h-10 justify-start">
                        Email Configuration
                    </Button>
                    <Button variant="outline" className="h-10 justify-start">
                        Payment Settings
                    </Button>
                    <Button variant="outline" className="h-10 justify-start">
                        Notification Rules
                    </Button>
                    <Button variant="outline" className="h-10 justify-start">
                        Backup & Recovery
                    </Button>
                </div>
            </Card>
        </div>
    );
}
