"use client";

import { StoreDashboard } from "@/components/dashboard";

// Store Admin root page renders the interactive dashboard directly
export default function StoreAdminPage() {
  return (
    <StoreDashboard
      basePath="/store-admin"
      title="Store Admin Dashboard"
      subtitle="Real-time overview of your store performance"
    />
  );
}