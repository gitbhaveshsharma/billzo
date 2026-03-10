"use client";

import { LayoutShell } from "@/components/layout/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import type { PageType } from "@/components/layout/types";

const ROLE_TO_PAGE_TYPE: Record<string, PageType> = {
  super_admin: "super-admin",
  store_admin: "store-admin",
  manager: "manager",
  cashier: "pos",
  accountant: "accountant",
  inventory_manager: "inventory",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appUser } = useAuth();
  const pageType = appUser?.role ? ROLE_TO_PAGE_TYPE[appUser.role] : undefined;

  return (
    <LayoutShell forceConfig={pageType ? { page: pageType } : undefined}>
      {children}
    </LayoutShell>
  );
}
