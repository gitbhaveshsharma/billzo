"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/loading-spinner";

export default function ManagerDashboardPage() {
    const { isChecking } = useOnboardingRedirect();

    if (isChecking) {
        return <PageLoader text="Loading..." />;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Oversee store operations and team performance</p>
            </div>
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
        </div>
    );
}
