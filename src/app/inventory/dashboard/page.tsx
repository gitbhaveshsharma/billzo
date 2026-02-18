"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/loading-spinner";

export default function InventoryDashboardPage() {
    const { isChecking } = useOnboardingRedirect();

    if (isChecking) {
        return <PageLoader text="Loading..." />;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Inventory Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage stock levels and inventory operations</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Inventory Stats */}
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Items</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">In stock</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Low Stock Items</h3>
                    <p className="text-3xl font-bold text-red-600">0</p>
                    <p className="text-xs text-gray-500 mt-2">Need reorder</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Out of Stock</h3>
                    <p className="text-3xl font-bold text-orange-600">0</p>
                    <p className="text-xs text-gray-500 mt-2">Items</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Inventory Value</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">Total</p>
                </Card>
            </div>

            {/* Inventory Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Stock Management */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Stock Management</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            View Inventory
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Low Stock Alert
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Record Stock In
                        </Button>
                    </div>
                </Card>

                {/* Orders & Requests */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Purchase Orders</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            New Purchase Order
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Active POs
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Receiving
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Inventory Adjustments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reports */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Inventory Reports</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Stock Transfer Report
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Inventory Valuation
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Shrinkage Analysis
                        </Button>
                    </div>
                </Card>

                {/* Adjustments & Audits */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Audits & Adjustments</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Physical Count
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Stock Adjustment
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Damage Report
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
