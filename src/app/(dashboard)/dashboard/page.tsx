"use client";

export default function DashboardPage() {
    // Onboarding check is handled by layout, no need to check again here
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid gap-6">
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
                    <p className="text-muted-foreground">
                        Your onboarding is complete. You can now access the dashboard.
                    </p>
                </div>

                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-lg bg-primary/10">
                            <p className="text-2xl font-bold">0</p>
                            <p className="text-sm text-muted-foreground">Total Sales</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-primary/10">
                            <p className="text-2xl font-bold">0</p>
                            <p className="text-sm text-muted-foreground">Products</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-primary/10">
                            <p className="text-2xl font-bold">0</p>
                            <p className="text-sm text-muted-foreground">Orders</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
