"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ManagerDashboardPage() {
    const { isChecking } = useOnboardingRedirect();

    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            requiredRole={["manager", "store_admin", "super_admin"]}
            title="Manager Dashboard"
            description="Oversee store operations and team performance"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Quick Stats */}
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Today Sales</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">0% vs yesterday</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Staff Present</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Today</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Tasks</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">To review</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Inventory Status</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Low stock items</p>
                </Card>
            </div>

            {/* Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Team Management */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Team Management</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            View Staff
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Assign Shifts
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Performance Reviews
                        </Button>
                    </div>
                </Card>

                {/* Store Operations */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Store Operations</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Daily Operations
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Inventory Levels
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Quality Control
                        </Button>
                    </div>
                </Card>
            </div>

            {/* My Tasks */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">My Tasks & Approvals</h2>
                <p className="text-gray-500 text-sm">No pending tasks at the moment.</p>
            </Card>
        </DashboardLayout>
    );
}
