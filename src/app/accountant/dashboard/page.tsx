"use client";

import { useOnboardingRedirect } from "@/hooks/use-onboarding-redirect";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountantDashboardPage() {
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
            requiredRole={["accountant", "manager", "store_admin", "super_admin"]}
            title="Accountant Dashboard"
            description="Manage finances and generate financial reports"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Financial Summary */}
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">This month</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expenses</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">This month</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Net Profit</h3>
                    <p className="text-3xl font-bold text-gray-900">$0.00</p>
                    <p className="text-xs text-gray-500 mt-2">This month</p>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Bills</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">Awaiting payment</p>
                </Card>
            </div>

            {/* Financial Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Transactions */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Transactions</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            View All Transactions
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Record Expense
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Payment Reconciliation
                        </Button>
                    </div>
                </Card>

                {/* Reports */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Financial Reports</h2>
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Income Statement
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Balance Sheet
                        </Button>
                        <Button variant="outline" className="w-full h-10 justify-start">
                            Tax Report
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Invoices & Billing */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Invoices & Billing</h2>
                <div className="space-y-3">
                    <Button variant="outline" className="w-full h-10 justify-start text-left">
                        Manage Invoices
                    </Button>
                    <Button variant="outline" className="w-full h-10 justify-start text-left">
                        Customer Accounts
                    </Button>
                    <Button variant="outline" className="w-full h-10 justify-start text-left">
                        Payment Terms
                    </Button>
                </div>
            </Card>
        </DashboardLayout>
    );
}
