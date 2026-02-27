"use client";

import { StoreDashboard } from "@/components/dashboard";

export default function StoreAdminDashboardPage() {
  return (
    <StoreDashboard
      basePath="/store-admin"
      title="Store Admin Dashboard"
      subtitle="Real-time overview of your store performance"
    />
  );
}