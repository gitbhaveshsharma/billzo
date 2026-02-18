"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StoreAdminDashboardPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Store Admin Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your store and view analytics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Monthly Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">0% vs last month</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">This month</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Active Staff</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Employees</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Order Value</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">This month</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Store Management</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            View Store Info
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Manage Staff
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Store Settings
                        </Button>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Reports</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Sales Report
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Revenue Analytics
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Staff Performance
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Activity</h2>
                <p className="text-gray-500 text-sm">No recent activity yet.</p>
            </Card>
        </div>
    );
}