"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function POSPage() {
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Quick Stats */}
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Today Sales</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">No transactions yet</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Transactions</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Today</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Customers</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Today</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Refunds</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">Today</p>
                </Card>
            </div>

            {/* Main Actions */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-12">
                        New Sale
                    </Button>
                    <Button variant="outline" className="h-12">
                        View Orders
                    </Button>
                    <Button variant="outline" className="h-12">
                        Process Refund
                    </Button>
                    <Button variant="outline" className="h-12">
                        Daily Report
                    </Button>
                </div>
            </Card>
        </div>
    );
}